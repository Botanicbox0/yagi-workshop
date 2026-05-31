-- Phase 9 billing automation — deal -> invoice -> paid sync
-- Scope:
--   - harden invoice issue idempotency with issuing/failed states
--   - connect invoices to deals without requiring project_id
--   - create admin-only RPCs for deal draft creation and paid sync

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'issuing', 'issued', 'paid', 'failed', 'void'));

ALTER TABLE public.invoice_line_items
  DROP CONSTRAINT IF EXISTS invoice_line_items_source_type_check;

ALTER TABLE public.invoice_line_items
  ADD CONSTRAINT invoice_line_items_source_type_check
  CHECK (
    source_type IS NULL
    OR source_type IN ('manual', 'meeting', 'storyboard', 'deliverable', 'deal')
  );

ALTER TABLE public.invoices
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deal_id uuid
  REFERENCES public.deals(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_invoices_deal
  ON public.invoices(deal_id)
  WHERE deal_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_deal_nonvoid_uidx
  ON public.invoices(deal_id)
  WHERE deal_id IS NOT NULL AND status <> 'void';

CREATE OR REPLACE FUNCTION public.tg_guard_invoice_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'issuing')
      OR (OLD.status = 'issuing' AND NEW.status IN ('issued', 'failed'))
      OR (OLD.status = 'failed' AND NEW.status = 'issuing')
      OR (OLD.status = 'issued' AND NEW.status IN ('paid', 'void'))
    ) THEN
      RAISE EXCEPTION 'invalid_invoice_status_transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_status_guard ON public.invoices;
CREATE TRIGGER invoices_status_guard
  BEFORE UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_guard_invoice_status_transition();

CREATE OR REPLACE FUNCTION public.create_invoice_from_deal(p_deal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_deal public.deals%ROWTYPE;
  v_supplier_id uuid;
  v_invoice_id uuid;
  v_usage_count integer;
  v_total integer;
  v_subtotal integer;
  v_vat integer;
  v_supply_acc integer := 0;
  v_vat_acc integer := 0;
  v_item_supply integer;
  v_item_vat integer;
  v_idx integer;
  v_usage text;
  v_item_name text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_yagi_admin(v_actor_id) THEN
    RAISE EXCEPTION 'forbidden: yagi_admin required' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_deal
    FROM public.deals
   WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deal_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_deal.status <> 'delivered' THEN
    RAISE EXCEPTION 'deal_not_delivered' USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.invoices i
     WHERE i.deal_id = p_deal_id
       AND i.status <> 'void'
  ) THEN
    RAISE EXCEPTION 'invoice_exists_for_deal' USING ERRCODE = '23505';
  END IF;

  IF v_deal.brand_amount IS NULL OR v_deal.brand_amount <= 0 THEN
    RAISE EXCEPTION 'deal_brand_amount_required' USING ERRCODE = '22023';
  END IF;

  IF v_deal.brand_amount <> trunc(v_deal.brand_amount) THEN
    RAISE EXCEPTION 'deal_brand_amount_must_be_krw_integer' USING ERRCODE = '22023';
  END IF;

  IF v_deal.currency <> 'KRW' THEN
    RAISE EXCEPTION 'only_krw_supported' USING ERRCODE = '22023';
  END IF;

  v_usage_count := coalesce(array_length(v_deal.usage_types, 1), 0);
  IF v_usage_count = 0 THEN
    RAISE EXCEPTION 'deal_usage_types_required' USING ERRCODE = '22023';
  END IF;

  SELECT sp.id
    INTO v_supplier_id
    FROM public.supplier_profile sp
   ORDER BY sp.created_at ASC
   LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'no_supplier_profile' USING ERRCODE = 'P0002';
  END IF;

  v_total := v_deal.brand_amount::integer;
  v_subtotal := round(v_total::numeric / 1.1)::integer;
  v_vat := v_total - v_subtotal;

  INSERT INTO public.invoices (
    project_id,
    deal_id,
    workspace_id,
    supplier_id,
    status,
    supply_date,
    due_date,
    subtotal_krw,
    vat_krw,
    total_krw,
    memo,
    is_mock,
    created_by
  ) VALUES (
    v_deal.project_id,
    v_deal.id,
    v_deal.brand_workspace_id,
    v_supplier_id,
    'draft',
    current_date,
    current_date + 14,
    v_subtotal,
    v_vat,
    v_total,
    'Deal invoice: ' || coalesce(v_deal.persona_name_snapshot, v_deal.id::text),
    false,
    v_actor_id
  )
  RETURNING id INTO v_invoice_id;

  FOR v_idx IN 1..v_usage_count LOOP
    v_usage := v_deal.usage_types[v_idx];
    v_item_name := CASE v_usage
      WHEN 'social_sns' THEN 'SNS 광고'
      WHEN 'tv_commercial' THEN 'TV 광고'
      WHEN 'ooh' THEN '옥외광고'
      WHEN 'web_display' THEN '웹 디스플레이'
      WHEN 'print' THEN '인쇄'
      WHEN 'brand_film' THEN '브랜드필름'
      ELSE v_usage
    END;

    IF v_idx = v_usage_count THEN
      v_item_supply := v_subtotal - v_supply_acc;
      v_item_vat := v_vat - v_vat_acc;
    ELSE
      v_item_supply := floor(v_subtotal::numeric / v_usage_count)::integer;
      v_item_vat := floor(v_vat::numeric / v_usage_count)::integer;
      v_supply_acc := v_supply_acc + v_item_supply;
      v_vat_acc := v_vat_acc + v_item_vat;
    END IF;

    INSERT INTO public.invoice_line_items (
      invoice_id,
      display_order,
      item_name,
      specification,
      quantity,
      unit_price_krw,
      supply_krw,
      vat_krw,
      source_type,
      source_id,
      note
    ) VALUES (
      v_invoice_id,
      v_idx - 1,
      v_item_name,
      'Deal usage',
      1,
      v_item_supply,
      v_item_supply,
      v_item_vat,
      'deal',
      v_deal.id,
      coalesce(v_deal.persona_name_snapshot, 'Digital Twin')
    );
  END LOOP;

  RETURN v_invoice_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'invoice_exists_for_deal' USING ERRCODE = '23505';
