-- Phase 9 — Deal RPCs.
--
-- Functions:
--   - create_deal()
--   - is_valid_deal_transition()
--   - transition_deal_status()
--   - record_deal_payment()
--
-- All RPCs are SECURITY DEFINER with search_path locked to public.

CREATE OR REPLACE FUNCTION public.create_deal(
  p_persona_id uuid,
  p_brand_workspace_id uuid,
  p_brief text DEFAULT NULL,
  p_proposed_budget numeric DEFAULT NULL
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

COMMENT ON FUNCTION public.create_deal(uuid, uuid, text, numeric) IS
  'Phase 9 SECURITY DEFINER RPC. Brand workspace members create submitted deals against active personas only.';

REVOKE ALL ON FUNCTION public.create_deal(uuid, uuid, text, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_deal(uuid, uuid, text, numeric)
  TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.create_deal(uuid, uuid, text, numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'create_deal grant assert failed: anon can execute';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.create_deal(uuid, uuid, text, numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'create_deal grant assert failed: authenticated cannot execute';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_valid_deal_transition(
  p_from text,
  p_to text,
  p_role text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_role = 'yagi_admin' THEN
      CASE
        WHEN p_from = 'submitted' AND p_to = 'offered' THEN true
        WHEN p_from = 'submitted' AND p_to = 'cancelled' THEN true
        WHEN p_from = 'offered' AND p_to = 'cancelled' THEN true
        WHEN p_from = 'negotiating' AND p_to = 'offered' THEN true
        WHEN p_from = 'negotiating' AND p_to = 'cancelled' THEN true
        ELSE false
      END
    WHEN p_role = 'brand' THEN
      CASE
        WHEN p_from = 'submitted' AND p_to = 'cancelled' THEN true
        WHEN p_from = 'offered' AND p_to = 'cancelled' THEN true
        WHEN p_from = 'negotiating' AND p_to = 'cancelled' THEN true
        ELSE false
      END
    WHEN p_role = 'artist' THEN
      CASE
        WHEN p_from = 'offered' AND p_to = 'negotiating' THEN true
        WHEN p_from = 'offered' AND p_to = 'accepted' THEN true
        WHEN p_from = 'offered' AND p_to = 'declined' THEN true
        WHEN p_from = 'negotiating' AND p_to = 'declined' THEN true
        ELSE false
      END
    WHEN p_role = 'system' THEN
      CASE
        WHEN p_from = 'accepted' AND p_to = 'delivered' THEN true
        WHEN p_from = 'delivered' AND p_to = 'settled' THEN true
        ELSE false
      END
    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.is_valid_deal_transition(text, text, text) IS
  'Phase 9 pure truth table for deal state transitions. negotiating->accepted and accepted->cancelled are intentionally invalid.';

REVOKE ALL ON FUNCTION public.is_valid_deal_transition(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_deal_transition(text, text, text)
  TO authenticated, service_role;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.is_valid_deal_transition(text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'is_valid_deal_transition grant assert failed: anon can execute';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.is_valid_deal_transition(text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'is_valid_deal_transition grant assert failed: authenticated cannot execute';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.transition_deal_status(
  p_deal_id uuid,
  p_to_status text,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_from_status text;
  v_artist_workspace_id uuid;
  v_brand_workspace_id uuid;
  v_brand_amount numeric;
  v_yagi_commission_amount numeric;
  v_artist_payout_amount numeric;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_deal_id IS NULL OR p_to_status IS NULL THEN
    RAISE EXCEPTION 'invalid_null_argument' USING ERRCODE = '22023';
  END IF;

  SELECT
    d.status,
    d.artist_workspace_id,
    d.brand_workspace_id,
    d.brand_amount,
    d.yagi_commission_amount,
    d.artist_payout_amount
  INTO
    v_from_status,
    v_artist_workspace_id,
    v_brand_workspace_id,
    v_brand_amount,
    v_yagi_commission_amount,
    v_artist_payout_amount
  FROM public.deals d
  WHERE d.id = p_deal_id
    AND (
      public.is_yagi_admin(v_actor_id)
      OR public.is_artist_workspace_member(v_actor_id, d.artist_workspace_id)
      OR public.is_ws_member(v_actor_id, d.brand_workspace_id)
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deal_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  IF public.is_yagi_admin(v_actor_id) THEN
    v_actor_role := 'yagi_admin';
  ELSIF public.is_artist_workspace_member(v_actor_id, v_artist_workspace_id) THEN
    v_actor_role := 'artist';
  ELSIF public.is_ws_member(v_actor_id, v_brand_workspace_id) THEN
    v_actor_role := 'brand';
  ELSE
    RAISE EXCEPTION 'deal_not_found_or_forbidden'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_valid_deal_transition(v_from_status, p_to_status, v_actor_role) THEN
    RAISE EXCEPTION 'invalid_transition: % -> % for role %',
      v_from_status, p_to_status, v_actor_role
      USING ERRCODE = '23514';
  END IF;

  IF v_from_status = 'offered' AND p_to_status = 'accepted' THEN
    IF v_brand_amount IS NULL
      OR v_yagi_commission_amount IS NULL
      OR v_artist_payout_amount IS NULL
      OR v_brand_amount <> v_yagi_commission_amount + v_artist_payout_amount THEN
      RAISE EXCEPTION 'accepted_deal_requires_balanced_amounts'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  PERFORM set_config('local.transition_rpc_active', 'on', true);

  UPDATE public.deals
     SET status = p_to_status,
         settlement_recipient_type = CASE
           WHEN v_from_status = 'offered' AND p_to_status = 'accepted'
             THEN 'artist'
           ELSE settlement_recipient_type
         END,
         settlement_recipient_workspace_id = CASE
           WHEN v_from_status = 'offered' AND p_to_status = 'accepted'
             THEN v_artist_workspace_id
           ELSE settlement_recipient_workspace_id
         END
         -- TODO(delegation, out-of-scope): roster delegation may branch to
         -- agency settlement here. Phase 9 always freezes artist recipient.
   WHERE id = p_deal_id;

  INSERT INTO public.deal_status_history (
    deal_id,
    from_status,
    to_status,
    actor_id,
    actor_role,
    comment
  ) VALUES (
    p_deal_id,
    v_from_status,
    p_to_status,
    v_actor_id,
    v_actor_role,
    p_comment
  );

  PERFORM set_config('local.transition_rpc_active', 'off', true);
END;
$$;

COMMENT ON FUNCTION public.transition_deal_status(uuid, text, text) IS
  'Phase 9 SECURITY DEFINER RPC. Derives actor role dynamically and applies the deal state machine. System transitions are unreachable from this RPC.';

REVOKE ALL ON FUNCTION public.transition_deal_status(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_deal_status(uuid, text, text)
  TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.transition_deal_status(uuid, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'transition_deal_status grant assert failed: anon can execute';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.transition_deal_status(uuid, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'transition_deal_status grant assert failed: authenticated cannot execute';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_deal_payment(
  p_deal_id uuid,
  p_event_type text,
  p_amount numeric DEFAULT NULL,
  p_invoice_ref text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_status text;
  v_payment_status text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_yagi_admin(v_actor_id) THEN
    RAISE EXCEPTION 'forbidden: yagi_admin required'
      USING ERRCODE = '42501';
  END IF;

  IF p_deal_id IS NULL OR p_event_type IS NULL THEN
    RAISE EXCEPTION 'invalid_null_argument' USING ERRCODE = '22023';
  END IF;
  IF p_event_type NOT IN ('brand_paid', 'paid_out') THEN
    RAISE EXCEPTION 'invalid_payment_event_type' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NOT NULL AND p_amount < 0 THEN
    RAISE EXCEPTION 'payment_amount_must_be_nonnegative'
      USING ERRCODE = '22023';
  END IF;

  SELECT d.status, d.payment_status
    INTO v_status, v_payment_status
    FROM public.deals d
   WHERE d.id = p_deal_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deal_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_event_type = 'brand_paid' AND v_payment_status <> 'pending' THEN
    RAISE EXCEPTION 'invalid_payment_transition: % -> brand_paid',
      v_payment_status
      USING ERRCODE = '55000';
  END IF;

  IF p_event_type = 'paid_out' THEN
    IF v_payment_status <> 'brand_paid' THEN
      RAISE EXCEPTION 'invalid_payment_transition: % -> paid_out',
        v_payment_status
        USING ERRCODE = '55000';
    END IF;
    IF v_status <> 'delivered' THEN
      RAISE EXCEPTION 'paid_out_requires_delivered_deal'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  INSERT INTO public.deal_payment_events (
    deal_id,
    event_type,
    amount,
    recorded_by,
    invoice_ref,
    note
  ) VALUES (
    p_deal_id,
    p_event_type,
    p_amount,
    v_actor_id,
    p_invoice_ref,
    p_note
  );

  PERFORM set_config('local.transition_rpc_active', 'on', true);

  IF p_event_type = 'brand_paid' THEN
    UPDATE public.deals
       SET payment_status = 'brand_paid'
     WHERE id = p_deal_id;
  ELSE
    UPDATE public.deals
       SET payment_status = 'paid_out',
           status = 'settled'
     WHERE id = p_deal_id;

    INSERT INTO public.deal_status_history (
      deal_id,
      from_status,
      to_status,
      actor_id,
      actor_role,
      comment
    ) VALUES (
      p_deal_id,
      v_status,
      'settled',
      v_actor_id,
      'system',
      'paid_out'
    );
  END IF;

  PERFORM set_config('local.transition_rpc_active', 'off', true);
END;
$$;

COMMENT ON FUNCTION public.record_deal_payment(uuid, text, numeric, text, text) IS
  'Phase 9 SECURITY DEFINER RPC. YAGI admin only payment ledger write and payment_status transition. paid_out also moves delivered deals to settled as system.';

REVOKE ALL ON FUNCTION public.record_deal_payment(uuid, text, numeric, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_deal_payment(uuid, text, numeric, text, text)
  TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.record_deal_payment(uuid, text, numeric, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'record_deal_payment grant assert failed: anon can execute';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.record_deal_payment(uuid, text, numeric, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'record_deal_payment grant assert failed: authenticated cannot execute';
  END IF;
END $$;
