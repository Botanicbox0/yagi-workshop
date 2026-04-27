-- Phase 2.8.2 G_B2_A — projects soft-delete + admin trash + 3-day hard-delete cron
--
-- Founder framing (DECISIONS_CACHE Q-090, Q-091, Phase 2.8.2 SPEC §2.4):
-- yagi_admin needs to remove erroneous projects (test data, accidental
-- submits, abandoned drafts) while leaving a 3-day undelete window for the
-- client. Reads from the client perspective must hide soft-deleted rows
-- automatically; yagi_admin reads see everything so the trash console
-- can list candidates for restore or permanent delete.
--
-- Layered defense:
--   1. column           — projects.deleted_at timestamptz
--   2. RLS read         — ws_member sees deleted_at IS NULL; yagi_admin sees all
--   3. RLS update       — ws_admin can only update non-deleted rows; yagi_admin
--                         can update either (so restore via UPDATE works)
--   4. cron             — every 6h, hard-DELETE rows with deleted_at < now()-3d
--                         AND no invoice rows (FK invoices_project_id_fkey is
--                         ON DELETE RESTRICT — a project with an invoice must
--                         be cleared by yagi manually via admin trash)
--
-- Idempotency:
--   ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE POLICY,
--   cron.unschedule wrapped in EXISTS check, then cron.schedule.
--
-- Cascade on hard delete: meetings, notification_events, preprod_boards,
-- project_deliverables, project_milestones, project_references,
-- project_threads, showcases, project_briefs, project_brief_versions,
-- thread_messages — all already CASCADE per their FK definitions.
-- Storage object cleanup is left to a future Edge Function (TODO in
-- FOLLOWUPS): the DB cron only purges rows.

BEGIN;

-- 1. column ------------------------------------------------------------

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.projects.deleted_at IS
  'Phase 2.8.2 — soft-delete timestamp. NULL = active. Non-NULL = trash; '
  'cleared automatically by cron job ''projects-hard-delete-trash'' '
  '3 days after stamping unless the project has invoice rows.';

CREATE INDEX IF NOT EXISTS projects_deleted_at_idx
  ON public.projects (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 2. RLS — replace projects_read --------------------------------------

DROP POLICY IF EXISTS projects_read ON public.projects;

CREATE POLICY projects_read ON public.projects
  FOR SELECT TO authenticated
  USING (
    (
      public.is_ws_member(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- 3. RLS — replace projects_update ------------------------------------

DROP POLICY IF EXISTS projects_update ON public.projects;

CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    public.is_ws_admin(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
  );

-- 4. cron — hard-delete trash older than 3 days ----------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'projects-hard-delete-trash'
  ) THEN
    PERFORM cron.unschedule('projects-hard-delete-trash');
  END IF;
END
$$;

SELECT cron.schedule(
  'projects-hard-delete-trash',
  '13 */6 * * *',
  $cron$
  DELETE FROM public.projects p
   WHERE p.deleted_at IS NOT NULL
     AND p.deleted_at < now() - interval '3 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.invoices i WHERE i.project_id = p.id
     );
  $cron$
);

COMMIT;
