-- Phase 9 foundation — Artist Digital Twin personas.
--
-- PRODUCT-MASTER §AT:
--   - 1 artist workspace -> N persona twins.
--   - Ownership default = Artist.
--   - Status = active / paused.
--   - min_fee and public/private visibility are persona-level settings.
--
-- Scope:
--   - owner Artist workspace members (workspace_members.role IN admin/member)
--     can CRUD their own personas.
--   - global yagi_admin can access all personas for production operations.
--   - no brand/agency/public discovery policy in this phase.

CREATE TABLE public.twin_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT twin_personas_artist_profile_fkey
    FOREIGN KEY (artist_workspace_id)
    REFERENCES public.artist_profile(workspace_id) ON DELETE CASCADE,
  name text,
  persona_type text,
  description text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused')),
  min_fee numeric,
  min_fee_public boolean NOT NULL DEFAULT false,
  cover_asset_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT twin_personas_min_fee_nonnegative
    CHECK (min_fee IS NULL OR min_fee >= 0)
);

COMMENT ON TABLE public.twin_personas IS
  'Phase 9 foundation: Artist-owned Digital Twin persona records. Owner Artist workspace members and yagi_admin only; public/brand discovery is out of scope.';
COMMENT ON COLUMN public.twin_personas.artist_workspace_id IS
  'Owning Artist workspace. Insert/update policies require workspaces.kind = artist.';
COMMENT ON COLUMN public.twin_personas.persona_type IS
  'Optional free-text persona type. NULL means the default self twin.';
COMMENT ON COLUMN public.twin_personas.status IS
  'active = available for new collaboration/production; paused = stop new collaboration/production.';
COMMENT ON COLUMN public.twin_personas.min_fee_public IS
  'Whether the minimum collaboration fee may be shown outside the owner/admin context in future discovery surfaces.';

CREATE INDEX twin_personas_artist_workspace_idx
  ON public.twin_personas(artist_workspace_id);
CREATE INDEX twin_personas_status_idx
  ON public.twin_personas(status);

CREATE OR REPLACE FUNCTION public.is_artist_workspace_member(uid uuid, wsid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    JOIN public.workspaces w ON w.id = wm.workspace_id
    JOIN public.artist_profile ap ON ap.workspace_id = wm.workspace_id
    WHERE wm.user_id = uid
      AND wm.workspace_id = wsid
      AND wm.role IN ('admin', 'member')
      AND w.kind = 'artist'
  );
$$;

COMMENT ON FUNCTION public.is_artist_workspace_member(uuid, uuid) IS
  'Phase 9 twin_personas helper. True only for admin/member of an invited Artist workspace with an artist_profile row. Excludes guests and self-created non-invited artist-like workspaces.';

REVOKE ALL ON FUNCTION public.is_artist_workspace_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_artist_workspace_member(uuid, uuid)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.twin_personas_artist_workspace_kind_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.artist_profile ap ON ap.workspace_id = w.id
    WHERE w.id = NEW.artist_workspace_id
      AND w.kind = 'artist'
  ) THEN
    RAISE EXCEPTION 'twin_personas artist_workspace_id must reference an invited artist workspace'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER twin_personas_artist_workspace_kind_guard
  BEFORE INSERT OR UPDATE OF artist_workspace_id ON public.twin_personas
  FOR EACH ROW EXECUTE FUNCTION public.twin_personas_artist_workspace_kind_guard();

CREATE TRIGGER twin_personas_touch
  BEFORE UPDATE ON public.twin_personas
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

ALTER TABLE public.twin_personas ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.twin_personas FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.twin_personas FROM PUBLIC;
GRANT SELECT ON public.twin_personas TO anon;
GRANT SELECT, DELETE ON public.twin_personas TO authenticated;
REVOKE INSERT, UPDATE ON public.twin_personas FROM authenticated;
GRANT INSERT (
  artist_workspace_id,
  name,
  persona_type,
  description,
  min_fee,
  min_fee_public
) ON public.twin_personas TO authenticated;
GRANT UPDATE (
  name,
  persona_type,
  description,
  status,
  min_fee,
  min_fee_public
) ON public.twin_personas TO authenticated;

CREATE POLICY twin_personas_select_owner_admin ON public.twin_personas
  FOR SELECT
  USING (
    public.is_yagi_admin(auth.uid())
    OR public.is_artist_workspace_member(auth.uid(), twin_personas.artist_workspace_id)
  );

CREATE POLICY twin_personas_insert_owner_admin ON public.twin_personas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    OR public.is_artist_workspace_member(auth.uid(), twin_personas.artist_workspace_id)
  );

CREATE POLICY twin_personas_update_owner_admin ON public.twin_personas
  FOR UPDATE TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR public.is_artist_workspace_member(auth.uid(), twin_personas.artist_workspace_id)
  )
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    OR public.is_artist_workspace_member(auth.uid(), twin_personas.artist_workspace_id)
  );

CREATE POLICY twin_personas_delete_owner_admin ON public.twin_personas
  FOR DELETE TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR public.is_artist_workspace_member(auth.uid(), twin_personas.artist_workspace_id)
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'twin_personas'
      AND policyname = 'twin_personas_select_owner_admin'
  ) THEN
    RAISE EXCEPTION 'twin_personas RLS assert failed: select policy missing';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.is_artist_workspace_member(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'twin_personas helper assert failed: authenticated cannot execute is_artist_workspace_member';
  END IF;
  IF NOT has_function_privilege('anon', 'public.is_artist_workspace_member(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'twin_personas helper assert failed: anon cannot execute is_artist_workspace_member';
  END IF;

  IF has_table_privilege('anon', 'public.twin_personas', 'INSERT') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: anon has INSERT';
  END IF;
  IF has_table_privilege('anon', 'public.twin_personas', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: anon has UPDATE';
  END IF;
  IF has_table_privilege('anon', 'public.twin_personas', 'DELETE') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: anon has DELETE';
  END IF;
  IF has_table_privilege('authenticated', 'public.twin_personas', 'INSERT') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: authenticated has table-level INSERT';
  END IF;
  IF has_table_privilege('authenticated', 'public.twin_personas', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: authenticated has table-level UPDATE';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.twin_personas', 'artist_workspace_id', 'INSERT') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: authenticated lost INSERT on artist_workspace_id';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.twin_personas', 'status', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: authenticated lost UPDATE on status';
  END IF;
  IF has_column_privilege('authenticated', 'public.twin_personas', 'artist_workspace_id', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: authenticated can UPDATE artist_workspace_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.twin_personas', 'cover_asset_path', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: authenticated can UPDATE cover_asset_path';
  END IF;
  IF has_column_privilege('authenticated', 'public.twin_personas', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_personas grant assert failed: authenticated can UPDATE created_at';
  END IF;
END $$;
