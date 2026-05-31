-- Test workspace sandbox harness.
-- Adds Stripe-test-mode style workspace isolation and seeds admin-only
-- test workspaces for fast end-to-end verification.

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workspaces.is_test IS
  'True for sandbox test workspaces. Admin operations and revenue aggregates exclude these rows by default.';

CREATE INDEX IF NOT EXISTS idx_workspaces_is_test_true
  ON public.workspaces(id)
  WHERE is_test = true;

-- Ensure the canonical internal workspace has the explicit admin kind.
UPDATE public.workspaces
SET kind = 'yagi_admin',
    is_test = false,
    updated_at = now()
WHERE slug = 'yagi-internal';

INSERT INTO public.workspaces (id, name, slug, plan, kind, brand_guide, is_test)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'Test Brand', 'yagi-test-brand', 'custom', 'brand', '{}'::jsonb, true),
  ('11111111-1111-4111-8111-111111111102', 'Test Creator', 'yagi-test-creator', 'custom', 'creator', '{}'::jsonb, true),
  ('11111111-1111-4111-8111-111111111103', 'Test Artist', 'yagi-test-artist', 'custom', 'artist', '{}'::jsonb, true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    plan = EXCLUDED.plan,
    kind = EXCLUDED.kind,
    brand_guide = COALESCE(public.workspaces.brand_guide, '{}'::jsonb),
    is_test = true,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.assert_test_workspace_member_is_yagi_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = NEW.workspace_id
      AND w.is_test = true
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id
      AND ur.role = 'yagi_admin'
      AND ur.workspace_id IS NULL
  ) THEN
    RAISE EXCEPTION 'test_workspace_membership_requires_yagi_admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_test_workspace_member_is_yagi_admin()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS workspace_members_test_admin_only ON public.workspace_members;
CREATE TRIGGER workspace_members_test_admin_only
  BEFORE INSERT OR UPDATE OF workspace_id, user_id
  ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_test_workspace_member_is_yagi_admin();

DROP POLICY IF EXISTS ws_create_any_auth ON public.workspaces;
CREATE POLICY ws_create_any_auth ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (
    is_test = false
    OR public.is_yagi_admin(auth.uid())
  );

INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
SELECT w.id, ur.user_id, 'admin', now()
FROM public.workspaces w
JOIN public.user_roles ur
  ON ur.role = 'yagi_admin'
 AND ur.workspace_id IS NULL
WHERE w.id IN (
  '11111111-1111-4111-8111-111111111101',
  '11111111-1111-4111-8111-111111111102',
  '11111111-1111-4111-8111-111111111103'
)
ON CONFLICT ON CONSTRAINT workspace_members_workspace_id_user_id_key
DO UPDATE SET
  role = 'admin',
  joined_at = COALESCE(public.workspace_members.joined_at, EXCLUDED.joined_at);

INSERT INTO public.artist_profile (
  workspace_id,
  owner_user_id,
  display_name,
  instagram_handle,
  visibility_mode,
  twin_status,
  activated_at
)
SELECT
  '11111111-1111-4111-8111-111111111103',
  ur.user_id,
  'Test Artist',
  'yagi_test_artist',
  'open',
  'active',
  now()
FROM public.user_roles ur
WHERE ur.role = 'yagi_admin'
  AND ur.workspace_id IS NULL
ORDER BY ur.user_id
LIMIT 1
ON CONFLICT (workspace_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    instagram_handle = COALESCE(public.artist_profile.instagram_handle, EXCLUDED.instagram_handle),
    visibility_mode = EXCLUDED.visibility_mode,
    twin_status = EXCLUDED.twin_status,
    activated_at = COALESCE(public.artist_profile.activated_at, EXCLUDED.activated_at),
    updated_at = now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    JOIN public.workspaces w ON w.id = wm.workspace_id
    LEFT JOIN public.user_roles ur
      ON ur.user_id = wm.user_id
     AND ur.role = 'yagi_admin'
     AND ur.workspace_id IS NULL
    WHERE w.is_test = true
      AND ur.user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'test workspace contains non-yagi_admin member';
  END IF;
END;
$$;
