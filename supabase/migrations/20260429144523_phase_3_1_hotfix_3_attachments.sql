-- Phase 3.1 hotfix-3: attached_pdfs + attached_urls columns + 4 attachment RPCs + extend seed RPC
-- Execution: additive only -- ALTER TABLE ADD COLUMN IF NOT EXISTS with safe defaults
-- Recorded version: to be confirmed via L-021 after MCP apply_migration

-- ============================================================
-- Schema changes: add attachment columns to project_boards
-- ============================================================
ALTER TABLE project_boards
  ADD COLUMN IF NOT EXISTS attached_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attached_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- RPC: add_project_board_pdf
-- Appends a PDF attachment entry to project_boards.attached_pdfs.
-- Validates: caller ownership OR yagi_admin, lock state, count cap (30),
-- size cap (20MB), filename length (200), storage_key prefix.
-- SECURITY DEFINER, search_path locked to public, pg_temp.
-- Does NOT update asset_index (that is server action layer responsibility).
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
  -- Fetch board meta
  SELECT pb.project_id, pb.is_locked
  INTO v_project_id, v_is_locked
  FROM project_boards pb
  WHERE pb.id = p_board_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'add_project_board_pdf: board not found';
  END IF;

  -- Role check: owner OR yagi_admin
  v_is_admin := is_yagi_admin(v_caller_id);
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = v_project_id AND p.owner_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
  END IF;

  -- Lock check: block non-admin mutations on locked board
  IF v_is_locked AND NOT v_is_admin THEN
    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
  END IF;

  -- Count cap: max 30 PDFs
  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
  FROM project_boards WHERE id = p_board_id;
  IF v_pdf_count >= 30 THEN
    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
  END IF;

  -- Size cap: max 20MB
  IF p_size_bytes > 20 * 1024 * 1024 THEN
    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
  END IF;

  -- Filename length
  IF p_filename IS NULL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
  END IF;

  -- Storage key prefix validation: no path traversal, no absolute path, must start with known prefix
  IF p_storage_key IS NULL
    OR p_storage_key LIKE '%..%'
    OR left(p_storage_key, 1) = '/'
    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
  END IF;

  -- Append entry using jsonb_build_object (no string concatenation)
  UPDATE project_boards
  SET
    attached_pdfs = attached_pdfs || jsonb_build_array(
      jsonb_build_object(
        'id',          v_new_id::text,
        'storage_key', p_storage_key,
        'filename',    p_filename,
        'size_bytes',  p_size_bytes,
        'uploaded_at', now()::text,
        'uploaded_by', v_caller_id::text
      )
    ),
    updated_at = now()
  WHERE id = p_board_id;

  RETURN v_new_id;
END;
$$;

-- ============================================================
-- RPC: add_project_board_url
-- Appends a URL attachment entry to project_boards.attached_urls.
-- Validates: caller ownership OR yagi_admin, lock state, count cap (50),
-- URL scheme (http/https only), URL length (2000), note length (500),
-- provider enum (youtube/vimeo/generic).
-- SECURITY DEFINER, search_path locked to public, pg_temp.
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
    WHERE p.id = v_project_id AND p.owner_id = v_caller_id
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

  -- URL validation: http/https only, max 2000 chars
  -- Explicitly rejects javascript:, data:, file:, chrome:, etc.
  IF p_url IS NULL
    OR length(p_url) > 2000
    OR (p_url NOT LIKE 'http://%' AND p_url NOT LIKE 'https://%') THEN
    RAISE EXCEPTION 'add_project_board_url: invalid URL (must be http:// or https://, max 2000 chars)';
  END IF;

  -- Note length
  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
  END IF;

  -- Provider enum validation
  IF p_provider IS NULL OR p_provider NOT IN ('youtube', 'vimeo', 'generic') THEN
    RAISE EXCEPTION 'add_project_board_url: provider must be youtube, vimeo, or generic';
  END IF;

  UPDATE project_boards
  SET
    attached_urls = attached_urls || jsonb_build_array(
      jsonb_build_object(
        'id',            v_new_id::text,
        'url',           p_url,
        'title',         p_title,
        'thumbnail_url', p_thumbnail_url,
        'provider',      p_provider,
        'note',          p_note,
        'added_at',      now()::text,
        'added_by',      v_caller_id::text
      )
    ),
    updated_at = now()
  WHERE id = p_board_id;

  RETURN v_new_id;
END;
$$;

-- ============================================================
-- RPC: remove_project_board_attachment
-- Removes an attachment by id from attached_pdfs or attached_urls.
-- kind must be 'pdf' or 'url'.
-- Validates: caller ownership OR yagi_admin, lock state.
-- Normalizes null back to empty array if all items removed.
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
    WHERE p.id = v_project_id AND p.owner_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
  END IF;

  IF v_is_locked AND NOT v_is_admin THEN
    RAISE EXCEPTION 'remove_project_board_attachment: board is locked';
  END IF;

  IF p_kind NOT IN ('pdf', 'url') THEN
    RAISE EXCEPTION 'remove_project_board_attachment: kind must be pdf or url';
  END IF;

  IF p_kind = 'pdf' THEN
    UPDATE project_boards
    SET
      attached_pdfs = COALESCE(
        (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(attached_pdfs) elem
          WHERE (elem->>'id') <> p_attachment_id::text
        ),
        '[]'::jsonb
      ),
      updated_at = now()
    WHERE id = p_board_id;
  ELSE
    UPDATE project_boards
    SET
      attached_urls = COALESCE(
        (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(attached_urls) elem
          WHERE (elem->>'id') <> p_attachment_id::text
        ),
        '[]'::jsonb
      ),
      updated_at = now()
    WHERE id = p_board_id;
  END IF;

  RETURN true;
END;
$$;

-- ============================================================
-- RPC: update_project_board_url_note
-- Updates the note field of a URL attachment (URL itself is immutable).
-- Validates: caller ownership OR yagi_admin, lock state, note length (500).
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
    WHERE p.id = v_project_id AND p.owner_id = v_caller_id
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
  SET
    attached_urls = (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'id') = p_attachment_id::text
          THEN jsonb_set(elem, '{note}', COALESCE(to_jsonb(p_note), 'null'::jsonb))
          ELSE elem
        END
      )
      FROM jsonb_array_elements(attached_urls) elem
    ),
    updated_at = now()
  WHERE id = p_board_id;

  RETURN true;
END;
$$;

-- ============================================================
-- RPC: seed_project_board_from_wizard (EXTEND signature)
-- Adds p_initial_attached_pdfs, p_initial_attached_urls, p_initial_asset_index
-- with DEFAULT empty array for backward compatibility with Phase 3.1 callers.
-- Existing logic preserved (project must be in_review, UPSERT on project_id).
-- ============================================================
CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  p_project_id           uuid,
  p_initial_document     jsonb,
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

  INSERT INTO project_boards (
    project_id,
    document,
    attached_pdfs,
    attached_urls,
    asset_index,
    source
  )
  VALUES (
    p_project_id,
    p_initial_document,
    p_initial_attached_pdfs,
    p_initial_attached_urls,
    p_initial_asset_index,
    'wizard_seed'
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
