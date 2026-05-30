-- Phase 9 — Deals monetization object.
--
-- PRODUCT-MASTER §AT:
--   - Deal terms and settlement records are the source of truth for Artist
--     monetization.
--   - Roster delegation is out of scope. Accept freezes settlement recipient
--     as the Artist workspace.
--
-- Scope:
--   - Core deals table only.
--   - Direct INSERT is forbidden; brands create rows through create_deal().
--   - Direct status/payment_status mutation is forbidden outside transition
--     RPC/system paths guarded by local.transition_rpc_active = 'on'.

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL
    REFERENCES public.twin_personas(id) ON DELETE RESTRICT,
  artist_workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id),
  brand_workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id),
  project_id uuid
    REFERENCES public.projects(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'submitted',
      'offered',
      'negotiating',
      'accepted',
      'delivered',
      'settled',
      'declined',
      'cancelled'
    )),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'brand_paid', 'paid_out')),

  brief text,
  proposed_budget numeric,
  brand_amount numeric,
  yagi_commission_amount numeric,
  artist_payout_amount numeric,
  commission_rate numeric,
  currency text NOT NULL DEFAULT 'KRW',

  settlement_recipient_type text
    CHECK (settlement_recipient_type IN ('artist', 'agency')),
  settlement_recipient_workspace_id uuid
    REFERENCES public.workspaces(id),

  persona_name_snapshot text,
  created_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deals_proposed_budget_nonneg
    CHECK (proposed_budget IS NULL OR proposed_budget >= 0),
  CONSTRAINT deals_brand_amount_nonneg
    CHECK (brand_amount IS NULL OR brand_amount >= 0),
  CONSTRAINT deals_commission_nonneg
    CHECK (yagi_commission_amount IS NULL OR yagi_commission_amount >= 0),
  CONSTRAINT deals_payout_nonneg
    CHECK (artist_payout_amount IS NULL OR artist_payout_amount >= 0),
  CONSTRAINT deals_amounts_balance
    CHECK (
      brand_amount IS NULL
      OR (
        yagi_commission_amount IS NOT NULL
        AND artist_payout_amount IS NOT NULL
        AND brand_amount = yagi_commission_amount + artist_payout_amount
      )
    )
);

COMMENT ON TABLE public.deals IS
  'Phase 9 monetization: Brand-to-Artist persona collaboration deal object. Status/payment transitions are RPC/system guarded.';
COMMENT ON COLUMN public.deals.artist_workspace_id IS
  'Denormalized frozen owner workspace copied from twin_personas at create_deal().';
COMMENT ON COLUMN public.deals.brand_workspace_id IS
  'Requesting Brand workspace.';
COMMENT ON COLUMN public.deals.project_id IS
  'Optional linked production room. A projects AFTER status trigger moves accepted deals to delivered when the project is approved.';
COMMENT ON COLUMN public.deals.brand_amount IS
  'Authoritative agreed Brand payment amount.';
COMMENT ON COLUMN public.deals.yagi_commission_amount IS
  'Authoritative agreed YAGI commission amount.';
COMMENT ON COLUMN public.deals.artist_payout_amount IS
  'Authoritative agreed Artist payout amount.';
COMMENT ON COLUMN public.deals.commission_rate IS
  'Non-authoritative display snapshot. Amount columns are the source of truth.';
COMMENT ON COLUMN public.deals.settlement_recipient_type IS
  'Frozen on accept. Phase 9 scope always sets artist; agency delegation is deferred.';

CREATE INDEX deals_persona_idx
  ON public.deals(persona_id);
CREATE INDEX deals_artist_workspace_idx
  ON public.deals(artist_workspace_id);
CREATE INDEX deals_brand_workspace_idx
  ON public.deals(brand_workspace_id);
CREATE INDEX deals_status_idx
  ON public.deals(status);
CREATE INDEX deals_project_idx
  ON public.deals(project_id);
CREATE INDEX deals_created_by_idx
  ON public.deals(created_by);
CREATE INDEX deals_settlement_recipient_workspace_idx
  ON public.deals(settlement_recipient_workspace_id);

