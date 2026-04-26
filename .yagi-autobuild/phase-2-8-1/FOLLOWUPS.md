# Phase 2.8.1 — Follow-ups

Deferred items registered during Phase 2.8.1 K-05 review (loop 1).
Format mirrors Phase 2.8 FOLLOWUPS.md.

---

## FU-2.8.1-ensuredraft-race-brief-poll

- **Trigger**: Two parallel `ensureDraftProject` calls collide on the
  partial unique index `projects_wizard_draft_uniq`. The 23505 catch
  re-SELECTs the winning project row, then `fetchDraftBootstrap`
  reads the sibling `project_briefs` row. If the winning request
  hasn't yet reached its `INSERT INTO project_briefs` line, the
  re-SELECT returns null and the loser falls through to a generic
  `db` error.
- **Risk**: MED. Surfaces a transient error toast instead of a
  successful resume. The winning request still completes correctly
  on its own; the loser only sees the wrong UX.
- **Action**: Either (a) retry-poll `fetchDraftBootstrap` on the
  loser path with ~150ms backoff (3 attempts) before failing, or
  (b) fold the project + project_briefs INSERT into a single
  SECURITY DEFINER RPC so the row appears atomically.
- **Owner**: builder (Phase 2.10 candidate).
- **Status**: deferred.
- **Registered**: 2026-04-26 (Phase 2.8.1 K-05 review, finding 3,
  Codex MED).

