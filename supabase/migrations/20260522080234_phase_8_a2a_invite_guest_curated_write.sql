-- Phase 8 Wave A.2.a — Guest invitation + Curated Project + Guest WRITE permissions
-- §AJ Q#7 LOCKED (PRODUCT-MASTER v1.11) + A.1 (20260521192531 + 20260521193550) 후속.
--
-- Scope:
--   1. workspace_invitations.project_id (nullable) + CHECK + INDEX → guest invite scope binding
--   2. projects.project_type extend 'curated' (3rd Identity Extension mechanism)
--   3. accept_guest_invitation(text) PL/pgSQL SECURITY DEFINER RPC — atomic 3-table mutation
--   4. thread_messages guest INSERT policy (FU-A1-004 resolution)
--   5. project_deliverables guest INSERT policy (FU-A1-005 resolution)
--
-- Out of scope (Wave B/C 후보, kickoff §2 OUT-OF-SCOPE):
--   - UI 일체 (Curated 생성 button, invite form, accept page) = A.2.b
--   - Email delivery (Resend) integration **재설계** — 기존 패턴 reuse만
--   - FU-A1-001 cross-workspace invariant / FU-A1-002 briefing_documents Pattern C /
--     FU-A1-003 deleted_at gate / FU-A1-006 frame_comments
--   - A.3 Creator Hub
--   - Existing campaigns/projects 관계 재설계
--   - A.1 is_ws_member hardening revert (절대 금지)
--
-- Defensive pattern: DROP CONSTRAINT/POLICY IF EXISTS + ADD/CREATE per kickoff §G3.
-- 기존 admin/member RLS policies 일체 비변경 (kickoff §7 #1 forbid).

-- =========================================================================
-- 1. workspace_invitations.project_id + CHECK + INDEX
-- =========================================================================

ALTER TABLE workspace_invitations
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE;

COMMENT ON COLUMN workspace_invitations.project_id IS
  'A.2.a: NULL for admin/member invitations; NOT NULL for guest invitations. Binds the invitation to a specific project so acceptance creates project_guests grant for that project only.';

ALTER TABLE workspace_invitations
  DROP CONSTRAINT IF EXISTS workspace_invitations_role_project_id_check;
ALTER TABLE workspace_invitations
  ADD CONSTRAINT workspace_invitations_role_project_id_check
  CHECK (
    (role = 'guest' AND project_id IS NOT NULL)
    OR (role IN ('admin', 'member') AND project_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS workspace_invitations_project_id_idx
  ON workspace_invitations(project_id)
  WHERE project_id IS NOT NULL;

-- =========================================================================
-- 2. projects.project_type extend to include 'curated'
--    기존 enum reuse (3rd Identity Extension mechanism). 'kind' 컬럼은 routing
--    의미 (direct / inbound_brand_to_artist / talent_initiated_* 6값) 별도 유지.
-- =========================================================================

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check
  CHECK (project_type = ANY (ARRAY['direct_commission'::text, 'contest_brief'::text, 'curated'::text]));

COMMENT ON COLUMN projects.project_type IS
  'Identity Extension mechanism (PRODUCT-MASTER §AE/§AG): direct_commission (Flow A/B single brand-artist), contest_brief (Wave C v2 distributed campaign sourced project), curated (A.2.a yagi internal + selected creator + external collaborator 3-party room).';

-- =========================================================================
-- 3. accept_guest_invitation(p_token text) — atomic 3-table RPC
--    SECURITY DEFINER + SET search_path. Single transaction. Idempotent via
--    ON CONFLICT DO NOTHING for both workspace_members and project_guests.
-- =========================================================================

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

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_invitation
  FROM workspace_invitations
  WHERE token = p_token
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

  INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, invited_at, joined_at)
  VALUES (v_invitation.workspace_id, v_user_id, 'guest', v_invitation.invited_by, v_invitation.created_at, now())
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  SELECT id INTO v_wm_id
  FROM workspace_members
  WHERE workspace_id = v_invitation.workspace_id
    AND user_id = v_user_id;

  INSERT INTO project_guests (workspace_member_id, project_id, granted_by)
  VALUES (v_wm_id, v_invitation.project_id, v_invitation.invited_by)
  ON CONFLICT (workspace_member_id, project_id) DO NOTHING;

  UPDATE workspace_invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN QUERY SELECT v_invitation.workspace_id, v_invitation.project_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.accept_guest_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_guest_invitation(text) TO authenticated;

COMMENT ON FUNCTION public.accept_guest_invitation(text) IS
  'A.2.a: Atomic accept of a guest invitation. Validates token (existence, kind=guest, not accepted, not expired, email match) then upserts workspace_members (role=guest, ON CONFLICT preserves existing role) + project_guests grant + marks invitation accepted. Returns workspace_id + project_id. Errors: unauthenticated / user_not_found / invitation_not_found / wrong_invitation_kind / invitation_already_accepted / invitation_expired / invitation_email_mismatch.';

-- =========================================================================
-- 4. thread_messages guest INSERT policy (FU-A1-004 resolution)
--    A.2.a IN-SCOPE: granted guest 가 visibility=shared message 만 INSERT.
--    is_ws_member 미사용 (A.1 hardening 으로 guest 가 거기 통과 안 함, 그리고
--    의도적으로 별도 helper is_project_guest 만 사용 — kickoff §7 #3).
-- =========================================================================

DROP POLICY IF EXISTS thread_msgs_guest_insert ON thread_messages;
CREATE POLICY thread_msgs_guest_insert
ON thread_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND visibility = 'shared'
  AND EXISTS (
    SELECT 1 FROM project_threads t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = thread_messages.thread_id
      AND is_project_guest(p.id, auth.uid())
  )
);

COMMENT ON POLICY thread_msgs_guest_insert ON thread_messages IS
  'A.2.a: granted project 의 guest 가 shared 메시지 INSERT 가능. author_id binding + visibility=shared 강제. is_project_guest helper 만 사용 (kickoff §7 #3 — is_ws_member 사용 금지로 A.1 hardening 우회 방지).';

-- =========================================================================
-- 5. project_deliverables guest INSERT policy (FU-A1-005 resolution)
--    A.2.a IN-SCOPE: granted guest 가 deliverable INSERT 가능 (submission).
-- =========================================================================

DROP POLICY IF EXISTS deliverables_guest_insert ON project_deliverables;
CREATE POLICY deliverables_guest_insert
ON project_deliverables
FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_deliverables.project_id
      AND is_project_guest(p.id, auth.uid())
  )
);

COMMENT ON POLICY deliverables_guest_insert ON project_deliverables IS
  'A.2.a: granted project 의 guest 가 deliverable INSERT 가능. submitted_by binding. is_project_guest helper 만 사용 (kickoff §7 #3).';
