-- Phase 9 — Deal payment event ledger.
--
-- Scope:
--   - Append-only payment event ledger for Brand paid / Artist paid out.
--   - Written only by record_deal_payment().
--   - Visible to yagi_admin and both deal parties for transparent settlement.

CREATE TABLE public.deal_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL
    REFERENCES public.deals(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('brand_paid', 'paid_out')),
  amount numeric
    CHECK (amount IS NULL OR amount >= 0),
  recorded_by uuid
    REFERENCES public.profiles(id),
  invoice_ref text,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.deal_payment_events IS
  'Phase 9 monetization: append-only ledger of manual payment confirmations.';
COMMENT ON COLUMN public.deal_payment_events.recorded_by IS
  'YAGI admin profile that recorded the manual payment event.';
COMMENT ON COLUMN public.deal_payment_events.invoice_ref IS
  'Optional Popbill tax invoice reference.';

CREATE INDEX deal_payment_events_deal_idx
  ON public.deal_payment_events(deal_id, occurred_at DESC);
CREATE INDEX deal_payment_events_recorded_by_idx
  ON public.deal_payment_events(recorded_by);

ALTER TABLE public.deal_payment_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.deal_payment_events FROM PUBLIC;
REVOKE ALL ON public.deal_payment_events FROM anon;
REVOKE ALL ON public.deal_payment_events FROM authenticated;

GRANT SELECT ON public.deal_payment_events TO anon, authenticated;

CREATE POLICY deal_payment_events_select_anon_deny
  ON public.deal_payment_events
  FOR SELECT TO anon
  USING (false);

CREATE POLICY deal_payment_events_select_actor
  ON public.deal_payment_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_payment_events.deal_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR public.is_artist_workspace_member(auth.uid(), d.artist_workspace_id)
          OR public.is_ws_member(auth.uid(), d.brand_workspace_id)
        )
    )
  );

CREATE POLICY deal_payment_events_insert_deny
  ON public.deal_payment_events
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY deal_payment_events_update_deny
  ON public.deal_payment_events
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY deal_payment_events_delete_deny
  ON public.deal_payment_events
  FOR DELETE TO authenticated
  USING (false);

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.deal_payment_events', 'INSERT')
    OR has_table_privilege('anon', 'public.deal_payment_events', 'UPDATE')
    OR has_table_privilege('anon', 'public.deal_payment_events', 'DELETE') THEN
    RAISE EXCEPTION 'deal_payment_events grant assert failed: anon has write privilege';
  END IF;
  IF has_table_privilege('authenticated', 'public.deal_payment_events', 'INSERT')
    OR has_table_privilege('authenticated', 'public.deal_payment_events', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.deal_payment_events', 'DELETE') THEN
    RAISE EXCEPTION 'deal_payment_events grant assert failed: authenticated has write privilege';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deal_payment_events'
      AND policyname = 'deal_payment_events_select_anon_deny'
      AND cmd = 'SELECT'
      AND roles::text[] @> ARRAY['anon']
  ) THEN
    RAISE EXCEPTION 'deal_payment_events RLS assert failed: anon deny policy missing';
  END IF;
END $$;
