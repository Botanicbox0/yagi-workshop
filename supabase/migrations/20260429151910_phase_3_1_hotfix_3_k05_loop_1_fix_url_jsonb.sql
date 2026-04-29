-- Phase 3.1 hotfix-3 K-05 Loop 1 fix — add_project_board_url jsonb correction
-- Use to_jsonb() for nullable text fields (title, thumbnail_url, note)
-- COALESCE with ::jsonb cast was broken for non-null string values.
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
