-- Phase 2.8.6 Task A.1 — extend meetings for client-initiated request flow.
--
-- Phase 1.3 shipped meetings as admin-created (status='scheduled', project
-- and time fixed at insert). The new client request flow:
--   1. Client INSERTs status='requested' with requested_at_options[] and
--      project_id = NULL (pre-project meeting allowed).
--   2. Admin reviews → confirms (status='scheduled', scheduled_at filled,
--      meet_link added).
--   3. Client may reschedule while status in ('requested', 'rescheduled').
--   4. Either party may cancel → status='cancelled'.
--
-- This migration:
--   1. Relaxes project_id and scheduled_at to NULLABLE (request-stage
--      rows do not have either yet).
--   2. Adds requested_at_options jsonb (1-3 client-proposed timestamps).
--   3. Adds assigned_admin_id uuid (FK profiles) — set when an admin
--      picks up the request.
--   4. Adds ics_uid text NOT NULL — stable iCalendar UID for dedup
--      across edits; backfills via gen_random_uuid()::text default
--      (existing rows get fresh UIDs that are not yet sent to anyone,
--      which is fine).
--   5. Extends meetings_status_check to allow 'requested' and
--      'rescheduled' alongside the existing four states.
--   6. Replaces meetings_insert and meetings_update RLS so:
--        - Workspace members can INSERT only when status='requested'
--          AND created_by = auth.uid() (cannot impersonate or seed
--          a 'scheduled' state directly).
--        - Workspace members can UPDATE their own meeting only when
--          current state is requested/rescheduled, AND the resulting
--          state must be requested/rescheduled/cancelled (cannot
--          self-confirm or self-complete; that is admin-only).
--        - ws_admin / yagi_admin keep their existing full-access lanes.
--   7. Touch trigger on UPDATE to bump updated_at.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF EXISTS,
-- DROP POLICY IF EXISTS + CREATE POLICY, CREATE OR REPLACE TRIGGER.

BEGIN;

-- 1. Relax NOT NULL ----------------------------------------------------

ALTER TABLE public.meetings
  ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.meetings
  ALTER COLUMN scheduled_at DROP NOT NULL;

-- 2. New columns -------------------------------------------------------

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS requested_at_options jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS ics_uid text NOT NULL DEFAULT gen_random_uuid()::text;

-- 3. Status enum extension --------------------------------------------

ALTER TABLE public.meetings
  DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IN (
    'requested',
    'rescheduled',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  ));

-- 4. RLS — INSERT -----------------------------------------------------

DROP POLICY IF EXISTS meetings_insert ON public.meetings;

CREATE POLICY meetings_insert ON public.meetings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ws_admin(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
    OR (
      public.is_ws_member(auth.uid(), workspace_id)
      AND created_by = auth.uid()
      AND status = 'requested'
    )
  );

-- 5. RLS — UPDATE -----------------------------------------------------

DROP POLICY IF EXISTS meetings_update ON public.meetings;

CREATE POLICY meetings_update ON public.meetings
  FOR UPDATE TO authenticated
  USING (
    public.is_ws_admin(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
    OR (
      created_by = auth.uid()
      AND status IN ('requested', 'rescheduled')
    )
  )
  WITH CHECK (
    public.is_ws_admin(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
    OR (
      created_by = auth.uid()
      AND status IN ('requested', 'rescheduled', 'cancelled')
    )
  );

-- 6. updated_at touch trigger -----------------------------------------
-- Reuse the standard touch_updated_at function if it already exists in
-- this schema (it is created in the baseline). Otherwise create it.

CREATE OR REPLACE FUNCTION public.meetings_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS meetings_touch_updated_at ON public.meetings;
CREATE TRIGGER meetings_touch_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.meetings_touch_updated_at();

COMMIT;
