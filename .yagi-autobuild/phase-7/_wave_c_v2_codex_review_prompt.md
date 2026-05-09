Phase 7 Wave C v2 — K-05 LOOP-1 (single-shot, all 6 HIGH + 9 MED inline fixes baked in from start).

This is the LOOP-1 review of the COMPLETE Wave C v2 re-author. Per SPEC §1, the prior Wave A/A.HF4/B/C source was reverted; main returned to a clean state at `cf6f131`. Wave C v2 LOOP-0 single-shot authored everything from scratch with all K-05/K-06 LOOP-1 (Wave C v1) findings baked in. **No LOOP cycle policy** (kickoff §STEP 8): if HIGH-tier finding present, HALT for yagi escalation — no auto-fix retry.

Branch: `g-b-10-phase-7` at `56195fc`, 8 commits ahead of `origin/main`.

Commits in scope:
- `c494a7e` STEP 1: Fraunces removal
- `c4e694e` STEP 2: migration (RPC + multi-channel RLS + content_mime)
- `0e42413` STEP 3: backend infra (Upstash + Turnstile + HMAC token + RPC)
- `8dc6d7b` STEP 4: sidebar IA + MED-5
- `1185bb8` STEP 5: submit page+form + my-submissions list (HIGH-4/5 + MED-4/7/8)
- `4eaa96b` STEP 6: distribution panel + work preview (HIGH-3 + MED-6/9)
- `2b43277` STEP 7: R2 lifecycle docs
- `56195fc` STEP 7 update: FU-R1 R2 lifecycle deferred to Phase 8

## Pass criteria (binding per SPEC §8.4 + kickoff §STEP 8.3)

