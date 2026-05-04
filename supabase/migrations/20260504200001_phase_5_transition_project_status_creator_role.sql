-- Phase 5 Wave B hotfix-6 sub_2 — transition_project_status creator-first role.
--
-- K-05 LOOP 1 (Tier 2 medium) HIGH finding: bootstrap_workspace grants
-- the workspace creator the 'workspace_admin' role. The original
-- transition_project_status RPC matched the actor as 'workspace_admin'
-- before checking creator ownership, and is_valid_transition's
-- workspace_admin matrix does NOT include `draft → submitted`. Result:
-- every client who created their own workspace got 23514 / wrong_status
-- when pressing [의뢰하기 →] on Step 3 — the primary submit path was
-- unreachable for the entire 의뢰자 cohort.
--
-- Fix: creator-bound transitions act as 'client' regardless of admin
-- privileges. Admin powers re-engage only when the actor is acting on
-- someone else's project (actor_id <> v_created_by branch).
--
--   IF v_actor_id = v_created_by THEN
--     v_actor_role := 'client';   -- own project = client lifecycle
--   ELSIF v_is_yagi_admin THEN
--     v_actor_role := 'yagi_admin';
--   ELSIF v_is_ws_admin THEN
--     v_actor_role := 'workspace_admin';
--   ELSE
--     v_actor_role := 'client';
--   END IF;
--
-- Side effect: a yagi_admin acting on a project they themselves created
-- now goes through the client matrix (no admin powers on own project).
-- yagi_admin is internal staff role; the "yagi staff member also creates
-- a client-style brief draft" path is rare-to-nonexistent. If we ever
-- need it, the workaround is to use a service-role tool or add a
-- yagi_admin draft → submitted entry to is_valid_transition's matrix.
--
-- The redundant `client AND actor_id <> created_by` forbidden check
-- below the role assignment stays as defense-in-depth; under the new
-- assignment it can only fire if a non-admin non-creator caller hits
-- the function (i.e., a workspace member who is neither the creator
-- nor a workspace_admin for the project's workspace).
--
-- CREATE OR REPLACE preserves owner + EXECUTE grants by default
-- (postgres / authenticated / service_role / anon — verified via mcp
-- pre-apply). yagi authorized skipping the DO-block verify since prod
-- is test-only at this stage; Builder verifies post-apply via SQL
-- (pg_get_functiondef + pg_proc.proowner + has_function_privilege).

CREATE OR REPLACE FUNCTION public.transition_project_status(
  p_project_id uuid,
  p_to_status text,
  p_comment text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id    uuid;
  v_actor_role  text;
  v_from_status text;
  v_created_by  uuid;
  v_workspace_id uuid;
  v_new_id      uuid;
  v_is_yagi_admin      boolean;
  v_is_ws_admin        boolean;
BEGIN

  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);

  SELECT status, created_by, workspace_id
    INTO v_from_status, v_created_by, v_workspace_id
    FROM public.projects
   WHERE id = p_project_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_is_ws_admin := EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = v_actor_id
       AND role = 'workspace_admin'
       AND workspace_id = v_workspace_id
  );

  -- hotfix-6 sub_2: creator-first role resolution. Own project always
  -- flows through the client matrix even if the caller has elevated
  -- workspace_admin / yagi_admin privileges.
  IF v_actor_id = v_created_by THEN
    v_actor_role := 'client';
  ELSIF v_is_yagi_admin THEN
    v_actor_role := 'yagi_admin';
  ELSIF v_is_ws_admin THEN
    v_actor_role := 'workspace_admin';
  ELSE
    v_actor_role := 'client';
  END IF;

  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
    RAISE EXCEPTION 'forbidden: client may only transition own projects'
      USING ERRCODE = '42501';
  END IF;

  IF p_to_status = 'in_revision' THEN
    IF p_comment IS NULL OR length(trim(p_comment)) < 10 THEN
      RAISE EXCEPTION 'comment_required_min_10_chars'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NOT public.is_valid_transition(v_from_status, p_to_status, v_actor_role) THEN
    RAISE EXCEPTION 'invalid_transition: % -> % for role %',
      v_from_status, p_to_status, v_actor_role
      USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('local.transition_rpc_active', 'true', true);

  UPDATE public.projects
     SET status       = p_to_status,
         updated_at   = now(),
         submitted_at = CASE
                          WHEN p_to_status = 'submitted' THEN now()
                          ELSE submitted_at
                        END
   WHERE id = p_project_id;

  INSERT INTO public.project_status_history (
    project_id, from_status, to_status, actor_id, actor_role, comment
  ) VALUES (
    p_project_id, v_from_status, p_to_status, v_actor_id, v_actor_role, p_comment
  )
  RETURNING id INTO v_new_id;

  PERFORM set_config('local.transition_rpc_active', 'false', true);

  RETURN v_new_id;

END $function$;

-- CREATE OR REPLACE preserves owner (postgres) + EXECUTE grants
-- (authenticated/service_role/anon) by default. Builder verifies the
-- creator-first branch landed via `pg_get_functiondef` SQL after apply
-- (yagi spec: DO-block over-engineering for test-only prod, simplified).
