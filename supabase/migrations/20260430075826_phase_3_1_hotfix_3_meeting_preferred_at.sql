-- Phase 3.1 hotfix-3 addendum (Wave E task_09 sub-deliverable 3)
-- Adds optional meeting_preferred_at datetime column to projects table.
-- Pure additive ALTER — existing rows get NULL; existing RLS policies on
-- projects table cover the new column (column-level inheritance from row policy).
-- yagi smoke v1 FAIL-5: 새 필드 요청 (미팅 희망 일자, datetime-local, 선택)
-- K-05 mini-review handled in task_10 (Wave F).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS meeting_preferred_at timestamptz NULL;

COMMENT ON COLUMN projects.meeting_preferred_at IS
  'Optional client-preferred meeting datetime selected at wizard Step 3. Used by admin scheduling. NULL when not specified. Set via direct INSERT in submitProjectAction (no separate RPC).';