- 6 HIGH ALL closed (no HIGH finding present)
- 4 K-05 MED closed (#3 MED-1, #4 MED-2, #5 MED-3, #7 MED-4)
- K-05 #6 (MED-B applicant_user_id) → must be FU-W2, do NOT flag as new
- FU-R1 (R2 lifecycle deferred to Phase 8 per yagi 2026-05-09) → do NOT flag as new

## Files in scope

### Migration (HIGH boundary — applied to prod via Dashboard SQL editor 2026-05-06)
- `supabase/migrations/20260506000000_phase_7_campaigns.sql` — base schema (5 tables + RLS + column-level GRANT lockdown)
- `supabase/migrations/20260506200000_phase_7_workspaces_kind_creator.sql` — workspaces.kind 'creator' + 'agency'
- `supabase/migrations/20260507000000_phase_7_wave_c_v2.sql` — find_user_by_email RPC + multi-channel RLS + content_mime column

### Backend (HIGH-1 + HIGH-2 + MED-1 + MED-3)
- `src/lib/ratelimit.ts` — Upstash Ratelimit primitives, 4 buckets (submit IP/email/campaign-IP, presign IP)
- `src/lib/upload-token.ts` — HMAC-SHA-256 sign/verify, 15min TTL, payload {campaign_id, nonce, ip_hash, iat, exp}
- `src/app/campaigns/[slug]/submit/_actions/presign-submission-upload.ts` — issues HMAC token, server-controlled key prefix tmp/campaigns/<id>/<nonce>/, rate-limit + window check + 200MB ceiling
- `src/app/campaigns/[slug]/submit/_actions/submit-application-action.ts` — full submit pipeline: rate-limit + Turnstile siteverify + token verify + key shape regex + R2 HEAD-check + content_mime persistence + find_user_by_email RPC + magic-link send

### Frontend Wave A (sidebar IA + MED-5)
- `src/components/app/sidebar-nav.tsx` — kinds gating, operations group (NEW), my_submissions (NEW), kind-aware visibility, [+ 새 프로젝트 시작] standalone CTA with sage fill resting state
- `src/components/app/sidebar.tsx` — threads activeWorkspace?.kind to SidebarNav
- `src/components/sidebar/workspace-switcher.tsx` — WorkspaceKind extended
- `src/lib/workspace/active.ts` — WorkspaceKind extended (creator + agency)

### Frontend Wave B (HIGH-4 + HIGH-5 + MED-4/7/8)
- `src/app/campaigns/[slug]/submit/page.tsx` — 4 guards (notFound / closed / HIGH-5 no_path / no categories); Pretendard 600 unified heading
- `src/app/campaigns/[slug]/submit/submit-form.tsx` — Turnstile widget (next/script + explicit render via useEffect, reset on rejected); presigned upload via XHR with progress; success view with magic_link_sent fallback (MED-4); MED-8 hr-flank "or" separator
- `src/app/[locale]/app/my-submissions/page.tsx` — list view, status pill helper
- `src/lib/ui/status-pill.ts` — added 'campaign_submission' kind + sage_full / sage_soft tones (sage swap correct: approved=full, distributed=soft per MED-7)
- `src/lib/ui/status-labels.ts` — added 'campaign_submission' label registry
- `src/lib/campaigns/queries.ts` — getCampaignBySlug + getCampaignCategories (PUBLIC_STATUSES gate)

### Frontend Wave C (HIGH-3 + MED-6 + MED-9)
- `src/app/[locale]/app/my-submissions/[id]/work-preview.tsx` — MIME-aware: image/* → <img>, video/* → <video>, YT/Vimeo embed → iframe 16:9, generic URL → hostname chip + ExternalLink
- `src/app/[locale]/app/my-submissions/[id]/distribution-panel.tsx` — MED-6 sage CTA escalation when status='approved_for_distribution' && empty; MED-9 Pencil ghost button for metric edit
- `src/app/[locale]/app/my-submissions/[id]/page.tsx` — wires WorkPreview + DistributionPanel; service-role read of campaign_review_decisions for applicant
- `src/app/[locale]/app/my-submissions/_actions/distribution-actions.ts` — addDistributionAction (session client INSERT, RLS WITH CHECK enforces multi-channel; auto-transition approved_for_distribution → distributed via ABA-safe CAS) + logDistributionMetricsAction

### i18n (KO + EN)
- `messages/{ko,en}.json` — nav.* (groups + new entries) + my_submissions.* + public_campaigns.submit.*

## L-049 4-perspective audit (MANDATORY, verbatim binding)

Walk USING + WITH CHECK from each role separately for the new write paths:

  W1. campaigns INSERT — service-role only from submit-application-action; campaign_categories SELECT same
  W2. campaign_submissions INSERT — service-role only
  W3. campaign_submissions UPDATE (approved_for_distribution → distributed) — session client from addDistributionAction
  W4. campaign_distributions INSERT — session client (RLS WITH CHECK enforces added_by + workspace_member + status IN approved/distributed)
  W5. campaign_distributions UPDATE (metric columns) — session client
  W6. workspaces INSERT (kind='creator') — service-role only
  W7. workspace_members INSERT — service-role only
  W8. auth.admin.inviteUserByEmail / generateLink — service-role only
  W9. find_user_by_email RPC — service_role grant only (CHECK: REVOKE from public/anon/authenticated)

Walk:
  1. As `client` (auth.uid() = applicant, member of creator workspace, status='approved_for_distribution' submission they own):
     W3 column-level GRANT permits status / title / description / content_r2_key / external_url / thumbnail_r2_key / duration_seconds / distributed_at / updated_at. campaign_submissions_update_applicant USING + WITH CHECK enforces applicant_workspace_id member + status IN (withdrawn, distributed). BEFORE UPDATE TRIGGER campaign_submissions_guard_status_transition enforces source state for applicant. Walk all column writes the action does ({ status: 'distributed', distributed_at }): both granted, WITH CHECK passes, trigger source-state matches. ✓
     W4 column GRANT permits submission_id / channel / url / posted_at / added_by / notes. NEW Wave C v2 RLS WITH CHECK requires added_by=auth.uid() AND workspace_member of applicant_workspace_id of parent submission AND parent submission.status IN ('approved_for_distribution', 'distributed'). MED-2 fix: 'distributed' added so multi-channel works. ✓
     W5 column GRANT permits view/like/comment/metric_*. ✓

  2. As `ws_admin` (workspace_admin role for some other workspace) — no special privilege beyond authenticated. ✓

  3. As `yagi_admin` — every wave write path uses service-role. submit-application-action does NOT check is_yagi_admin (intentional public action). ✓

  4. As `different-user same-workspace` (e.g., User B is member of the same creator workspace as User A who originally submitted) — W3/W4/W5 RLS USING checks workspace member, not original submitter. So User B could potentially mutate User A's submission. **This is FU-W2 (not a new finding); creator workspaces auto-created with one member only at submit time, multi-member case is structurally not produced by Wave C v2 code path. Do not re-flag.**

## Adversarial focus areas (Tier 1 HIGH)

1. **HIGH-1 verification — rate-limit + Turnstile**:
   - `src/lib/ratelimit.ts` Upstash buckets: submitByIp (5/h), submitByEmail (3/h), submitByCampaignIp (3/h), presignByIp (10/h). Lazy init; fails-open in dev (no Upstash env) but logs warning. **Confirm**: production env has UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN per yagi 2026-05-08 setup confirmation.
   - `src/lib/ratelimit.ts:resolveIp()` extracts via x-forwarded-for first hop / x-real-ip / fallback "0.0.0.0". The fallback IP "0.0.0.0" creates a single rate-limit bucket for ALL traffic with no header — could a scenario with stripped headers bypass per-IP throttling? Walk Vercel infrastructure path; if x-forwarded-for is always set on prod, low-risk.
   - Turnstile siteverify: fail-closed when TURNSTILE_SECRET_KEY missing (good). Passes ip as remoteip param. Confirm Cloudflare Turnstile siteverify endpoint URL is correct (challenges.cloudflare.com/turnstile/v0/siteverify).
   - submit-form.tsx Turnstile widget: explicit render via useEffect polling; reset on rejected attempt. ButtonDisabled until token present. Walk: any race where the form can submit with stale token (e.g., expired between widget render and submit click)?

2. **HIGH-2 verification — R2 key binding via upload token**:
   - `src/lib/upload-token.ts:issueUploadToken()` signs `{campaign_id, nonce, ip_hash, iat, exp}` with HMAC-SHA-256, 15min TTL. Constant-time signature compare via timingSafeEqual. ip_hash = sha256(ip).
   - `src/lib/upload-token.ts:verifyUploadToken()` decodes payload AFTER signature passes (avoids parse-error oracle). Returns specific error reasons (malformed/bad_signature/expired/ip_mismatch/campaign_mismatch).
   - `src/lib/upload-token.ts:validateObjectKey()` regex: `^tmp/campaigns/<campaign_id_escape>/<nonce_escape>/[\w.\-]+$`. Filename character class [\w.\-]+ (no spaces, no path traversal).
   - `submit-application-action.ts` R2 path: token verify → key shape regex → HEAD-check (existence + Length ≤ 200MB + ContentType in image/* | video/*). Mime captured + persisted to content_mime.
   - **Walk attack vectors**: cross-campaign key (token campaign_id A, key campaign_id B) → key_mismatch ✓; expired token → expired ✓; IP changed (e.g., mobile network swap) → ip_mismatch ✓; bypass attempt with hand-crafted JWT-shaped token → bad_signature ✓; HEAD-check 404 → object_not_found ✓; HEAD-check returns ContentType=text/html (HTML upload bypass) → bad_mime ✓.
   - **One concern**: ip_hash is sha256 with no salt. If IP enumeration were a concern, salt would help. But submit IP is logged anyway via x-forwarded-for; this binding is for token replay protection, not privacy. Acceptable.

3. **HIGH-3 verification — content_mime persistence + WorkPreview**:
   - Migration adds `campaign_submissions.content_mime text` (nullable). Application-layer whitelist (image/* | video/*) enforced at HEAD-check.
   - WorkPreview branches on `mime.startsWith('image/' | 'video/')`. Unknown MIME falls to FilenameCard with link. External URL with no embed → HostnameChip. Empty → muted dashed placeholder.
   - **Walk**: external URL embed detection regex (YouTube /watch?v= / /youtu.be/ / /shorts/; Vimeo /vimeo.com/<id>/) — could a malicious URL match the regex but resolve to a different domain? E.g., `https://evil.com/watch?v=xxxxxxxxxxx` would match the YouTube regex and produce iframe `https://www.youtube.com/embed/xxxxxxxxxxx`. The applicant sees their iframe. Acceptable since they entered it.

4. **HIGH-4 verification — Pretendard 600 unified**:
   - submit/page.tsx + my-submissions/page.tsx + my-submissions/[id]/page.tsx + submit-form.tsx success view all use `font-semibold tracking-display-ko text-2xl md:text-3xl` (or text-3xl for hero). Confirm consistency across all 4 sites.

5. **HIGH-5 verification — submit page no_path guard**:
   - submit/page.tsx 4 guards in order: notFound → closed → no_path → no_categories. Each returns ClosedCard with appropriate i18n keys. Form NOT rendered when any guard hits.

6. **HIGH-6 verification — Fraunces audit**:
   - tailwind.config.ts `display` token: `["Pretendard Variable", "ui-sans-serif", "system-ui"]` — no Fraunces ✓
   - globals.css: `.font-display` rule deleted ✓
   - fonts.ts: Fraunces import deleted ✓
   - 5 layout files + 2 not-found pages: fraunces.variable className stripped ✓
   - ~57 product UI callsites: font-display → font-semibold tracking-display-ko ✓
   - Cat B (~25 hits) + Cat C (~8 hits) deferred per FU-EI1 (acceptable per yagi 2026-05-06 scope정정).

7. **MED verification (sample walk)**:
   - MED-1: find_user_by_email RPC called via supabase.rpc("find_user_by_email", {p_email: email}) in submit-application-action; returns uuid string or null.
   - MED-2: campaign_distributions_insert_applicant policy includes status IN ('approved_for_distribution', 'distributed') — verified in migration 20260507000000.
   - MED-3: presign action rate-limit + window check + 200MB. R2 lifecycle deferred to FU-R1 per yagi 2026-05-09 (do NOT flag as new finding).
   - MED-4: submit-form success view branches on magic_link_sent; sage card + sign-in fallback CTA when failed.
   - MED-5: sidebar [+ 새 프로젝트 시작] CTA bg-sage resting state.
   - MED-6: DistributionPanel CTA bg-sage when isPrimaryEmpty.
   - MED-7: status-pill helper extracts to centralized lib; sage swap correct (approved=full, distributed=soft).
   - MED-8: hr-flank "or" separator in submit-form.
   - MED-9: Pencil ghost button for metric edit.

## Already-deferred (do NOT flag)

- FU-W2 (K-05 LOOP-1 #6) — applicant_user_id column + W3/W4/W5 RLS hardening
- FU-D1/D2/D3 (K-06 LOW polish)
- FU-W3/W4/W5 (informational PASS / wording)
- FU-EI1 (Cat B + Cat C editorial visual identity)
- FU-R1 (R2 published/* migration + tmp/* lifecycle rule, Phase 8)

## Output format

## VERDICT: <CLEAN | NEEDS-MINOR | NEEDS-FIXES (HIGH) | NEEDS-MAJOR>

For each NEW finding (HIGH only — MED/LOW only if NEW relative to inline fix scope):
[FINDING N] CLASS: <HIGH-A|HIGH-B|HIGH-C|MED-A|MED-B|MED-C>: file:line — short description — recommended fix

Reference HIGH-N / MED-N closure status (1-line each):
- HIGH-1 (rate-limit + Turnstile): <CLOSED | NEEDS-ATTENTION>
- HIGH-2 (R2 key binding): <CLOSED | NEEDS-ATTENTION>
- HIGH-3 (work preview + content_mime): <CLOSED | NEEDS-ATTENTION>
- HIGH-4 (Pretendard 600 unified): <CLOSED | NEEDS-ATTENTION>
- HIGH-5 (no_path guard): <CLOSED | NEEDS-ATTENTION>
- HIGH-6 (Fraunces audit): <CLOSED | NEEDS-ATTENTION>
- MED-1 (find_user_by_email RPC): <CLOSED | NEEDS-ATTENTION>
- MED-2 (multi-channel RLS): <CLOSED | NEEDS-ATTENTION>
- MED-3 (presign rate-limit + window + 200MB; lifecycle FU-R1): <CLOSED w/ FU | NEEDS-ATTENTION>
- MED-4 (magic_link_sent fallback): <CLOSED | NEEDS-ATTENTION>

If 0 NEW HIGH findings + all 6 HIGH closed + 4 K-05 MED closed:
"VERDICT: CLEAN — Wave C v2 LOOP-1 PASS, ready for K-06 + smoke + ship."

End with one-line summary.
