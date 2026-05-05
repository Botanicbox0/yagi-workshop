Phase 7 Wave A — K-05 (Tier 2 MED, integration review).

A.1 schema migration was already reviewed in 3 K-05 LOOPs (LOOP-3 CLEAN, applied to prod). This is the **wave-level barrier review** focused on A.2 + A.3 + A.4 integration with the A.1 schema.

## Files in scope (A.2/A.3/A.4 only — A.1 deferred)

### A.2 admin tool
- `src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts` — 4 server actions (createCampaign / updateCampaign / publishCampaign / addCategory)
- `src/app/[locale]/app/admin/campaigns/page.tsx` — list with status filter
- `src/app/[locale]/app/admin/campaigns/new/page.tsx` — create form
- `src/app/[locale]/app/admin/campaigns/[id]/page.tsx` — detail (server)
- `src/app/[locale]/app/admin/campaigns/[id]/_components/campaign-edit-client.tsx` — edit (client)

### A.3 public landing
- `src/lib/campaigns/queries.ts` — RLS-scoped queries
- `src/app/campaigns/layout.tsx` — locale-free public chrome
- `src/app/campaigns/page.tsx` — list
- `src/app/campaigns/[slug]/page.tsx` — detail + showcase gallery

### A.4 middleware
- `src/middleware.ts` — added 'campaigns' to negative lookahead

### i18n
- `messages/{ko,en}.json` — admin_campaigns + public_campaigns namespaces

## L-049 4-perspective audit (focused — A.1 already covered all RLS)

Walk auth/RLS interaction in app code:

1. **yagi_admin path (A.2)**:
   (a) Page-level notFound() gate — verify it actually checks user_roles for yagi_admin.
   (b) Server actions: each must `is_yagi_admin(auth.uid())` check before any write. Are ALL 4 actions gated? createCampaign / updateCampaign / publishCampaign / addCategory.
   (c) Service-role usage: A.2 reportedly uses service-role to bypass column-level RLS on `campaigns.status` for createCampaign (status forced to 'draft' but the GRANT lockdown means authenticated cannot write status — admin must use service-role). Confirm:
       - service-role client correctly created via `createSupabaseService()`
       - is_yagi_admin check happens BEFORE service-role write
       - if any action writes status without admin gate, that's a HIGH-A finding

2. **sponsor path (A.3 — public read only)**:
   (a) /campaigns list: SELECT campaigns. Confirm RLS auto-filters to public statuses (no explicit status filter in query needed — RLS handles it). If query also filters explicitly, that's defense-in-depth ✓.
   (b) /campaigns/[slug]: SELECT by slug. RLS auto-denies non-published. Confirm.
   (c) Distributed showcase gallery query — getCampaignDistributions. Walk the JOIN chain: campaign_distributions → campaign_submissions (status='distributed' only). RLS enforces this. Confirm the query doesn't bypass RLS via service-role.

3. **applicant path (A.3 surface only — full applicant flow in C)**:
   (a) /campaigns/[slug] CTA "응모하기" stub — confirms it's a stub (link to /campaigns/[slug]/submit which is C.1 scope), NOT a working form. Acceptable.

4. **public (anon) path (A.3)**:
   (a) Locale-free routing means anon users hit /campaigns directly. RLS for anon is the same as authenticated for SELECT public policies. Confirm queries use the standard supabase-js client (not service-role) so RLS applies.

## Adversarial focus areas (Tier 2 MED)

1. **A.2 service-role authorization gap**: The 4 server actions write to campaigns. createCampaign forces status='draft', sponsor_workspace_id=NULL (admin self-host), created_by=auth.uid(). publishCampaign transitions to 'published'. The column-grant lockdown means authenticated cannot UPDATE status — service-role bypasses. The ONLY barrier between caller and service-role is `is_yagi_admin`. Walk:
   (a) auth.getUser() → null user → unauthenticated rejection
   (b) is_yagi_admin RPC → false → forbidden rejection
   (c) Otherwise: service-role write proceeds
   Are these gates uniform across all 4 actions?

2. **A.3 RLS reliance**:
   - The list query depends on RLS to filter to public statuses. If RLS is misconfigured (e.g., status='draft' campaigns leak to public), that's a A.1 issue — already covered. But A.3's queries should NOT use service-role; flag if they do.
   - getCampaignDistributions JOIN chain: confirm SELECT goes through standard supabase client.

3. **A.2 input validation**:
   - createCampaign / updateCampaign — Zod schemas? title length? slug uniqueness handled (A.1 has UNIQUE constraint, but client-friendly conflict handling)?
   - reference_assets array — JSONB; validate it's an array of {url, label}? URL format check?
   - compensation_metadata — admin can provide arbitrary JSONB; defense-in-depth check that it's an object?

4. **A.4 middleware regex correctness**:
   - The negative lookahead `(?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|campaigns|.*\\..*)` — does it correctly exclude /campaigns AND /campaigns/[slug]? Test the regex mentally on /campaigns vs /ko/campaigns.
   - Order in the list — does 'campaigns' appearing before or after 'showcase' matter? Should be order-independent.

5. **i18n wording cross-check (binding)**:
   - admin_campaigns + public_campaigns KO values: walk every value, flag any English internal term ("Sponsor"/"Submission"/"Track"/"Roster"/"Distribution"/"RFP"/"Bypass"/"Routing"/"Type N").
   - The reports claim 0 leakage but verify spot-check.
   - Channel brand names (TikTok/Instagram/YouTube/X) are exempt per yagi-wording-rules (proper nouns of platforms).

## Already-deferred (do NOT flag)

- Compensation 정산 logic (Phase 11)
- Roster funnel UI (Phase 8)
- Challenge MVP (Phase 9)
- Distribution metric API auto-fetch (Phase 8)
- A.1 schema findings (LOOP-3 CLEAN, in prod)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave A integrated state ready for Wave B dispatch."

End with one-line summary.
