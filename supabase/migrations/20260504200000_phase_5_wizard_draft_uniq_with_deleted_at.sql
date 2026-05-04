-- Phase 5 Wave B hotfix-6 — projects_wizard_draft_uniq lockdown to honor
-- soft-delete.
--
-- Symptom: ensureBriefingDraftProject's dangling-draft wipe path
-- (옵션 A — yagi visual review hotfix-6) soft-deletes existing drafts
-- (deleted_at = now()) then INSERTs a fresh draft. Without this index
-- amendment, the soft-deleted row's (workspace_id, created_by) pair
-- still occupies the unique slot because the existing index predicate
-- ignores deleted_at, so the fresh INSERT collides with 23505.
--
-- Fix: extend the partial-index WHERE clause to require
-- deleted_at IS NULL. Soft-deleted drafts no longer occupy the slot
-- and the fresh INSERT lands cleanly. Behavior on the active draft
-- side is unchanged: a live draft with NULL deleted_at still blocks
-- a second concurrent draft for the same (workspace_id, created_by).
--
-- This is non-destructive: no rows change, no policies change, no
-- grants change. The DROP + CREATE pair locks the table briefly for
-- index rebuild (Phase 5 < 100 user, traffic minimal).

DROP INDEX IF EXISTS public.projects_wizard_draft_uniq;
CREATE UNIQUE INDEX projects_wizard_draft_uniq
  ON public.projects (workspace_id, created_by)
  WHERE status = 'draft'
    AND intake_mode = 'brief'
    AND deleted_at IS NULL;

DO $$
DECLARE
  v_indexdef text;
BEGIN
  SELECT indexdef INTO v_indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'projects_wizard_draft_uniq';
  IF v_indexdef IS NULL THEN
    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq missing after migration';
  END IF;
  IF v_indexdef NOT LIKE '%deleted_at IS NULL%' THEN
    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL — got: %', v_indexdef;
  END IF;
END $$;
