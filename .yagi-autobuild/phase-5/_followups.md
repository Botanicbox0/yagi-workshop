# Phase 5 followups

> Wave / hotfix candidates and accepted-deferral items.
> See `.yagi-autobuild/phase-4-x/_followups.md` for the FU-C5* numbering used in
> Phase 4.x; Phase 5 starts a new FU-Phase5-N series.

## FU-Phase5-1 — data migration FK risk for stale uploader / added_by UUIDs

- **Trigger**: Codex K-05 Wave A LOOP 1 MED-C finding on
  `supabase/migrations/20260504053641_phase_5_migrate_attached_to_briefing_documents.sql`
  (the `attached_pdfs.uploaded_by` and `attached_urls.added_by` UUIDs in
  the source jsonb are cast to uuid and used as `briefing_documents.created_by`,
  which has a `REFERENCES profiles(id)` FK).
- **Risk**: at apply time, prod data is empty (0 source elements + 0 stale
  UIDs across both fields, verified 2026-05-04 via Supabase MCP). The
  immediate exploit surface is nil. The risk is forward-looking: once
  external clients onboard in Phase 5 and accumulate attachments, an
  admin who deletes a profile while leaving the historical jsonb element
  in place would create a stale UID. Re-running this migration on that
  state would fail the FK insert, mid-transaction.
- **Compensating control**: the sub_4 patch added a sanity assertion at
  the end of the migration's DO block — orphan `briefing_documents.created_by`
  rows raise EXCEPTION and roll back. Production runs already pass the
  assertion trivially (0 rows). The assertion is the safety net for any
  future re-run.
- **Action**: Wave-D-end batch sweep candidate, OR Phase 5.1 cleanup —
  add a pre-INSERT JOIN to `profiles` so unknown uploader UUIDs fall
  back to `p.created_by` cleanly instead of failing the assertion.
- **Owner**: Builder.
- **Status**: Deferred. Not blocking Wave A apply.
- **Registered**: 2026-05-04 (Wave A K-05 LOOP 1).

## FU-Phase5-2 — projects.status flat-key vs nested-key i18n consumer migration

- **Trigger**: Wave A task_03 sub_3b audit. Builder added the new nested
  keys `projects.status.<key>` per KICKOFF spec, but every existing
  consumer in `src/` reads `projects.status_<value>` (flat key — the
  pattern existing components like `status-badge.tsx` use via dynamic
  key interpolation).
- **Risk**: the nested keys are not yet wired to any consumer. The flat
  keys missing for `routing` and `approval_pending` would render empty
  if those status values surface in the UI (silent regression on the
  status pill).
- **Action**: Wave B picks one of:
  (a) add flat aliases (`status_routing`, `status_approval_pending`,
      and possibly migrate the rest to flat) so the existing
      `<StatusBadge>` consumer keeps working
  (b) migrate the badge + dashboard cards to read the nested keys, then
      drop the legacy flat keys
- **Compensating control**: nothing currently emits `routing` or
  `approval_pending` to client UI in production (admin-only states),
  so the silent-regression risk is zero today. Resend email templates
  embed status text as hardcoded JSX and bypass i18n entirely — they
  still display correctly.
- **Owner**: Builder (Wave B lead).
- **Status**: Deferred to Wave B.
- **Registered**: 2026-05-04 (Wave A task_03 sub_3b audit).

## FU-Phase5-3 — generic OG-meta scrape with SSRF-safe undici dispatcher

- **Trigger**: Codex K-05 Wave B task_05 v3 LOOP 1 HIGH finding F1 on
  `src/app/api/oembed/route.ts`. The original implementation resolved the
  hostname via `dns.lookup` before `fetch()`, but `fetch()` performs its
  own DNS lookup later — leaving a DNS-rebinding window between the
  validate-time resolve and the actual socket connect. The sub_5 patch
  closed F1 by removing the generic OG-meta scrape entirely (allowlist
  YouTube/Vimeo via `lib/oembed` + Instagram bare provider tag).
- **Risk**: Today, non-allowlisted hosts (instagram, x/twitter, tiktok,
  arbitrary blogs, etc.) return `{ provider: 'generic', thumbnail_url:
  null }`. Reference rows render the URL with the link-icon fallback
  but no thumbnail. UX impact: the canvas works; references just look
  more uniform than they could.
- **Compensating control**: input shape validation (`validateUrlShape`)
  blocks `.local`, `.internal`, `localhost` prefixes even though no
  fetch happens — defense-in-depth in case the route is later extended.
- **Action**: Re-introduce generic OG scrape using an undici `Agent`
  with a custom `connect.lookup` that pins the validated IP for the
  whole connection, including all redirect hops. Keep the streaming
  size cap, manual-redirect re-validation, and timeout. Trigger when
  external client demand for non-allowlisted providers (instagram, x,
  tiktok) shows up in onboarding feedback OR when the briefing canvas
  reference column needs richer thumbnails for non-video assets.
- **Owner**: Builder.
- **Status**: Deferred. Phase 6+ or earlier on demand.
- **Registered**: 2026-05-03 (Wave B task_05 v3 K-05 LOOP 1, sub_5
  patch closed F1 by removal not by hardening).

## FU-Phase5-4 — projects table column-grant lockdown for briefing canvas metadata

- **Trigger**: Builder grep audit during Wave B task_05 v3 sub_5 chat
  report. The Phase 4.x sub_03f_2 → sub_03f_5 sweep applied
  REVOKE+selective-GRANT to `projects` only for the workspaces
  cross-table; the 9 metadata columns added in task_04 v3 migration
  20260504162550 (purpose / channels / mood_keywords / mood_keywords_free
  / visual_ratio / visual_ratio_custom / target_audience /
  additional_notes / has_plan) plus 4 sidebar columns (budget_band /
  target_delivery_at / meeting_preferred_at / interested_in_twin) plus
  the existing brief / deliverable_types fields are reachable via
  table-level UPDATE on `projects` for `authenticated`.
- **Risk**: K-05 LOOP 1 finding F4 was a false positive — projects RLS
  UPDATE policy correctly enforces `(created_by AND status='draft') OR
  is_ws_admin OR yagi_admin`, so the policy layer denies misuse today.
  The MISSING piece is column-grant defense-in-depth: a future PUBLIC
  inheritance regression on `authenticated.UPDATE(projects)` would
  bypass any column-level intent the briefing canvas action layer is
  trying to express. The Phase 4.x cascade (sub_03f_2 → sub_03f_5)
  established the consistency rule; projects metadata is the 4th
  cascade waiting to be applied.
- **Action**: Phase 5 ff-merge batch sweep migration —
  REVOKE UPDATE ON projects FROM authenticated; GRANT UPDATE on the
  exact column list the action layer is permitted to mutate (status
  intentionally OMITTED — status transitions only via RPC); add
  has_table_privilege + has_column_privilege assertions matching
  Wave A sub_4 F3 pattern. Trigger: Wave D ff-merge prep OR
  Phase 5.1 cleanup hotfix.
- **Owner**: Builder.
- **Status**: Deferred. Phase 5 ff-merge batch sweep candidate.
- **Registered**: 2026-05-03 (Wave B task_05 v3 K-05 LOOP 1 sub_5 chat
  report).
