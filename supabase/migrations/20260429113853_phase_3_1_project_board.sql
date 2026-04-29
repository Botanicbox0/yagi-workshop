-- Phase 3.1: project_boards + project_board_versions + 3 RPCs + RLS
-- Execution: additive only -- no existing tables modified
-- Recorded version: 20260429113853 (per L-021 MCP timestamp rename)

-- ============================================================
-- Table: project_boards
-- ============================================================
CREATE TABLE IF NOT EXISTS project_boards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  document        jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version  int  NOT NULL DEFAULT 1,
  asset_index     jsonb NOT NULL DEFAULT '[]'::jsonb,
  source          text NOT NULL CHECK (source IN ('wizard_seed', 'admin_init', 'migrated')),
  is_locked       boolean NOT NULL DEFAULT false,
  locked_by       uuid REFERENCES profiles(id),
  locked_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: project_board_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS project_board_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    uuid NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  version     int  NOT NULL,
  document    jsonb NOT NULL,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  label       text,
  UNIQUE (board_id, version)
);

CREATE INDEX IF NOT EXISTS idx_project_board_versions_board_version
  ON project_board_versions (board_id, version DESC);

-- ============================================================
-- RLS: project_boards
-- ============================================================
ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_boards_select_client ON project_boards
  FOR SELECT
  USING (
    is_yagi_admin(auth.uid())
    OR project_id IN (
      SELECT p.id FROM projects p
      WHERE p.workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY project_boards_insert_via_rpc ON project_boards
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY project_boards_update_client ON project_boards
  FOR UPDATE
  USING (
    is_yagi_admin(auth.uid())
    OR (
      is_locked = false
      AND project_id IN (
        SELECT p.id FROM projects p
        WHERE p.workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    is_yagi_admin(auth.uid())
    OR (
      is_locked = false
      AND project_id IN (
        SELECT p.id FROM projects p
        WHERE p.workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- ============================================================
-- RLS: project_board_versions
-- ============================================================
ALTER TABLE project_board_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_board_versions_select ON project_board_versions
  FOR SELECT
  USING (
    is_yagi_admin(auth.uid())
    OR board_id IN (
      SELECT pb.id FROM project_boards pb
      WHERE pb.project_id IN (
        SELECT p.id FROM projects p
        WHERE p.workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY project_board_versions_insert_trigger ON project_board_versions
  FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- RPC: seed_project_board_from_wizard
-- ============================================================
CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  p_project_id      uuid,
  p_initial_document jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
  v_project_status text;
BEGIN
  SELECT status INTO v_project_status
  FROM projects
  WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'project not found: %', p_project_id;
  END IF;

  IF v_project_status != 'in_review' THEN
    RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
      p_project_id, v_project_status;
  END IF;

  INSERT INTO project_boards (project_id, document, source)
  VALUES (p_project_id, p_initial_document, 'wizard_seed')
  ON CONFLICT (project_id) DO UPDATE
    SET document   = EXCLUDED.document,
        source     = 'wizard_seed',
        updated_at = now()
  RETURNING id INTO v_board_id;

  RETURN v_board_id;
END;
$$;

-- ============================================================
-- RPC: init_project_board
-- ============================================================
CREATE OR REPLACE FUNCTION init_project_board(
  p_project_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
BEGIN
  IF NOT is_yagi_admin(auth.uid()) THEN
    RAISE EXCEPTION 'init_project_board: caller must be yagi_admin';
  END IF;

  INSERT INTO project_boards (project_id, document, source)
  VALUES (p_project_id, '{}'::jsonb, 'admin_init')
  ON CONFLICT (project_id) DO UPDATE
    SET updated_at = now()
  RETURNING id INTO v_board_id;

  RETURN v_board_id;
END;
$$;

-- ============================================================
-- RPC: toggle_project_board_lock
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_project_board_lock(
  p_board_id uuid,
  p_locked   boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_yagi_admin(auth.uid()) THEN
    RAISE EXCEPTION 'toggle_project_board_lock: caller must be yagi_admin';
  END IF;

  UPDATE project_boards
  SET
    is_locked  = p_locked,
    locked_by  = CASE WHEN p_locked THEN auth.uid() ELSE NULL END,
    locked_at  = CASE WHEN p_locked THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_board_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_board not found: %', p_board_id;
  END IF;
END;
$$;

-- ============================================================
-- One-time back-fill: every existing project gets a board row
-- ============================================================
INSERT INTO project_boards (project_id, document, source)
SELECT id, '{}'::jsonb, 'migrated'
FROM projects
WHERE id NOT IN (SELECT project_id FROM project_boards)
ON CONFLICT (project_id) DO NOTHING;
