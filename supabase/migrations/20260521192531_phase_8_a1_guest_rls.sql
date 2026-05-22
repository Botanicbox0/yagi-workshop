-- Phase 8 Wave A.1 — Guest scope RLS for project_guests + 6 child tables
-- §AJ Q#7 RESOLVED + Q#7 schema migration 20260521184035 의 후속.
-- PRODUCT-MASTER v1.11 §AK Phase 8 Surface Ship 의 prerequisite.
--
-- Scope: project_guests 4 policies (SELECT 2 branch + INSERT + DELETE) +
--        6 child table SELECT-only OR-branches (projects / project_threads /
--        thread_messages / project_deliverables / preprod_boards /
--        briefing_documents).
--
-- Out of scope (Wave B/C 후보):
--   - thread_messages WRITE permission for guests
--   - project_deliverables INSERT for guests
--   - preprod_frame_comments / preprod_frame_reactions
--   - briefing_documents Pattern C → helper-style sweep
--   - child table deleted_at IS NULL gate sweep (현재 ws_member 도 미체크)
--
-- Defensive pattern: DROP POLICY IF EXISTS + CREATE POLICY per kickoff §4 G3.
-- 기존 admin/member RLS policies 일체 비변경 (kickoff §7 #1 forbid).

-- =========================================================================
-- 1. project_guests 자체 RLS — 4 policies
--    UPDATE 정책 의도적 미생성 (granted_at/granted_by immutable per Q#7).
-- =========================================================================

DROP POLICY IF EXISTS project_guests_select_guest_self ON project_guests;
CREATE POLICY project_guests_select_guest_self
ON project_guests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.id = project_guests.workspace_member_id
      AND wm.user_id = auth.uid()
  )
);

COMMENT ON POLICY project_guests_select_guest_self ON project_guests IS
  'A.1: guest 본인이 자신의 grant rows를 조회 가능. wm.user_id check 로 본인 row만.';

DROP POLICY IF EXISTS project_guests_select_admin ON project_guests;
CREATE POLICY project_guests_select_admin
ON project_guests
FOR SELECT
TO authenticated
USING (
  is_yagi_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_guests.project_id
      AND is_ws_admin(auth.uid(), p.workspace_id)
  )
);

COMMENT ON POLICY project_guests_select_admin ON project_guests IS
  'A.1: yagi_admin 또는 project 소속 workspace_admin 이 grant rows 조회 가능 (운영용).';

DROP POLICY IF EXISTS project_guests_insert_admin ON project_guests;
CREATE POLICY project_guests_insert_admin
ON project_guests
FOR INSERT
TO authenticated
WITH CHECK (
  is_yagi_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_guests.project_id
      AND is_ws_admin(auth.uid(), p.workspace_id)
  )
);

COMMENT ON POLICY project_guests_insert_admin ON project_guests IS
  'A.1: yagi_admin 또는 project 소속 workspace_admin 만 grant 생성 가능.';

DROP POLICY IF EXISTS project_guests_delete_admin ON project_guests;
CREATE POLICY project_guests_delete_admin
ON project_guests
FOR DELETE
TO authenticated
USING (
  is_yagi_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_guests.project_id
      AND is_ws_admin(auth.uid(), p.workspace_id)
  )
);

COMMENT ON POLICY project_guests_delete_admin ON project_guests IS
  'A.1: yagi_admin 또는 project 소속 workspace_admin 만 grant 철회 가능. ON DELETE CASCADE 로 wm 또는 project 삭제 시 자동 정리도 발생.';

-- =========================================================================
-- 2. projects — guest SELECT OR-branch (deleted_at 가드 포함)
--    projects_read (ws_member + yagi_admin) 비변경, 신규 permissive policy 추가.
-- =========================================================================

DROP POLICY IF EXISTS projects_guest_select ON projects;
CREATE POLICY projects_guest_select
ON projects
FOR SELECT
TO authenticated
USING (
  is_project_guest(id, auth.uid())
  AND deleted_at IS NULL
);

