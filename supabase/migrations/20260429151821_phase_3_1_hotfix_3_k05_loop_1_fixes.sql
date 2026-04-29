-- Phase 3.1 hotfix-3 K-05 Loop 1 fixes
-- HIGH-A #1: Fix owner_id -> created_by in all 4 new attachment RPCs
--            AND add auth gate to seed_project_board_from_wizard 5-arg overload
-- HIGH-A #2: Restrict project_boards_update_client policy to exclude
--            attached_pdfs, attached_urls, asset_index (attachment writes via RPC only)

-- ============================================================
-- FIX HIGH-A #1a: add_project_board_pdf — owner_id -> created_by
-- ============================================================
CREATE OR REPLACE FUNCTION add_project_board_pdf(
  p_board_id    uuid,
  p_storage_key text,
  p_filename    text,
  p_size_bytes  bigint
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_project_id uuid;
  v_is_locked  boolean;
  v_is_admin   boolean;
  v_new_id     uuid := gen_random_uuid();
  v_pdf_count  int;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
  END IF;

  SELECT pb.project_id, pb.is_locked
  INTO v_project_id, v_is_locked
  FROM project_boards pb
  WHERE pb.id = p_board_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'add_project_board_pdf: board not found';
  END IF;

  v_is_admin := is_yagi_admin(v_caller_id);
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = v_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
  END IF;

  IF v_is_locked AND NOT v_is_admin THEN
    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
  END IF;

  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
  FROM project_boards WHERE id = p_board_id;
  IF v_pdf_count >= 30 THEN
    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
  END IF;

  IF p_size_bytes > 20 * 1024 * 1024 THEN
    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
  END IF;

  IF p_filename IS NULL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
  END IF;

  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/'
    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
  END IF;

  UPDATE project_boards
  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
    'id', v_new_id::text,
    'storage_key', p_storage_key,
    'filename', p_filename,
    'size_bytes', p_size_bytes,
    'uploaded_at', now()::text,
    'uploaded_by', v_caller_id::text
  )), updated_at = now()
  WHERE id = p_board_id;

  RETURN v_new_id;
END;
$$;

-- ============================================================
-- FIX HIGH-A #1b: add_project_board_url — owner_id -> created_by
-- (jsonb fix in subsequent migration 20260429151910)
-- ============================================================
CREATE OR REPLACE FUNCTION add_project_board_url(
  p_board_id      uuid,
  p_url           text,
  p_title         text,
  p_thumbnail_url text,
  p_provider      text,
  p_note          text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_project_id uuid;
  v_is_locked  boolean;
  v_is_admin   boolean;
  v_new_id     uuid := gen_random_uuid();
  v_url_count  int;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
  END IF;

  SELECT pb.project_id, pb.is_locked
  INTO v_project_id, v_is_locked
  FROM project_boards pb
  WHERE pb.id = p_board_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'add_project_board_url: board not found';
  END IF;

  v_is_admin := is_yagi_admin(v_caller_id);
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = v_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'add_project_board_url: unauthorized';
  END IF;

  IF v_is_locked AND NOT v_is_admin THEN
    RAISE EXCEPTION 'add_project_board_url: board is locked';
  END IF;

  SELECT jsonb_array_length(attached_urls) INTO v_url_count
  FROM project_boards WHERE id = p_board_id;
  IF v_url_count >= 50 THEN
    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
  END IF;

  IF p_url IS NULL OR length(p_url) = 0 OR length(p_url) > 2000 THEN
    RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
  END IF;

  IF p_url NOT LIKE 'http://%' AND p_url NOT LIKE 'https://%' THEN
    RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
  END IF;

  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
  END IF;

  UPDATE project_boards
  SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
    'id',            v_new_id::text,
    'url',           p_url,
    'title',         to_jsonb(p_title),
    'thumbnail_url', to_jsonb(p_thumbnail_url),
    'provider',      COALESCE(p_provider, 'generic'),
    'note',          to_jsonb(p_note),
    'added_at',      now()::text,
    'added_by',      v_caller_id::text
  )), updated_at = now()
  WHERE id = p_board_id;

  RETURN v_new_id;
END;
$$;

