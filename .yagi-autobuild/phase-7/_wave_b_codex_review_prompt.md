Phase 7 Wave B — K-05 (Tier 1 HIGH, sponsor request entry + admin approval workflow).

Wave B introduces the first authenticated-write path on the `campaigns` table from a non-admin role (sponsor INSERT via session client, RLS-bound). It also adds 4 admin status-transition actions that route through service-role, and a notification fan-out path. Adversarial focus = exploitability of the new sponsor INSERT path + correctness of the 4-action state machine.

Single commit on g-b-10-phase-7: `c820056` (13 files, +1875/-53).

## Files in scope

### B.1 — Sponsor request entry (HIGH)
- `src/app/[locale]/app/campaigns/_actions/request-campaign-action.ts` — NEW. requestCampaignAction (session client INSERT into campaigns, RLS WITH CHECK + column-level GRANT enforce row+column lockdown).
- `src/app/[locale]/app/campaigns/request/page.tsx` — NEW. Resolves active workspace, kind-eligibility guard (brand/artist), fetches own past requests via campaigns_select_sponsor RLS.
- `src/app/[locale]/app/campaigns/request/request-form.tsx` — NEW client form.
- `src/app/[locale]/app/campaigns/request/own-requests-list.tsx` — NEW server component listing own past requests + decision_metadata note preview.
- `src/components/app/sidebar.tsx` — threads activeWorkspace.kind to SidebarNav.
- `src/components/app/sidebar-nav.tsx` — adds [+ 캠페인 요청] CTA visible when activeWorkspaceKind IN ('brand','artist').

### B.2 — Admin queue + approval (HIGH)
- `src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts` — adds reviewCampaignRequestAction / approveCampaignRequestAction / declineCampaignRequestAction / requestMoreInfoAction. All service-role, all admin-gated, all append decision_metadata.history audit entry, all emit sponsor notification.
- `src/app/[locale]/app/admin/campaigns/page.tsx` — adds requested/in_review/declined to STATUS_VALUES + sponsor column with workspace name + contact phone preview.
- `src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx` — NEW. Server component renders request payload + decision history.
- `src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx` — NEW client component, dispatches one of 4 admin actions per current status.

### B.shared — Notifications + i18n
- `src/lib/notifications/kinds.ts` — adds 5 NotificationKind: campaign_request_received, campaign_request_in_review, campaign_request_approved, campaign_request_declined, campaign_request_more_info.
- `messages/{ko,en}.json` — adds campaign_request namespace + admin_campaigns.review subtree + 5 notification event templates + nav.request_campaign_cta + admin_campaigns.status_{requested,in_review,declined}.

## L-049 4-perspective audit (MANDATORY, verbatim binding)

