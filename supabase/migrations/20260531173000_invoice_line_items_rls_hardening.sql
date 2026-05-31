-- Phase 9 billing automation follow-up — align invoice line item visibility.
--
-- invoice_line_items had its own SELECT policy based on workspace membership.
-- Keep it in lockstep with invoice visibility so clients cannot infer draft,
-- issuing, failed, or mock invoice details through child rows.

DROP POLICY IF EXISTS invoice_items_select ON public.invoice_line_items;

CREATE POLICY invoice_items_select
  ON public.invoice_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR (
            public.is_ws_member(auth.uid(), i.workspace_id)
            AND i.status NOT IN ('draft', 'issuing', 'failed')
            AND i.is_mock = false
          )
        )
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoice_line_items'
      AND policyname = 'invoice_items_select'
      AND qual LIKE '%issuing%'
      AND qual LIKE '%failed%'
      AND qual LIKE '%is_mock%'
  ) THEN
    RAISE EXCEPTION 'assert failed: invoice_line_items visibility does not mirror invoice visibility';
  END IF;
END;
$$;
