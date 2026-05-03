-- Wave D sub_03g F3 — close the workspaces.kind privilege escalation.
--
-- Codex K-05 Wave D final LOOP 1 MED-C: Phase 4.x Wave A migration
-- 20260501000000 added `workspaces.kind text NOT NULL` with values in
-- {brand, artist, yagi_admin}. The `ws_update_admin` RLS policy
-- permits is_ws_admin OR is_yagi_admin to UPDATE the workspaces row,
-- and the column-set is unconstrained — so a workspace_admin (who
-- legitimately owns their own workspace) can flip kind to
-- 'yagi_admin' and any code path that branches on workspaces.kind
-- silently treats their workspace as a yagi-internal control surface.
-- This is the same column-grant gap that sub_03f_2 closed for
-- project_boards; mirror that pattern here.
--
-- This migration:
--
--   1. REVOKE UPDATE ON workspaces FROM authenticated  (table-level)
--   2. GRANT  UPDATE on the user-editable subset only —
--        name, slug, logo_url, brand_guide,
--        tax_id, tax_invoice_email,
--        business_registration_number, representative_name,
--        business_address, business_type, business_item,
--        updated_at
--      kind, plan, id, created_at remain server-managed only.
--
-- The ws_update_admin policy continues to gate row-scope (is_ws_admin
-- OR is_yagi_admin), so workspace admins can edit their own row's
-- editable columns. yagi_admin can also use the service-role client
-- to flip kind during migration / support work.
--
-- Sanity assertions mirror sub_03f_2's has_*_privilege pattern.

REVOKE UPDATE ON public.workspaces FROM authenticated;

GRANT UPDATE (
  name,
  slug,
  logo_url,
  brand_guide,
  tax_id,
  tax_invoice_email,
  business_registration_number,
  representative_name,
  business_address,
  business_type,
  business_item,
  updated_at
) ON public.workspaces TO authenticated;

DO $$
BEGIN
  -- Effective table-level UPDATE must be denied to authenticated.
  IF has_table_privilege('authenticated', 'public.workspaces', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated still has effective UPDATE on workspaces (check PUBLIC + inherited grants)';
  END IF;

  -- Effective column-level UPDATE must remain on every editable column.
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'name', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.name';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'slug', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.slug';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'logo_url', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.logo_url';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'brand_guide', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.brand_guide';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'tax_id', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.tax_id';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'tax_invoice_email', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.tax_invoice_email';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'business_registration_number', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.business_registration_number';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'representative_name', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.representative_name';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'business_address', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.business_address';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'business_type', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.business_type';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'business_item', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.business_item';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated lost UPDATE on workspaces.updated_at';
  END IF;

  -- Server-managed columns must be denied.
  IF has_column_privilege('authenticated', 'public.workspaces', 'kind', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated still has effective UPDATE on workspaces.kind (privilege escalation surface)';
  END IF;
  IF has_column_privilege('authenticated', 'public.workspaces', 'plan', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated still has effective UPDATE on workspaces.plan';
  END IF;
  IF has_column_privilege('authenticated', 'public.workspaces', 'id', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated still has effective UPDATE on workspaces.id';
  END IF;
  IF has_column_privilege('authenticated', 'public.workspaces', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03g F3 assert failed: authenticated still has effective UPDATE on workspaces.created_at';
  END IF;
END $$;
