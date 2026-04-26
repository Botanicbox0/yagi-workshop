-- =============================================================================
-- Phase 2.8.1 G_B1-F — save_brief_version atomic RPC
-- =============================================================================
-- Replaces the two-step server-action sequence:
--   1. INSERT project_brief_versions (next version_n)
--   2. UPDATE project_briefs.current_version
-- with a single transaction. The pre-2.8.1 code raced when two saveVersion
-- calls landed within the same debounce window — the second INSERT would
-- collide on UNIQUE (project_id, version_n) and the bump UPDATE could leave
-- current_version inconsistent with the latest version row.
--
-- The new RPC takes a row-level FOR UPDATE lock on project_briefs at entry,
-- so concurrent calls queue and each observes the latest current_version
-- before computing its own next_n. UNIQUE (project_id, version_n) remains
-- as a defense-in-depth backstop.
--
-- SECURITY DEFINER: runs as the function owner (postgres role, BYPASSRLS by
-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
-- inside the function body — the existing project_briefs / project_brief_versions
-- RLS policies are mirrored.
--
-- The validate_project_brief_change trigger still fires on the UPDATE leg
-- and re-validates: non-admin must not change status / tiptap_schema_version,
-- current_version must increment by exactly 1, and a matching project_brief_versions
-- row must exist for the new current_version. Order in the function (INSERT
-- version then UPDATE briefs) satisfies that last requirement.

BEGIN;

CREATE OR REPLACE FUNCTION public.save_brief_version(
  p_project_id uuid,
  p_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_workspace_id uuid;
  v_status text;
  v_current_version int;
  v_content jsonb;
  v_next_n int;
  v_version_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  -- Acquire row-level lock on project_briefs first. Concurrent callers
  -- serialize here and each reads the post-bump current_version. This
  -- is the difference vs the pre-2.8.1 two-step race.
  SELECT pb.status, pb.current_version, pb.content_json
    INTO v_status, v_current_version, v_content
    FROM public.project_briefs pb
   WHERE pb.project_id = p_project_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Authorize: workspace member of the owning project, or yagi_admin.
  -- Matches project_brief_versions_insert and project_briefs UPDATE policies.
  SELECT p.workspace_id INTO v_workspace_id
    FROM public.projects p
   WHERE p.id = p_project_id;

  IF NOT (
    public.is_yagi_admin(v_caller)
    OR public.is_ws_member(v_caller, v_workspace_id)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_status = 'locked' THEN
    RAISE EXCEPTION 'locked' USING ERRCODE = '42501';
  END IF;

  v_next_n := v_current_version + 1;

  -- 1. Insert the snapshot. UNIQUE (project_id, version_n) prevents
  --    a duplicate row from sneaking in if the FOR UPDATE lock were
  --    ever bypassed.
  INSERT INTO public.project_brief_versions
    (project_id, version_n, content_json, label, created_by)
  VALUES
    (p_project_id, v_next_n, v_content, p_label, v_caller)
  RETURNING id INTO v_version_id;

  -- 2. Bump current_version. The validate_project_brief_change trigger
  --    requires this to be exactly OLD.current_version + 1 and a matching
  --    project_brief_versions row to already exist (just inserted).
  UPDATE public.project_briefs
     SET current_version = v_next_n,
         updated_by = v_caller
   WHERE project_id = p_project_id;

  RETURN jsonb_build_object(
    'versionId', v_version_id,
    'versionN', v_next_n
  );
END $$;

COMMENT ON FUNCTION public.save_brief_version(uuid, text) IS
  'Phase 2.8.1 — atomic snapshot+bump for project_briefs. Replaces the '
  'race-prone two-step INSERT+UPDATE in saveBrief server action. SECURITY '
  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
  'the project_brief_versions_insert RLS policy.';

REVOKE ALL ON FUNCTION public.save_brief_version(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_brief_version(uuid, text)
  TO authenticated, service_role;

COMMIT;
