-- Phase 5 Wave A task_03 sub_3a — adds interested_in_twin boolean column to
-- projects. twin_intent enum kept (deprecated, comment-flagged) for legacy
-- data preservation.

ALTER TABLE projects
  ADD COLUMN interested_in_twin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN projects.twin_intent IS 'DEPRECATED Phase 5 — use interested_in_twin instead. Kept for legacy data preservation.';