END;
$$;

COMMENT ON FUNCTION public.create_invoice_from_deal(uuid) IS
  'Creates one non-void invoice draft from a deal. SECURITY DEFINER; yagi_admin only.';

REVOKE ALL ON FUNCTION public.create_invoice_from_deal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_invoice_from_deal(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_deal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_invoice_paid(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_invoice public.invoices%ROWTYPE;
  v_deal_payment_status text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_yagi_admin(v_actor_id) THEN
    RAISE EXCEPTION 'forbidden: yagi_admin required' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_invoice
    FROM public.invoices
   WHERE id = p_invoice_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invoice.status = 'paid' THEN
    RETURN;
  END IF;

  IF v_invoice.status <> 'issued' THEN
    RAISE EXCEPTION 'invalid_invoice_status_transition: % -> paid', v_invoice.status
      USING ERRCODE = '55000';
  END IF;

  IF v_invoice.deal_id IS NOT NULL THEN
    SELECT d.payment_status
      INTO v_deal_payment_status
      FROM public.deals d
     WHERE d.id = v_invoice.deal_id
     FOR UPDATE;

    IF v_deal_payment_status = 'pending' THEN
      PERFORM public.record_deal_payment(
        v_invoice.deal_id,
        'brand_paid',
        v_invoice.total_krw,
        coalesce(v_invoice.popbill_mgt_key, v_invoice.invoice_number, v_invoice.id::text),
        'invoice_paid'
      );
    ELSIF v_deal_payment_status NOT IN ('brand_paid', 'paid_out') THEN
      RAISE EXCEPTION 'invalid_deal_payment_status: %', v_deal_payment_status
        USING ERRCODE = '55000';
    END IF;
  END IF;

  UPDATE public.invoices
     SET status = 'paid',
         paid_at = coalesce(paid_at, now())
   WHERE id = p_invoice_id
     AND status = 'issued';
END;
$$;

COMMENT ON FUNCTION public.mark_invoice_paid(uuid) IS
  'Marks an issued invoice paid and syncs deal brand_paid when deal_id is present. SECURITY DEFINER; yagi_admin only.';

REVOKE ALL ON FUNCTION public.mark_invoice_paid(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_invoice_paid(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_invoice_paid(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'invoices'
       AND column_name = 'deal_id'
  ) THEN
    RAISE EXCEPTION 'assert failed: invoices.deal_id missing';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'invoices'
       AND column_name = 'project_id'
       AND is_nullable <> 'YES'
  ) THEN
    RAISE EXCEPTION 'assert failed: invoices.project_id still NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
     WHERE n.nspname = 'public'
       AND rel.relname = 'invoices'
       AND con.conname = 'invoices_status_check'
       AND pg_get_constraintdef(con.oid) LIKE '%issuing%'
       AND pg_get_constraintdef(con.oid) LIKE '%failed%'
  ) THEN
    RAISE EXCEPTION 'assert failed: invoice status CHECK not extended';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
     WHERE n.nspname = 'public'
       AND rel.relname = 'invoice_line_items'
       AND con.conname = 'invoice_line_items_source_type_check'
       AND pg_get_constraintdef(con.oid) LIKE '%deal%'
  ) THEN
    RAISE EXCEPTION 'assert failed: invoice line source_type deal missing';
  END IF;

  IF has_function_privilege('anon', 'public.create_invoice_from_deal(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'grant assert failed: anon can execute create_invoice_from_deal';
  END IF;

  IF has_function_privilege('anon', 'public.mark_invoice_paid(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'grant assert failed: anon can execute mark_invoice_paid';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.create_invoice_from_deal(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'grant assert failed: authenticated cannot execute create_invoice_from_deal';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.mark_invoice_paid(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'grant assert failed: authenticated cannot execute mark_invoice_paid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'create_invoice_from_deal'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public']
  ) THEN
    RAISE EXCEPTION 'function assert failed: create_invoice_from_deal search_path not locked';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'mark_invoice_paid'
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=public']
  ) THEN
    RAISE EXCEPTION 'function assert failed: mark_invoice_paid search_path not locked';
  END IF;
END;
$$;
