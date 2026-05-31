-- Test workspace sandbox hardening.
-- Complements 20260601043000 without rewriting an already-applied migration.

CREATE OR REPLACE FUNCTION public.assert_workspace_test_members_are_yagi_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_test = true AND EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    LEFT JOIN public.user_roles ur
      ON ur.user_id = wm.user_id
     AND ur.role = 'yagi_admin'
     AND ur.workspace_id IS NULL
    WHERE wm.workspace_id = NEW.id
      AND ur.user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'test_workspace_membership_requires_yagi_admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_workspace_test_members_are_yagi_admin()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS workspaces_test_members_admin_only ON public.workspaces;
CREATE TRIGGER workspaces_test_members_admin_only
  BEFORE INSERT OR UPDATE OF is_test
  ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_workspace_test_members_are_yagi_admin();

CREATE OR REPLACE FUNCTION public.prevent_yagi_admin_role_removal_with_test_memberships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := OLD.user_id;

  IF OLD.role = 'yagi_admin'
     AND OLD.workspace_id IS NULL
     AND (
       TG_OP = 'DELETE'
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     )
     AND EXISTS (
       SELECT 1
       FROM public.workspace_members wm
       JOIN public.workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = v_user_id
         AND w.is_test = true
     ) THEN
    RAISE EXCEPTION 'test_workspace_membership_requires_yagi_admin'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_yagi_admin_role_removal_with_test_memberships()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_roles_test_membership_admin_role_guard ON public.user_roles;
CREATE TRIGGER user_roles_test_membership_admin_role_guard
  BEFORE UPDATE OF user_id, role, workspace_id OR DELETE
  ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_yagi_admin_role_removal_with_test_memberships();

CREATE OR REPLACE FUNCTION public.get_admin_invoice_sandbox_metrics(
  p_include_test boolean DEFAULT false,
  p_today date DEFAULT CURRENT_DATE,
  p_month_start date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_year_start date DEFAULT date_trunc('year', CURRENT_DATE)::date
)
RETURNS TABLE (
  mock_count bigint,
  mock_total_krw bigint,
  mtd_total_krw bigint,
  ytd_total_krw bigint,
  overdue_count bigint,
  overdue_total_krw bigint,
  status_counts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_yagi_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT i.*
    FROM public.invoices i
    JOIN public.workspaces w ON w.id = i.workspace_id
    WHERE p_include_test OR w.is_test = false
  ),
  status_by_year AS (
    SELECT s.status, count(*)::bigint AS count
    FROM scoped s
    WHERE s.created_at >= (p_year_start::timestamptz)
    GROUP BY s.status
  )
  SELECT
    (SELECT count(*)::bigint
     FROM scoped s
     WHERE s.is_mock = true AND s.status IN ('issued', 'paid')) AS mock_count,
    (SELECT COALESCE(sum(s.total_krw), 0)::bigint
     FROM scoped s
     WHERE s.is_mock = true AND s.status IN ('issued', 'paid')) AS mock_total_krw,
    (SELECT COALESCE(sum(s.total_krw), 0)::bigint
     FROM scoped s
     WHERE s.status IN ('issued', 'paid')
       AND s.issue_date >= p_month_start) AS mtd_total_krw,
    (SELECT COALESCE(sum(s.total_krw), 0)::bigint
     FROM scoped s
     WHERE s.status IN ('issued', 'paid')
       AND s.issue_date >= p_year_start) AS ytd_total_krw,
    (SELECT count(*)::bigint
     FROM scoped s
     WHERE s.status = 'issued'
       AND s.due_date IS NOT NULL
       AND s.due_date < p_today) AS overdue_count,
    (SELECT COALESCE(sum(s.total_krw), 0)::bigint
     FROM scoped s
     WHERE s.status = 'issued'
       AND s.due_date IS NOT NULL
       AND s.due_date < p_today) AS overdue_total_krw,
    (SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
     FROM status_by_year) AS status_counts;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_invoice_sandbox_metrics(
  boolean,
  date,
  date,
  date
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_invoice_sandbox_metrics(
  boolean,
  date,
  date,
  date
) TO authenticated;
