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
