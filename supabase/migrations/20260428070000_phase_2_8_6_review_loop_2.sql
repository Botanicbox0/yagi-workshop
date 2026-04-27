-- Phase 2.8.6 K-05 LOOP 2 — residual hardening on support_threads_update.
--
-- Codex LOOP 2 found one HIGH-A-SCHEMA-ONLY residual: the LOOP 1
-- support_threads_update policy still allowed the client owner of a
-- thread to UPDATE arbitrary columns on their own row, including
-- workspace_id. A malicious client could re-point their thread at
-- another workspace, after which the workspace_admin SELECT lane in
-- the target workspace would expose the thread to those admins
-- (and their messages_select would surface the injected messages).
--
-- The status-pin trigger only guarded `status`; it did not block
-- workspace_id rewrites.
--
-- Fix: support_threads_update is now yagi_admin-only. The application
-- has no client-driven UPDATE path on support_threads — the only
-- thread mutation a client triggers is INSERT (via getOrCreate) and
-- subsequent message INSERTs which auto-bump last_message_at via the
-- SECURITY DEFINER trigger. yagi_admin retains full UPDATE access for
-- close/reopen and any future ops.
--
-- The status-pin trigger from LOOP 1 is now redundant (no client lane
-- exists for it to guard) but is left in place as defense-in-depth in
-- case a future migration re-introduces a client UPDATE path.
--
-- Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).

BEGIN;

DROP POLICY IF EXISTS support_threads_update ON public.support_threads;

CREATE POLICY support_threads_update ON public.support_threads
  FOR UPDATE TO authenticated
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

COMMIT;
