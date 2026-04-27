-- =============================================================================
-- Phase 3.0 K-05 LOOP 1 fix — HIGH-A: projects_insert RLS too restrictive
-- =============================================================================
-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
-- since Phase 2.0 baseline. A regular workspace member (client with
-- workspace_members.role != 'admin') cannot INSERT projects via the user-scoped
-- authenticated client. This blocks all project submissions from non-admin
-- workspace members — the primary user class for project submission.
--
-- Root cause: Phase 2.0 baseline wrote the policy for the admin-only project
-- creation path (commission intake). Phase 3.0 submitProjectAction added a
-- client-facing path using the user-scoped client without catching that the
-- INSERT policy would reject non-admin clients.
--
-- In prod today (2026-04-28) workspace_members only has role='admin' rows
-- (2 rows, both Yagi internal), so the bug was masked during all Phase 2.x
-- development. A real client (role='member' or 'viewer') would hit RLS
-- rejection on every project submit.
--
-- Fix: extend WITH CHECK to is_ws_member (any workspace member), matching
-- the read policy (projects_read uses is_ws_member). The trigger guard
-- (trg_guard_projects_status) and is_valid_transition() continue to gate
-- all status transitions independently.
-- =============================================================================

DROP POLICY IF EXISTS projects_insert ON public.projects;

CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ws_member(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
  );

COMMENT ON POLICY projects_insert ON public.projects IS
  'K-05 LOOP 1 fix (20260427182456): any workspace member may INSERT projects. '
  'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
  'project submissions. is_yagi_admin path preserved for admin console creates.';
