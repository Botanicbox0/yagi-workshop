-- Phase 9 — Twin persona training material assets.
--
-- Scope:
--   - Assets belong to twin_personas.
--   - Owner Artist workspace members and global yagi_admin can CRUD.
--   - Brand/agency/public discovery is out of scope.

CREATE TABLE public.twin_persona_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL
    REFERENCES public.twin_personas(id) ON DELETE CASCADE,
  asset_type text,
  storage_path text NOT NULL,
  file_name text,
  note text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT twin_persona_assets_storage_path_unique UNIQUE (storage_path)
);

COMMENT ON TABLE public.twin_persona_assets IS
  'Phase 9 training/source materials for Artist-owned twin personas. Owner Artist workspace members and yagi_admin only.';
COMMENT ON COLUMN public.twin_persona_assets.asset_type IS
  'Free text material type such as image, video, audio, or other.';
COMMENT ON COLUMN public.twin_persona_assets.storage_path IS
  'R2 object key for the uploaded material.';

CREATE INDEX twin_persona_assets_persona_idx
  ON public.twin_persona_assets(persona_id, created_at DESC);
CREATE INDEX twin_persona_assets_uploaded_by_idx
  ON public.twin_persona_assets(uploaded_by, created_at DESC);

CREATE OR REPLACE FUNCTION public.twin_persona_assets_set_uploaded_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.uploaded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.twin_persona_assets_set_uploaded_by() FROM PUBLIC;

CREATE TRIGGER twin_persona_assets_set_uploaded_by
  BEFORE INSERT ON public.twin_persona_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.twin_persona_assets_set_uploaded_by();

ALTER TABLE public.twin_persona_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_persona_assets FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.twin_persona_assets FROM PUBLIC;
REVOKE ALL ON public.twin_persona_assets FROM anon;
REVOKE ALL ON public.twin_persona_assets FROM authenticated;

GRANT SELECT ON public.twin_persona_assets TO anon, authenticated;
GRANT DELETE ON public.twin_persona_assets TO authenticated;
GRANT UPDATE (
  file_name,
  note
) ON public.twin_persona_assets TO authenticated;

DROP POLICY IF EXISTS twin_persona_assets_select_anon_deny
  ON public.twin_persona_assets;
CREATE POLICY twin_persona_assets_select_anon_deny
  ON public.twin_persona_assets
  FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS twin_persona_assets_select_owner_admin
  ON public.twin_persona_assets;
CREATE POLICY twin_persona_assets_select_owner_admin
  ON public.twin_persona_assets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.twin_personas tp
      WHERE tp.id = twin_persona_assets.persona_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR public.is_artist_workspace_member(auth.uid(), tp.artist_workspace_id)
        )
    )
  );

DROP POLICY IF EXISTS twin_persona_assets_insert_owner_admin
  ON public.twin_persona_assets;
CREATE POLICY twin_persona_assets_insert_owner_admin
  ON public.twin_persona_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.twin_personas tp
      WHERE tp.id = twin_persona_assets.persona_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR public.is_artist_workspace_member(auth.uid(), tp.artist_workspace_id)
        )
    )
  );

DROP POLICY IF EXISTS twin_persona_assets_update_owner_admin
  ON public.twin_persona_assets;
CREATE POLICY twin_persona_assets_update_owner_admin
  ON public.twin_persona_assets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.twin_personas tp
      WHERE tp.id = twin_persona_assets.persona_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR public.is_artist_workspace_member(auth.uid(), tp.artist_workspace_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.twin_personas tp
      WHERE tp.id = twin_persona_assets.persona_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR public.is_artist_workspace_member(auth.uid(), tp.artist_workspace_id)
        )
    )
  );

DROP POLICY IF EXISTS twin_persona_assets_delete_owner_admin
  ON public.twin_persona_assets;
CREATE POLICY twin_persona_assets_delete_owner_admin
  ON public.twin_persona_assets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.twin_personas tp
      WHERE tp.id = twin_persona_assets.persona_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR public.is_artist_workspace_member(auth.uid(), tp.artist_workspace_id)
        )
    )
  );

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.twin_persona_assets', 'INSERT') THEN
    RAISE EXCEPTION 'twin_persona_assets grant assert failed: anon can INSERT';
  END IF;
  IF has_table_privilege('authenticated', 'public.twin_persona_assets', 'INSERT') THEN
    RAISE EXCEPTION 'twin_persona_assets grant assert failed: authenticated has table-level INSERT';
  END IF;
  IF has_table_privilege('authenticated', 'public.twin_persona_assets', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_persona_assets grant assert failed: authenticated has table-level UPDATE';
  END IF;
  IF has_column_privilege('authenticated', 'public.twin_persona_assets', 'storage_path', 'INSERT') THEN
    RAISE EXCEPTION 'twin_persona_assets grant assert failed: authenticated can direct-insert storage_path';
  END IF;
  IF has_column_privilege('authenticated', 'public.twin_persona_assets', 'asset_type', 'INSERT') THEN
    RAISE EXCEPTION 'twin_persona_assets grant assert failed: authenticated can direct-insert asset_type';
  END IF;
  IF has_column_privilege('authenticated', 'public.twin_persona_assets', 'uploaded_by', 'INSERT') THEN
    RAISE EXCEPTION 'twin_persona_assets grant assert failed: authenticated can spoof uploaded_by';
  END IF;
  IF has_column_privilege('authenticated', 'public.twin_persona_assets', 'asset_type', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_persona_assets grant assert failed: authenticated can UPDATE asset_type';
  END IF;
  IF has_column_privilege('authenticated', 'public.twin_persona_assets', 'storage_path', 'UPDATE') THEN
    RAISE EXCEPTION 'twin_persona_assets grant assert failed: authenticated can UPDATE storage_path';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'twin_persona_assets'
      AND policyname = 'twin_persona_assets_select_anon_deny'
      AND roles::text[] @> ARRAY['anon']
  ) THEN
    RAISE EXCEPTION 'twin_persona_assets policy assert failed: anon deny policy missing';
  END IF;
END $$;
