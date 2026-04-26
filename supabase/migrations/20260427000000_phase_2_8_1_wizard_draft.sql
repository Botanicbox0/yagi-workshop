-- =============================================================================
-- Phase 2.8.1 G_B1-B — Wizard draft project lookup constraint
-- =============================================================================
-- ensureDraftProject() (server action) needs at most one in-progress brief
-- draft per (workspace, user). Pre-Phase-2.8.1 the wizard INSERTed a fresh
-- projects row on every "Save draft" click, so legacy rows may have multiple
-- drafts per user. This migration soft-archives older brief-mode draft
-- duplicates and adds a partial unique index that future INSERTs honor.
--
-- Why a partial unique index, not a UNIQUE constraint:
--   - We only want uniqueness for status='draft' AND intake_mode='brief'.
--     Submitted/in_production/etc. projects can freely accumulate.
--   - intake_mode='proposal_request' (legacy Phase 2.7.2) is excluded from
--     the constraint — those projects predate the wizard-draft pattern.
--
-- Why ARCHIVE older duplicates instead of DELETE:
--   - The Projects hub still surfaces archived rows behind a filter; users
--     can recover content if they need it. Hard DELETE would be silent.
--
-- Rollback note:
--   - DROP INDEX projects_wizard_draft_uniq;
--   - To restore archived rows, manual UPDATE per id (no automatic reverse).

BEGIN;

-- 1. Soft-archive older brief-mode draft duplicates per (workspace, user).
--    Keep the most-recently-updated (or most-recently-created on tie) draft.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY workspace_id, created_by
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
    FROM public.projects
   WHERE status = 'draft'
     AND intake_mode = 'brief'
)
UPDATE public.projects p
   SET status = 'archived',
       updated_at = now()
  FROM ranked r
 WHERE p.id = r.id
   AND r.rn > 1;

-- 2. Partial unique index so the wizard can resume a single draft per
--    (workspace, user) without a race window between SELECT-then-INSERT.
--    The server action catches 23505 (UNIQUE_VIOLATION) and re-SELECTs.
CREATE UNIQUE INDEX IF NOT EXISTS projects_wizard_draft_uniq
  ON public.projects (workspace_id, created_by)
  WHERE status = 'draft' AND intake_mode = 'brief';

COMMENT ON INDEX public.projects_wizard_draft_uniq IS
  'Phase 2.8.1 G_B1-B — at most one in-progress wizard draft per (workspace, '
  'user). Wizard ensureDraftProject() relies on this for find-or-create.';

COMMIT;
