-- Phase 5 Wave B hotfix-6 sub_2 — test-data cleanup.
--
-- Context: at the time of this migration, prod = test-only accounts (no
-- real users yet). yagi explicitly authorized a hard-delete of every
-- in-flight brief intake_mode project + their briefing_documents so the
-- simplified "always fresh INSERT" path in ensureBriefingDraftProject
-- lands on a clean slate.
--
-- Scope:
--   * briefing_documents WHERE project_id ∈ (any brief intake project
--     in status draft/submitted) — hard delete.
--   * projects WHERE intake_mode='brief' AND status IN ('draft','submitted')
--     — hard delete. Includes the legacy `f979035d` row that has
--     status='submitted' + submitted_at=NULL (Phase-4 wizard residue).
--
-- Out of scope:
--   * Other intake_mode rows (e.g., wizard / commission flow) — untouched.
--   * Projects already past 'submitted' — untouched.
--
-- R2 objects under briefing-docs/<user-id>/... are NOT deleted by this
-- migration (database-only). FU-Phase5-5 covers the periodic R2 cleanup
-- job. Storage cost growth is bounded by the small test-data volume
-- (~3 drafts at the time of this apply).

-- 1. briefing_documents first (FK CASCADE would handle this anyway, but
--    explicit DELETE keeps the migration log human-readable).
DELETE FROM public.briefing_documents
WHERE project_id IN (
  SELECT id FROM public.projects
  WHERE intake_mode = 'brief'
    AND status IN ('draft', 'submitted')
);

-- 2. projects.
DELETE FROM public.projects
WHERE intake_mode = 'brief'
  AND status IN ('draft', 'submitted');
