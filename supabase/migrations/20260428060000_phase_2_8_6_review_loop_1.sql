-- Phase 2.8.6 K-05 LOOP 1 — hardening for the meetings + support chat
-- RLS surfaces flagged by Codex (gpt-5.5, high reasoning).
--
-- Findings addressed:
--
-- HIGH-A-SCHEMA-ONLY #1 (Codex)
--   meetings_update client-edit lane (Phase 2.8.6 Task A.1) checked
--   only `created_by = auth.uid()` and request-window status without
--   re-validating workspace membership. A request creator could move
--   their own row across workspace boundaries by setting workspace_id
--   directly, or by setting project_id and letting the legacy
--   meetings_sync_workspace_id trigger derive a different workspace.
--   Fix: add `public.is_ws_member(auth.uid(), workspace_id)` to both
--   USING and CHECK on the client lane so the row's workspace must
--   still be one the caller is a member of, before AND after the
--   update. yagi_admin and ws_admin lanes are unchanged.
--
-- HIGH-A-SCHEMA-ONLY #2 (Codex)
--   support_threads_insert and support_messages_insert admitted any
--   ws_member (which includes ws_admin). The migration's stated
--   contract is "workspace admins read-only — only yagi staff
--   replies". Tighten by excluding ws_admin from the client-side
--   INSERT lane on both tables. ws_admin retains SELECT for audit.
--
-- HIGH-B #1 (Codex)
--   meetings_sync_workspace_id() trigger raises on NULL project_id.
--   The 2.8.6 client-request flow inserts NULL project_id (pre-project
--   meetings) and provides workspace_id directly. Replace the
--   function so it (a) skips when project_id IS NULL and trusts the
--   caller's workspace_id, (b) keeps the legacy "derive from project"
--   behavior when project_id IS NOT NULL.
--
-- HIGH-B #2 (Codex)
--   support_threads_update RLS allowed the client to flip status to
--   'closed'. Intent: only yagi_admin can close/reopen. Tighten:
--   client-owner UPDATE permitted but NOT for status changes
--   (enforced via WITH CHECK that pins status to its current value
--   on the client lane is awkward in plain SQL; instead we narrow
--   the policy so the client lane allows updates only when status
--   is unchanged. The setSupportThreadStatus app-layer action also
--   gains an is_yagi_admin guard in the same review loop.)
--
-- All changes idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
-- CREATE OR REPLACE FUNCTION).

BEGIN;

-- 1. meetings_sync_workspace_id — tolerate NULL project_id ----------

CREATE OR REPLACE FUNCTION public.meetings_sync_workspace_id() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  derived_ws uuid;
BEGIN
  -- Phase 2.8.6 K-05 LOOP 1: NULL project_id is now legal (client
  -- requests pre-project meetings). Trust the caller's workspace_id
  -- in that case; RLS already requires the caller to be a member of
  -- that workspace at INSERT/UPDATE time.
  IF NEW.project_id IS NULL THEN
    IF NEW.workspace_id IS NULL THEN
      RAISE EXCEPTION 'workspace_id required when project_id is NULL'
        USING ERRCODE = '23502';
    END IF;
    RETURN NEW;
  END IF;

  SELECT p.workspace_id INTO derived_ws
    FROM public.projects p
   WHERE p.id = NEW.project_id;
  IF derived_ws IS NULL THEN
    RAISE EXCEPTION 'project % not found', NEW.project_id
      USING ERRCODE = '23503';
  END IF;
  NEW.workspace_id := derived_ws;
  RETURN NEW;
END $$;

-- 2. meetings_update — require workspace membership on client lane --

DROP POLICY IF EXISTS meetings_update ON public.meetings;

CREATE POLICY meetings_update ON public.meetings
  FOR UPDATE TO authenticated
  USING (
    public.is_ws_admin(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
    OR (
      created_by = auth.uid()
      AND public.is_ws_member(auth.uid(), workspace_id)
      AND status IN ('requested', 'rescheduled')
    )
  )
  WITH CHECK (
    public.is_ws_admin(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
    OR (
      created_by = auth.uid()
      AND public.is_ws_member(auth.uid(), workspace_id)
      AND status IN ('requested', 'rescheduled', 'cancelled')
    )
  );

-- 3. support_threads_insert — exclude ws_admin from client lane ----

DROP POLICY IF EXISTS support_threads_insert ON public.support_threads;

CREATE POLICY support_threads_insert ON public.support_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    OR (
      public.is_ws_member(auth.uid(), workspace_id)
      AND NOT public.is_ws_admin(auth.uid(), workspace_id)
      AND client_id = auth.uid()
      AND status = 'open'
    )
  );

-- 4. support_messages_insert — exclude ws_admin from client lane ---

DROP POLICY IF EXISTS support_messages_insert ON public.support_messages;

CREATE POLICY support_messages_insert ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id
        AND t.status = 'open'
        AND (
          public.is_yagi_admin(auth.uid())
          OR (
            t.client_id = auth.uid()
            AND NOT public.is_ws_admin(auth.uid(), t.workspace_id)
          )
        )
    )
  );

-- 5. support_threads_update — only yagi_admin may flip status ------

DROP POLICY IF EXISTS support_threads_update ON public.support_threads;

CREATE POLICY support_threads_update ON public.support_threads
  FOR UPDATE TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR client_id = auth.uid()
  )
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    OR (
      client_id = auth.uid()
      -- Client lane: status MUST remain its current value. Postgres
      -- WITH CHECK runs against NEW only, so we cannot compare against
      -- OLD here; the status pin is enforced via the trigger below.
    )
  );

-- 6. Status-pin trigger for support_threads (client lane) ---------
-- Postgres RLS WITH CHECK can only see NEW. To prevent a client-owner
-- from changing status when they pass through the client lane, install
-- a BEFORE UPDATE trigger that raises if the caller is NOT a yagi_admin
-- and the status column changed.

CREATE OR REPLACE FUNCTION public.support_threads_pin_status_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.is_yagi_admin(auth.uid())
  THEN
    RAISE EXCEPTION 'support thread status is admin-only'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.support_threads_pin_status_for_client() FROM PUBLIC;

DROP TRIGGER IF EXISTS support_threads_pin_status_for_client ON public.support_threads;
CREATE TRIGGER support_threads_pin_status_for_client
  BEFORE UPDATE ON public.support_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.support_threads_pin_status_for_client();

COMMIT;