-- ============================================================
-- FIX HIGH-A #1c: remove_project_board_attachment — owner_id -> created_by
-- ============================================================
CREATE OR REPLACE FUNCTION remove_project_board_attachment(
  p_board_id      uuid,
  p_kind          text,
  p_attachment_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_project_id uuid;
  v_is_locked  boolean;
  v_is_admin   boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'remove_project_board_attachment: unauthenticated';
  END IF;

  SELECT pb.project_id, pb.is_locked
  INTO v_project_id, v_is_locked
  FROM project_boards pb
  WHERE pb.id = p_board_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'remove_project_board_attachment: board not found';
  END IF;

  v_is_admin := is_yagi_admin(v_caller_id);
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = v_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
  END IF;

  IF v_is_locked AND NOT v_is_admin THEN
    RAISE EXCEPTION 'remove_project_board_attachment: board is locked';
  END IF;

  IF p_kind = 'pdf' THEN
    UPDATE project_boards
    SET attached_pdfs = (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(attached_pdfs) elem
      WHERE (elem->>'id') != p_attachment_id::text
    ), updated_at = now()
    WHERE id = p_board_id;
  ELSIF p_kind = 'url' THEN
    UPDATE project_boards
    SET attached_urls = (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(attached_urls) elem
      WHERE (elem->>'id') != p_attachment_id::text
    ), updated_at = now()
    WHERE id = p_board_id;
  ELSE
    RAISE EXCEPTION 'remove_project_board_attachment: invalid kind (must be pdf or url)';
  END IF;

  RETURN true;
END;
$$;

-- ============================================================
-- FIX HIGH-A #1d: update_project_board_url_note — owner_id -> created_by
-- ============================================================
CREATE OR REPLACE FUNCTION update_project_board_url_note(
  p_board_id      uuid,
  p_attachment_id uuid,
  p_note          text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_project_id uuid;
  v_is_locked  boolean;
  v_is_admin   boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'update_project_board_url_note: unauthenticated';
  END IF;

  SELECT pb.project_id, pb.is_locked
  INTO v_project_id, v_is_locked
  FROM project_boards pb
  WHERE pb.id = p_board_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_project_board_url_note: board not found';
  END IF;

  v_is_admin := is_yagi_admin(v_caller_id);
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = v_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'update_project_board_url_note: unauthorized';
  END IF;

  IF v_is_locked AND NOT v_is_admin THEN
    RAISE EXCEPTION 'update_project_board_url_note: board is locked';
  END IF;

  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
    RAISE EXCEPTION 'update_project_board_url_note: note too long (max 500 chars)';
  END IF;

  UPDATE project_boards
  SET attached_urls = (
    SELECT jsonb_agg(
      CASE
        WHEN (elem->>'id') = p_attachment_id::text
        THEN jsonb_set(elem, '{note}', COALESCE(to_jsonb(p_note), 'null'::jsonb))
        ELSE elem
      END
    )
    FROM jsonb_array_elements(attached_urls) elem
  ), updated_at = now()
  WHERE id = p_board_id;

  RETURN true;
END;
$$;

-- ============================================================
-- FIX HIGH-A #1e: seed_project_board_from_wizard (5-arg) — add auth gate
-- ============================================================
CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  p_project_id            uuid,
  p_initial_document      jsonb,
  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_board_id       uuid;
  v_project_status text;
  v_caller_id      uuid := auth.uid();
BEGIN
  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
  END IF;

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

  INSERT INTO project_boards (
    project_id, document, attached_pdfs, attached_urls, asset_index, source
  )
  VALUES (
    p_project_id, p_initial_document, p_initial_attached_pdfs,
    p_initial_attached_urls, p_initial_asset_index, 'wizard_seed'
  )
  ON CONFLICT (project_id) DO UPDATE
    SET document      = EXCLUDED.document,
        attached_pdfs = EXCLUDED.attached_pdfs,
        attached_urls = EXCLUDED.attached_urls,
        asset_index   = EXCLUDED.asset_index,
        source        = 'wizard_seed',
        updated_at    = now()
  RETURNING id INTO v_board_id;

  RETURN v_board_id;
END;
$$;

-- ============================================================
-- FIX HIGH-A #2: Restrict project_boards_update_client policy +
--                REVOKE direct column UPDATE on attachment/index columns
-- ============================================================
DROP POLICY IF EXISTS project_boards_update_client ON project_boards;

CREATE POLICY project_boards_update_client ON project_boards
  FOR UPDATE
  USING (
    is_yagi_admin(auth.uid())
    OR (
      is_locked = false
      AND project_id IN (
        SELECT p.id FROM projects p
        WHERE p.workspace_id IN (
          SELECT workspace_members.workspace_id
          FROM workspace_members
          WHERE workspace_members.user_id = auth.uid()
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
          SELECT workspace_members.workspace_id
          FROM workspace_members
          WHERE workspace_members.user_id = auth.uid()
        )
      )
    )
  );

REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
