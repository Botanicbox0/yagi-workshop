-- Wave C.5d sub_03f_1 + sub_03f_5 F2 — allow `board-assets/` prefix on
-- add_project_board_pdf with caller-bound prefix checks.
--
-- Background: getBoardAssetPutUrlAction (Phase 3.0) generates a
-- server-side R2 upload key shaped like `board-assets/<user>/<uuid>.<ext>`
-- and presigns a PUT URL against that key. The earlier
-- add_project_board_pdf RPC validation only accepted `project-wizard/%`
-- and `project-board/%` prefixes, which forced the wizard client to
-- prepend a literal "project-wizard" segment in front of the real key
-- before persisting it through the RPC. The persisted key
-- (`project-wizard/board-assets/<user>/<uuid>.<ext>`) did not exist in
-- R2 and broke PDF retrieval from both the project board and the admin
-- asset-list panel.
--
-- This migration:
--   1. Extends the validation allowlist to include `board-assets/%`,
--      so the wizard can write the bare R2 key.
--   2. (sub_03f_5 F2) Binds every accepted prefix to the caller's own
--      identity so a malicious authenticated user cannot persist another
--      user's R2 key (or another board's project-board/ key) via this
--      RPC. Prefix-to-binding map:
--        - `board-assets/<auth.uid()>/...`
--        - `project-wizard/<auth.uid()>/...`
--        - `project-board/<p_board_id>/...`
--      Anything else under those prefixes is rejected.
--
-- Production audit at sub_03f_1 apply time: 0 broken-prefix entries
-- persisted in attached_pdfs, so no backfill is required.

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

  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (null/traversal/leading slash)';
  END IF;

  -- sub_03f_5 F2: every accepted prefix is caller-bound. The role-bound
  -- prefixes use auth.uid() to prevent persisting another authenticated
  -- user's R2 key; the project-board prefix is bound to p_board_id so it
  -- cannot be cross-board persisted. Anything else is rejected.
  IF NOT (
    p_storage_key LIKE 'board-assets/' || v_caller_id::text || '/%'
    OR p_storage_key LIKE 'project-wizard/' || v_caller_id::text || '/%'
    OR p_storage_key LIKE 'project-board/' || p_board_id::text || '/%'
  ) THEN
    RAISE EXCEPTION 'add_project_board_pdf: storage_key prefix must be caller-bound (board-assets/<caller>/, project-wizard/<caller>/, or project-board/<p_board_id>/)';
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
