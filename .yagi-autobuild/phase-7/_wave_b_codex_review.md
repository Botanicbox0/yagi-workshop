## VERDICT: NEEDS-ATTENTION

[FINDING 1] CLASS: MED-B: `src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts:547` — admin status transitions validate source state before the write, but the write only filters by `id`, so concurrent admins can apply stale transitions, overwrite `decision_metadata.history`, and emit conflicting notifications. Example: approve and decline both fetch `in_review`, both pass line 533, and the last update wins. Recommended fix: make the transition atomic, ideally via SQL RPC with `SELECT ... FOR UPDATE` and JSONB append, or at minimum add `status IN requireFromStatus` to the `UPDATE`, verify exactly one row changed, and emit notification only after that succeeds.

Audit notes:
- Sponsor INSERT path: no direct bypass found. The action uses the session client and inserts only `slug`, `title`, `brief`, `reference_assets`, `sponsor_workspace_id`, `status`, `request_metadata`, `created_by`, `updated_at`; this matches the column INSERT grant and avoids revoked admin columns.
- RLS `campaigns_insert_sponsor` enforces `status='requested'`, `created_by=auth.uid()`, non-null sponsor workspace, brand/artist membership, and null/default admin lifecycle fields.
- `ws_admin` gets no special sponsor insert privilege beyond workspace membership.
- `yagi_admin` can technically use this path if operating from an eligible brand/artist workspace; that is a product decision, not a privilege escalation.
- Direct navigation / devtools POST from creator or yagi_admin workspace is caught by the action precheck and the RLS `workspace.kind IN ('brand','artist')` check.
- Admin review page calls `is_yagi_admin` before the service-role fetch, so request metadata is not fetched before the page gate.
- Notification templates for all 5 new kinds exist in KO/EN and include `{title}`. I found no capitalized “Sponsor” in the new EN user-facing values.

Summary: sponsor request entry is locked down, but the admin transition state machine needs an atomic compare-and-set fix before K-06/Wave C.
