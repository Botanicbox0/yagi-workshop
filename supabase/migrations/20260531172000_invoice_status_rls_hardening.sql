-- Phase 9 billing automation follow-up — hide all non-client invoice states.
--
-- The billing automation migration adds issuing/failed. Existing client
-- visibility policy hid only draft, so this supplement keeps transient/error
-- states admin-only without rewriting the already-applied migration.

DROP POLICY IF EXISTS invoices_hide_drafts_from_clients ON public.invoices;

CREATE POLICY invoices_hide_drafts_from_clients
  ON public.invoices
  AS RESTRICTIVE
  FOR SELECT
  USING (
    public.is_yagi_admin(auth.uid())
    OR status NOT IN ('draft', 'issuing', 'failed')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'invoices_hide_drafts_from_clients'
      AND qual LIKE '%issuing%'
      AND qual LIKE '%failed%'
  ) THEN
    RAISE EXCEPTION 'assert failed: invoices transient states are not hidden by RLS policy';
  END IF;
END;
$$;
