-- Phase 9 — Brand discoverable persona read function.
--
-- Scope:
--   - Simple active persona list only.
--   - No search/filter arguments.
--   - min_fee is masked unless min_fee_public = true.
--   - Does not expose twin_persona_assets or internal training columns.

CREATE OR REPLACE FUNCTION public.list_discoverable_personas()
RETURNS TABLE (
  id uuid,
  name text,
  persona_type text,
  description text,
  cover_asset_path text,
  status text,
  min_fee numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    JOIN public.workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = v_actor_id
      AND wm.role IN ('admin', 'member')
      AND w.kind = 'brand'
  ) THEN
    RAISE EXCEPTION 'forbidden: brand workspace member required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    tp.id AS id,
    tp.name AS name,
    tp.persona_type AS persona_type,
    tp.description AS description,
    tp.cover_asset_path AS cover_asset_path,
    tp.status AS status,
    CASE
      WHEN tp.min_fee_public THEN tp.min_fee
      ELSE NULL::numeric
    END AS min_fee
  FROM public.twin_personas tp
  WHERE tp.status = 'active'
  ORDER BY tp.created_at DESC, tp.id DESC;
END;
$$;

COMMENT ON FUNCTION public.list_discoverable_personas() IS
  'Phase 9 SECURITY DEFINER read function. Brand workspace members can list active personas; min_fee is masked when min_fee_public=false.';

REVOKE ALL ON FUNCTION public.list_discoverable_personas()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_discoverable_personas()
  TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.list_discoverable_personas()', 'EXECUTE') THEN
    RAISE EXCEPTION 'list_discoverable_personas grant assert failed: anon can execute';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.list_discoverable_personas()', 'EXECUTE') THEN
    RAISE EXCEPTION 'list_discoverable_personas grant assert failed: authenticated cannot execute';
  END IF;
END $$;
