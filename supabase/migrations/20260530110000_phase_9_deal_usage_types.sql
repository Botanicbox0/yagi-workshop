-- Phase 9 — Deal usage types.
--
-- PRODUCT-MASTER §AT / Discovery UI:
--   - Brand proposals must include at least one intended usage type.
--   - usage_types is visible through the existing deals RLS surface only.
--   - No new RLS policies in this migration.

ALTER TABLE public.deals
  ADD COLUMN usage_types text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.deals
  ADD CONSTRAINT deals_usage_types_allowed
  CHECK (
    usage_types <@ ARRAY[
      'social_sns',
      'tv_commercial',
      'ooh',
      'web_display',
      'print',
      'brand_film'
    ]::text[]
  );

COMMENT ON COLUMN public.deals.usage_types IS
  'Phase 9 Discovery UI: requested campaign usage surfaces. Allowed values: social_sns, tv_commercial, ooh, web_display, print, brand_film.';

DROP FUNCTION IF EXISTS public.create_deal(uuid, uuid, text, numeric);

CREATE OR REPLACE FUNCTION public.create_deal(
  p_persona_id uuid,
  p_brand_workspace_id uuid,
  p_brief text DEFAULT NULL,
  p_proposed_budget numeric DEFAULT NULL,
  p_usage_types text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_artist_workspace_id uuid;
  v_persona_name text;
  v_deal_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_persona_id IS NULL OR p_brand_workspace_id IS NULL THEN
    RAISE EXCEPTION 'invalid_null_argument' USING ERRCODE = '22023';
  END IF;

  IF array_length(p_usage_types, 1) IS NULL THEN
    RAISE EXCEPTION 'usage_types_required' USING ERRCODE = '22023';
  END IF;

  IF p_proposed_budget IS NOT NULL AND p_proposed_budget < 0 THEN
    RAISE EXCEPTION 'proposed_budget_must_be_nonnegative'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_brand_workspace_id
      AND w.kind = 'brand'
  ) THEN
    RAISE EXCEPTION 'brand_workspace_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_ws_member(v_actor_id, p_brand_workspace_id) THEN
    RAISE EXCEPTION 'forbidden: brand workspace member required'
      USING ERRCODE = '42501';
  END IF;

  SELECT tp.artist_workspace_id, tp.name
    INTO v_artist_workspace_id, v_persona_name
    FROM public.twin_personas tp
   WHERE tp.id = p_persona_id
     AND tp.status = 'active'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_persona_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.deals (
    persona_id,
    artist_workspace_id,
    brand_workspace_id,
    status,
    payment_status,
    brief,
    proposed_budget,
    usage_types,
    persona_name_snapshot,
    created_by
  ) VALUES (
    p_persona_id,
    v_artist_workspace_id,
    p_brand_workspace_id,
    'submitted',
    'pending',
    p_brief,
    p_proposed_budget,
    p_usage_types,
    v_persona_name,
    v_actor_id
  )
  RETURNING id INTO v_deal_id;

  INSERT INTO public.deal_status_history (
    deal_id,
    from_status,
    to_status,
    actor_id,
    actor_role,
    comment
  ) VALUES (
    v_deal_id,
    NULL,
    'submitted',
    v_actor_id,
    'brand',
    NULL
  );

  RETURN v_deal_id;
END;
$$;

COMMENT ON FUNCTION public.create_deal(uuid, uuid, text, numeric, text[]) IS
  'Phase 9 SECURITY DEFINER RPC. Brand workspace members create submitted deals against active personas only; usage_types is required for Discovery proposals.';

REVOKE ALL ON FUNCTION public.create_deal(uuid, uuid, text, numeric, text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_deal(uuid, uuid, text, numeric, text[])
  TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deals'
      AND column_name = 'usage_types'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'deals usage_types assert failed: column missing or nullable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deals_usage_types_allowed'
      AND conrelid = 'public.deals'::regclass
  ) THEN
    RAISE EXCEPTION 'deals usage_types assert failed: CHECK missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_deal'
      AND pg_get_function_identity_arguments(p.oid) = 'p_persona_id uuid, p_brand_workspace_id uuid, p_brief text, p_proposed_budget numeric'
  ) THEN
    RAISE EXCEPTION 'create_deal assert failed: old 4-arg overload still exists';
  END IF;

  IF has_function_privilege('anon', 'public.create_deal(uuid, uuid, text, numeric, text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'create_deal grant assert failed: anon can execute';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.create_deal(uuid, uuid, text, numeric, text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'create_deal grant assert failed: authenticated cannot execute';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_deal'
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=public']
  ) THEN
    RAISE EXCEPTION 'create_deal assert failed: SECURITY DEFINER search_path not locked';
  END IF;
END $$;