CREATE OR REPLACE FUNCTION public.deals_kind_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.twin_personas tp
    WHERE tp.id = NEW.persona_id
      AND tp.artist_workspace_id = NEW.artist_workspace_id
  ) THEN
    RAISE EXCEPTION 'deals persona/artist workspace mismatch'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.artist_profile ap ON ap.workspace_id = w.id
    WHERE w.id = NEW.artist_workspace_id
      AND w.kind = 'artist'
  ) THEN
    RAISE EXCEPTION 'deals artist_workspace_id must reference an invited artist workspace'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = NEW.brand_workspace_id
      AND w.kind = 'brand'
  ) THEN
    RAISE EXCEPTION 'deals brand_workspace_id must reference a brand workspace'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.deals_kind_guard() FROM PUBLIC;

CREATE TRIGGER deals_kind_guard
  BEFORE INSERT OR UPDATE OF persona_id, artist_workspace_id, brand_workspace_id
  ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_kind_guard();

CREATE TRIGGER deals_touch
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE OR REPLACE FUNCTION public.guard_deals_transition_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
    RETURN NEW;
  END IF;

  IF current_setting('local.transition_rpc_active', true) = 'on' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'direct_deal_transition_update_forbidden'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.guard_deals_transition_columns() FROM PUBLIC;

CREATE TRIGGER deals_transition_columns_guard
  BEFORE UPDATE OF status, payment_status ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.guard_deals_transition_columns();

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.deals FROM PUBLIC;
REVOKE ALL ON public.deals FROM anon;
REVOKE ALL ON public.deals FROM authenticated;

GRANT SELECT ON public.deals TO anon, authenticated;
GRANT UPDATE (
  brand_amount,
  yagi_commission_amount,
  artist_payout_amount,
  commission_rate,
  currency,
  brief
) ON public.deals TO authenticated;

CREATE POLICY deals_select_anon_deny
  ON public.deals
  FOR SELECT TO anon
  USING (false);

CREATE POLICY deals_select_actor
  ON public.deals
  FOR SELECT TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR public.is_artist_workspace_member(auth.uid(), deals.artist_workspace_id)
    OR public.is_ws_member(auth.uid(), deals.brand_workspace_id)
  );

CREATE POLICY deals_update_yagi_admin
  ON public.deals
  FOR UPDATE TO authenticated
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.deals', 'INSERT')
    OR has_table_privilege('anon', 'public.deals', 'UPDATE')
    OR has_table_privilege('anon', 'public.deals', 'DELETE') THEN
    RAISE EXCEPTION 'deals grant assert failed: anon has write privilege';
  END IF;

  IF has_table_privilege('authenticated', 'public.deals', 'INSERT') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated has table-level INSERT';
  END IF;
  IF has_table_privilege('authenticated', 'public.deals', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated has table-level UPDATE';
  END IF;
  IF has_table_privilege('authenticated', 'public.deals', 'DELETE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated has DELETE';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.deals', 'brand_amount', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated cannot UPDATE brand_amount';
  END IF;
  IF has_column_privilege('authenticated', 'public.deals', 'status', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated can UPDATE status';
  END IF;
  IF has_column_privilege('authenticated', 'public.deals', 'payment_status', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated can UPDATE payment_status';
  END IF;
  IF has_column_privilege('authenticated', 'public.deals', 'settlement_recipient_type', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated can UPDATE settlement_recipient_type';
  END IF;
  IF has_column_privilege('authenticated', 'public.deals', 'settlement_recipient_workspace_id', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated can UPDATE settlement_recipient_workspace_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.deals', 'artist_workspace_id', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated can UPDATE artist_workspace_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.deals', 'brand_workspace_id', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated can UPDATE brand_workspace_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.deals', 'persona_name_snapshot', 'UPDATE') THEN
    RAISE EXCEPTION 'deals grant assert failed: authenticated can UPDATE persona_name_snapshot';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deals'
      AND policyname = 'deals_select_anon_deny'
      AND cmd = 'SELECT'
      AND roles::text[] @> ARRAY['anon']
  ) THEN
    RAISE EXCEPTION 'deals RLS assert failed: anon deny policy missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deals'
      AND policyname = 'deals_update_yagi_admin'
      AND cmd = 'UPDATE'
      AND roles::text[] @> ARRAY['authenticated']
  ) THEN
    RAISE EXCEPTION 'deals RLS assert failed: yagi_admin update policy missing';
  END IF;
END $$;
