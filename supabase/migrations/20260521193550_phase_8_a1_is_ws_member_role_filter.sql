-- Phase 8 Wave A.1 hardening loop 1 — is_ws_member 'guest' role exclusion
-- Codex K-05 pass 1 verdict: HIGH-A
-- Finding: Q#7 (20260521184035) extended workspace_members.role CHECK to include
-- 'guest' but `is_ws_member()` function had no role filter. Result: workspace_members
-- with role='guest' would pass `is_ws_member()` and gain full WRITE access via legacy
-- ALL-command policies (proj_threads_rw / deliverables_rw / thread_msgs_rw), invalidating
-- A.1's read-only scope.
--
-- Fix: tighten is_ws_member to role IN ('admin', 'member'), restoring the pre-Q#7
-- invariant that every legacy policy implicitly depends on. is_ws_admin already
-- filters role='admin' explicitly (verified pg_get_functiondef 2026-05-22).
--
-- Side effect surface: every existing policy that calls is_ws_member changes
-- behavior to deny guest access. This is the desired correction. No admin/member
-- access is removed (tightening, not loosening).

CREATE OR REPLACE FUNCTION public.is_ws_member(uid uuid, wsid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE user_id = uid
      AND workspace_id = wsid
      AND role IN ('admin', 'member')
  );
$function$;

COMMENT ON FUNCTION public.is_ws_member(uuid, uuid) IS
  'Phase 8 A.1 hardening (2026-05-22) — role filter added to exclude ''guest''. Returns true iff the user is an admin or member of the workspace. Guests use is_project_guest(project_id, user_id) for project-scoped access.';