COMMENT ON POLICY projects_guest_select ON projects IS
  'A.1: project_guests 에 grant 된 project 만 guest 조회 가능. soft-deleted project 제외 (ws_member behavior mirror).';

-- =========================================================================
-- 3. project_threads — guest SELECT OR-branch (EXISTS join to projects)
-- =========================================================================

DROP POLICY IF EXISTS proj_threads_guest_select ON project_threads;
CREATE POLICY proj_threads_guest_select
ON project_threads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_threads.project_id
      AND is_project_guest(p.id, auth.uid())
  )
);

COMMENT ON POLICY proj_threads_guest_select ON project_threads IS
  'A.1: granted project 의 thread 만 guest 조회 가능.';

-- =========================================================================
-- 4. thread_messages — guest SELECT OR-branch
--    NOTE: 기존 restrictive policy thread_msgs_hide_internal_from_clients
--    가 그대로 적용 → guest 는 visibility=''shared'' 만 visible 자동 inherit.
--    별도 visibility 가드 작성 불필요.
-- =========================================================================

DROP POLICY IF EXISTS thread_msgs_guest_select ON thread_messages;
CREATE POLICY thread_msgs_guest_select
ON thread_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_threads t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = thread_messages.thread_id
      AND is_project_guest(p.id, auth.uid())
  )
);

COMMENT ON POLICY thread_msgs_guest_select ON thread_messages IS
  'A.1: granted project 의 thread message 만 guest 조회 가능. 기존 restrictive thread_msgs_hide_internal_from_clients (visibility=shared OR is_yagi_admin OR author=self) 가 ANDed → guest 는 사실상 visibility=shared (or self-authored) 만 보임.';

-- =========================================================================
-- 5. project_deliverables — guest SELECT OR-branch
-- =========================================================================

DROP POLICY IF EXISTS deliverables_guest_select ON project_deliverables;
CREATE POLICY deliverables_guest_select
ON project_deliverables
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_deliverables.project_id
      AND is_project_guest(p.id, auth.uid())
  )
);

COMMENT ON POLICY deliverables_guest_select ON project_deliverables IS
  'A.1: granted project 의 deliverable 만 guest 조회 가능. WRITE 권한 없음 (Wave B 후보).';

-- =========================================================================
-- 6. preprod_boards — guest SELECT OR-branch (roles {public} match)
--    기존 4 policy 가 roles {public} 이라 신규도 {public} 으로 convention 유지.
-- =========================================================================

DROP POLICY IF EXISTS preprod_boards_guest_select ON preprod_boards;
CREATE POLICY preprod_boards_guest_select
ON preprod_boards
FOR SELECT
TO public
USING (
  is_project_guest(project_id, auth.uid())
);

COMMENT ON POLICY preprod_boards_guest_select ON preprod_boards IS
  'A.1: granted project 의 preprod_board 만 guest 조회 가능. roles {public} 은 기존 4 policy convention match (behavior 동일 — auth.uid() 가 anon 일 때 is_project_guest false).';

-- =========================================================================
-- 7. briefing_documents — guest SELECT OR-branch
--    기존 briefing_documents_select 가 Pattern C (legacy inline join + raw
--    profiles.role check). 본 wave 에서는 신규 helper-style policy 만 추가,
--    기존 legacy 비변경. Wave B sweep candidate.
-- =========================================================================

DROP POLICY IF EXISTS briefing_documents_guest_select ON briefing_documents;
CREATE POLICY briefing_documents_guest_select
ON briefing_documents
FOR SELECT
TO authenticated
USING (
  is_project_guest(project_id, auth.uid())
);

COMMENT ON POLICY briefing_documents_guest_select ON briefing_documents IS
  'A.1: granted project 의 briefing document 만 guest 조회 가능. 기존 briefing_documents_select (Pattern C legacy) 는 비변경 — Wave B sweep 후보 (FU register).';
