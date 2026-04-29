-- ============================================================
-- Phase 3.1 K-05 LOOP 1 fixes
-- HIGH-A F1: seed_project_board_from_wizard cross-tenant write prevention
--   - Reject anon callers (auth.uid() IS NULL)
--   - Require projects.created_by = auth.uid()
-- HIGH-B F5: support pre-computed asset_index seed (server-computed at submit)
-- ============================================================

-- Drop and recreate seed_project_board_from_wizard with auth gate + asset_index param
CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  p_project_id      uuid,
  p_initial_document jsonb,
  p_initial_asset_index jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
  v_project_status text;
  v_project_owner uuid;
  v_caller uuid;
BEGIN
  -- K-05 HIGH-A F1: reject anon callers and non-owners
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthenticated';
  END IF;

  SELECT status, created_by INTO v_project_status, v_project_owner
  FROM projects
  WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'project not found: %', p_project_id;
  END IF;

  -- K-05 HIGH-A F1: caller must own the project (cross-tenant write prevention)
  IF v_project_owner IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'seed_project_board_from_wizard: caller % does not own project %', v_caller, p_project_id;
  END IF;

  IF v_project_status != 'in_review' THEN
    RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
      p_project_id, v_project_status;
  END IF;

  INSERT INTO project_boards (project_id, document, asset_index, source)
  VALUES (p_project_id, p_initial_document, COALESCE(p_initial_asset_index, '[]'::jsonb), 'wizard_seed')
  ON CONFLICT (project_id) DO UPDATE
    SET document     = EXCLUDED.document,
        asset_index  = EXCLUDED.asset_index,
        source       = 'wizard_seed',
        updated_at   = now()
  RETURNING id INTO v_board_id;

  RETURN v_board_id;
END;
$$;

REVOKE ALL ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;
