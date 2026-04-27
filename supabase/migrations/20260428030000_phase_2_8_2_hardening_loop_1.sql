-- Phase 2.8.2 K-05 LOOP 1 — hardening for soft-delete RLS + RPC paths.
--
-- Codex K-05 (gpt-5.5, high reasoning) flagged two HIGH-A-SCHEMA-ONLY
-- gaps in the 20260428000000 + 20260427010000 surface area. Both are
-- additive fixes per Q-082; production data is untouched (1 project,
-- 0 invoices, 1 brief baseline).
--
-- Finding 1 — projects_update WITH CHECK gap
--   The original CHECK clause was
--     (is_ws_admin(...) OR is_yagi_admin(...))
--   which permits a non-yagi workspace_admin to write deleted_at = now()
--   directly via the Supabase REST/RPC client, bypassing the yagi-only
--   server action softDeleteProject(). The USING side already prevents a
--   ws_admin from updating an ALREADY-trashed row — but it does not
--   prevent them from CREATING a trashed row. Tightened CHECK forbids
--   ws_admin from producing a row with deleted_at IS NOT NULL.
--
-- Finding 2 — save_brief_version did not gate on deleted_at
--   The 2.8.1 RPC predates the 2.8.2 soft-delete column. SECURITY
--   DEFINER bypasses RLS and the function body authorizes only on
--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
--   A non-yagi workspace_member can still snapshot the brief of a
--   trashed project through this RPC, mutating project_briefs and
--   project_brief_versions. Wrap with an early `deleted_at IS NULL`
--   gate (yagi_admin bypasses, matching the read-side pattern).
--
-- Both fixes are idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
-- CREATE OR REPLACE FUNCTION).

BEGIN;

-- 1. projects_update — tighten WITH CHECK ----------------------------

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
    (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- 2. save_brief_version — refuse trashed projects -------------------

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
  v_deleted_at timestamptz;
  v_status text;
  v_current_version int;
  v_content jsonb;
  v_next_n int;
  v_version_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT pb.status, pb.current_version, pb.content_json
    INTO v_status, v_current_version, v_content
    FROM public.project_briefs pb
   WHERE pb.project_id = p_project_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Phase 2.8.2 K-05 LOOP 1 hardening — refuse RPC writes against
  -- trashed projects. yagi_admin bypasses (so a yagi-side restore +
  -- save flow remains possible), matching the projects_read pattern.
  SELECT p.workspace_id, p.deleted_at
    INTO v_workspace_id, v_deleted_at
    FROM public.projects p
   WHERE p.id = p_project_id;

  IF NOT (
    public.is_yagi_admin(v_caller)
    OR public.is_ws_member(v_caller, v_workspace_id)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
    RAISE EXCEPTION 'project_deleted' USING ERRCODE = '42501';
  END IF;

  IF v_status = 'locked' THEN
    RAISE EXCEPTION 'locked' USING ERRCODE = '42501';
  END IF;

  v_next_n := v_current_version + 1;

  INSERT INTO public.project_brief_versions
    (project_id, version_n, content_json, label, created_by)
  VALUES
    (p_project_id, v_next_n, v_content, p_label, v_caller)
  RETURNING id INTO v_version_id;

  UPDATE public.project_briefs
     SET current_version = v_next_n,
         updated_by = v_caller
   WHERE project_id = p_project_id;

  RETURN jsonb_build_object(
    'versionId', v_version_id,
    'versionN', v_next_n
  );
END $$;

REVOKE ALL ON FUNCTION public.save_brief_version(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_brief_version(uuid, text)
  TO authenticated, service_role;

COMMIT;
