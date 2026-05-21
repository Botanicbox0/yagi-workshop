-- §AJ Q#7 LOCKED (PRODUCT-MASTER v1.11, 2026-05-22)
-- Phase 8 Wave A prerequisite — guest role + project-scoped permission infra
--
-- Applied to production via Supabase MCP apply_migration on 2026-05-22 (Web Claude path).
-- Verified (Wave C v2 partial-apply 사고 학습): CHECK 확장 / table+RLS / FK+UNIQUE / function — 4/4 pass.
--
-- Out of scope (deferred to Phase 8 Wave A spec, separate migration):
--   - RLS policies on project_guests table itself
--   - Guest read access policies on projects / project_threads / project_deliverables / preprod_boards / etc.
--   - Guest invite UI flow (workspace_invitations.role = 'guest' branch)
--   - Curated Project 생성 server action

-- 1. workspace_members.role CHECK 확장
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'guest'::text]));

-- 2. workspace_invitations.role CHECK 확장 (guest invite flow 위해 동시 확장)
ALTER TABLE workspace_invitations DROP CONSTRAINT IF EXISTS workspace_invitations_role_check;
ALTER TABLE workspace_invitations ADD CONSTRAINT workspace_invitations_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'guest'::text]));

-- 3. project_guests 테이블 신설 (N:M 매핑, project-scoped permission)
CREATE TABLE IF NOT EXISTS project_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES profiles(id),
  UNIQUE (workspace_member_id, project_id)
);

COMMENT ON TABLE project_guests IS
  'Phase 8 Wave A prerequisite (§AJ Q#7) — project-scoped permission for workspace_members.role = ''guest''. Workspace-wide 권한 없음. Curated Project + 외부 협업자 invite flow의 backbone.';

COMMENT ON COLUMN project_guests.granted_by IS
  'Nullable to allow yagi_admin auto-grant flows (system actor). Set to inviter profile.id when grant originates from explicit invitation.';

ALTER TABLE project_guests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS project_guests_project_id_idx ON project_guests(project_id);
CREATE INDEX IF NOT EXISTS project_guests_workspace_member_id_idx ON project_guests(workspace_member_id);

-- 4. Helper function: is_project_guest(project_id, user_id)
CREATE OR REPLACE FUNCTION is_project_guest(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_guests pg
    JOIN workspace_members wm ON wm.id = pg.workspace_member_id
    WHERE pg.project_id = p_project_id
      AND wm.user_id = p_user_id
      AND wm.role = 'guest'
  );
$$;

COMMENT ON FUNCTION is_project_guest(uuid, uuid) IS
  'Phase 8 Wave A prerequisite (§AJ Q#7) — returns true iff user_id is a guest with grant on project_id. Use in RLS policies (projects, threads, deliverables, etc.) added in Phase 8 Wave A spec.';