Walk USING + WITH CHECK from each role separately for `requestCampaignAction` (the only new sponsor-side INSERT path):

  1. As `client` (auth.uid() = self, no admin role, member of a brand/artist workspace) — owner-only path. Confirm WITH CHECK on `campaigns_insert_sponsor` enforces:
     - status = 'requested'
     - created_by = auth.uid() (no forging another user's authorship)
     - sponsor_workspace_id IS NOT NULL
     - has_external_sponsor = false (sponsor must not seed admin-write column)
     - external_sponsor_name IS NULL
     - decision_metadata IS NULL
     - submission_open_at / close_at / distribution_starts_at all NULL
     - workspace_member of sponsor_workspace_id AND workspace.kind IN ('brand','artist')
     Confirm column-level INSERT GRANT (REVOKE INSERT FROM authenticated; GRANT INSERT (slug, title, description, brief, reference_assets, sponsor_workspace_id, status, request_metadata, created_by, updated_at) TO authenticated) blocks any other column. Walk every column the action passes to .insert(): {slug, title, brief, reference_assets, sponsor_workspace_id, status:'requested', request_metadata, created_by, updated_at}. Confirm zero overlap with REVOKE'd columns.

  2. As `ws_admin` (workspace_admin role for the sponsor_workspace) — same path, no special privilege expected. RLS does not distinguish ws_admin from member here. Confirm.

  3. As `yagi_admin` (cross-workspace admin) — would also satisfy `campaigns_insert_admin` policy. Action layer always uses session client (not service-role) so admin can also call this path. Acceptable? Or should admin be excluded since they have /admin/campaigns/new? Flag if ambiguous.

  4. As `different-user same-workspace` (e.g., another workspace_member, different auth.uid()) — confirm `created_by = auth.uid()` WITH CHECK denies forging the original requester's row. Confirm RLS auto-filters out rows whose `sponsor_workspace_id` they're not a member of in the SELECT path used by `/app/campaigns/request` own-requests list (campaigns_select_sponsor membership check).

For each WAVE B status-transition action (4 actions, all service-role):
- reviewCampaignRequestAction (requested → in_review)
- approveCampaignRequestAction (in_review → draft)
- declineCampaignRequestAction (in_review → declined)
- requestMoreInfoAction (in_review → requested)

Walk:
  (a) is_yagi_admin gate before service-role write — getAuthenticatedAdmin() in transitionRequestStatus (campaign-actions.ts).
  (b) Source-state guard via requireFromStatus[] — confirm a sponsor cannot trick admin into approving a 'declined' or 'draft' campaign by URL manipulation. (The page is admin-gated already, but defense-in-depth on the action.)
  (c) decision_metadata.history append — confirm prior history is preserved (not overwritten) when adding new entry. Walk appendHistory().
  (d) Notification recipient = `created_by` (original requester, preserved across workspace switches). Confirm.

## Adversarial focus areas (Tier 1 HIGH)

1. **Sponsor INSERT bypass attempts**:
   - Can a sponsor seed `decision_metadata` directly via the request_metadata payload? (request_metadata is a separate column; confirm the action layer doesn't accidentally write to decision_metadata from request input.)
   - Can a sponsor seed `compensation_model` / `allow_r2_upload` / etc by passing extra fields? (Zod schema on action input is whitelisted; column GRANT is whitelisted. Walk both layers.)
   - Slug collision: `generateSlug` uses time suffix; collision probability low but non-zero. Conflict handling on retry?
   - request_metadata.contact_phone: stored verbatim. PII concern? It's only visible to sponsor + yagi_admin per RLS; surface in admin review page is intended. OK?

2. **Sidebar workspace.kind gating bypass**:
   - The CTA visibility is gated by activeWorkspaceKind in the client component. Can a creator workspace user manually navigate to /app/campaigns/request and submit?
   - The page itself has a server-side guard (active.kind check) that shows guard_not_eligible message instead of the form. But if the creator opens devtools and POSTs to requestCampaignAction directly, the action's defense-in-depth membership precheck + RLS WITH CHECK both catch it. Walk.
   - Cookie tampering: yagi_active_workspace cookie. resolveActiveWorkspace validates membership against workspace_members. Confirm a forged cookie pointing to a workspace the user is NOT a member of falls back to first-membership instead of trusting the cookie.

3. **Admin transition state-machine consistency**:
   - The 4 transitions are: requested → in_review → {draft, declined, requested}. After 'requested' (via more_info), admin can re-enter the cycle. Is this loop bounded?
   - Source-state validation: requireFromStatus rejects bad source. But if two admins transition concurrently (admin1: requested→in_review, admin2: requested→in_review), is there an idempotency / racing concern? Optimistic locking?
   - decision_metadata.history grows unbounded across loops. Pruning policy? (Acceptable for MVP; flag if you think jsonb size could become problematic.)

4. **Notification fan-out**:
   - emitNotification recipient = created_by user (always). Workspace context = sponsor_workspace_id. If the original requester has been removed from the workspace (membership revoked between request submission and admin decision), the notification still fires but the in-app bell may not surface it (workspace filter). Acceptable for MVP? Flag if notification storage + visibility split is concerning.
   - Notification template lookup: 5 new kinds added to messages.notifications.events.<kind>. Confirm KO + EN templates present + parameterized correctly ({title} placeholder).

5. **Service-role usage in transition actions**:
   - All 4 admin transitions use createSupabaseService() because campaigns.status + decision_metadata are admin-only (column-level GRANT lockdown). The is_yagi_admin gate in getAuthenticatedAdmin() runs FIRST, then service-role write. Walk: any path where service-role write happens without admin gate? (No, transitionRequestStatus calls getAuthenticatedAdmin() at top.)

6. **i18n wording cross-check (binding)**:
   - campaign_request namespace KO values + admin_campaigns.review KO values + 5 new notification event KO templates — walk each, flag any English internal term ("Sponsor"/"Submission"/"Track"/"Roster"/"Distribution"/"RFP"/"Bypass"/"Routing"/"Type N").
   - EN side: confirm "Sponsor" English-noun is NOT exposed. The Builder renamed Sponsorship→Funding for compensation intent labels (sponsorship_self → "Self-funded", sponsorship_co_sponsor → "Shared funding"). Confirm "Sponsor" capitalized as English noun appears 0 times in user-facing values across all new keys.
   - Channel brand names (TikTok/Instagram/YouTube/X) are exempt per yagi-wording-rules (proper nouns).

7. **Page guard correctness**:
   - /app/campaigns/request page: if active workspace kind is 'creator' or 'yagi_admin', renders guard_not_eligible card instead of form. Confirm no leak of workspace data in the guard path.
   - /admin/campaigns/[id]/review page: server component fetches via service-role. If a non-admin somehow reaches the page (defense-in-depth), the action would still reject. But the page itself fetches sensitive request_metadata (contact phone). Confirm notFound() gate fires before any data fetch.

## Already-deferred (do NOT flag)

- Wave C scope: workspaces.kind 'creator' addition, /campaigns/[slug]/submit form, magic-link auto-creation of creator workspace.
- Wave D scope: admin 검수 of submissions, distribution tracking.
- Roster funnel UI (Phase 8).
- Compensation 정산 logic (Phase 11).
- A.1 schema findings (LOOP-3 CLEAN, in prod).
- A.2/A.3/A.4 findings (Wave A K-05 already covered).
- The pre-existing project_detail.timeline.routing = "Routing" en.json:1733 finding (HF4 carry-over, Phase 8 FU registered).

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (HIGH or MED only — LOW deferred to FU):
[FINDING N] CLASS: <HIGH-A|HIGH-B|HIGH-C|MED-A|MED-B|MED-C>: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave B sponsor request + admin approval workflow ready for K-06 + Wave C dispatch."

End with one-line summary.
