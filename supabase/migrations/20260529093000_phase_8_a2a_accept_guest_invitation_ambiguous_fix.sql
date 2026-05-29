-- Phase 8 Wave A.2.a hotfix - accept_guest_invitation ambiguous column refs
--
-- Bug: RETURNS TABLE(workspace_id uuid, project_id uuid) creates PL/pgSQL
-- output variables named workspace_id/project_id. Unqualified SQL column refs
-- inside the SECURITY DEFINER function can collide with those variables.
--
-- Scope: preserve the original auth/email/invitation validation and mutation
-- behavior exactly; qualify table refs and use explicit unique constraints for
-- idempotent inserts.

CREATE OR REPLACE FUNCTION public.accept_guest_invitation(p_token text)
RETURNS TABLE (workspace_id uuid, project_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invitation workspace_invitations%ROWTYPE;
  v_wm_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT au.email
    INTO v_user_email
  FROM auth.users AS au
  WHERE au.id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT wi.*
    INTO v_invitation
  FROM public.workspace_invitations AS wi
  WHERE wi.token = p_token
  FOR UPDATE;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_invitation.role <> 'guest' THEN
    RAISE EXCEPTION 'wrong_invitation_kind' USING ERRCODE = '55000';
  END IF;
  IF v_invitation.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation_already_accepted' USING ERRCODE = '55000';
  END IF;
  IF v_invitation.expires_at < now() THEN
    RAISE EXCEPTION 'invitation_expired' USING ERRCODE = '55000';
  END IF;
  IF lower(v_invitation.email) <> lower(v_user_email) THEN
    RAISE EXCEPTION 'invitation_email_mismatch' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role,
    invited_by,
    invited_at,
    joined_at
  )
  VALUES (
    v_invitation.workspace_id,
    v_user_id,
    'guest',
    v_invitation.invited_by,
    v_invitation.created_at,
    now()
  )
  ON CONFLICT ON CONSTRAINT workspace_members_workspace_id_user_id_key
  DO NOTHING;

  SELECT wm.id
    INTO v_wm_id
  FROM public.workspace_members AS wm
  WHERE wm.workspace_id = v_invitation.workspace_id
    AND wm.user_id = v_user_id;

  INSERT INTO public.project_guests (workspace_member_id, project_id, granted_by)
  VALUES (v_wm_id, v_invitation.project_id, v_invitation.invited_by)
  ON CONFLICT ON CONSTRAINT project_guests_workspace_member_id_project_id_key
  DO NOTHING;

  UPDATE public.workspace_invitations AS wi
  SET accepted_at = now()
  WHERE wi.id = v_invitation.id;

  RETURN QUERY
  SELECT v_invitation.workspace_id, v_invitation.project_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.accept_guest_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_guest_invitation(text) TO authenticated;

COMMENT ON FUNCTION public.accept_guest_invitation(text) IS
  'A.2.a hotfix: Atomic accept of a guest invitation. Validates token (existence, kind=guest, not accepted, not expired, email match) then upserts workspace_members (role=guest, ON CONFLICT preserves existing role) + project_guests grant + marks invitation accepted. Returns workspace_id + project_id. Errors: unauthenticated / user_not_found / invitation_not_found / wrong_invitation_kind / invitation_already_accepted / invitation_expired / invitation_email_mismatch.';
