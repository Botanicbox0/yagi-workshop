-- Phase 9 foundation — Agency roster links.
--
-- PRODUCT-MASTER §AT:
--   - AGENCY is an active workspace kind.
--   - Agency can manage a roster of N artists.
--   - Deal delegation/approval is out of scope for this phase.

CREATE TABLE public.agency_artist_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  artist_workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_artist_roster_unique_pair
    UNIQUE (agency_workspace_id, artist_workspace_id),
  CONSTRAINT agency_artist_roster_not_self
    CHECK (agency_workspace_id <> artist_workspace_id),
  CONSTRAINT agency_artist_roster_artist_profile_fkey
    FOREIGN KEY (artist_workspace_id)
    REFERENCES public.artist_profile(workspace_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.agency_artist_roster IS
  'Phase 9 foundation: agency workspace to artist workspace roster links. Deal delegation is deferred.';
COMMENT ON COLUMN public.agency_artist_roster.agency_workspace_id IS
  'Managing agency workspace. Must reference workspaces.kind = agency.';
COMMENT ON COLUMN public.agency_artist_roster.artist_workspace_id IS
  'Managed artist workspace. Must reference workspaces.kind = artist and artist_profile.';

CREATE INDEX agency_artist_roster_agency_idx
  ON public.agency_artist_roster(agency_workspace_id);
CREATE INDEX agency_artist_roster_artist_idx
  ON public.agency_artist_roster(artist_workspace_id);

CREATE OR REPLACE FUNCTION public.agency_artist_roster_kind_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = NEW.agency_workspace_id
      AND w.kind = 'agency'
  ) THEN
    RAISE EXCEPTION 'agency_artist_roster.agency_workspace_id must reference an agency workspace'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.artist_profile ap ON ap.workspace_id = w.id
    WHERE w.id = NEW.artist_workspace_id
      AND w.kind = 'artist'
  ) THEN
    RAISE EXCEPTION 'agency_artist_roster.artist_workspace_id must reference an invited artist workspace'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER agency_artist_roster_kind_guard
  BEFORE INSERT OR UPDATE OF agency_workspace_id, artist_workspace_id
  ON public.agency_artist_roster
  FOR EACH ROW EXECUTE FUNCTION public.agency_artist_roster_kind_guard();

CREATE TRIGGER agency_artist_roster_touch
  BEFORE UPDATE ON public.agency_artist_roster
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

ALTER TABLE public.agency_artist_roster ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.agency_artist_roster TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_artist_roster TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.agency_artist_roster FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.agency_artist_roster FROM PUBLIC;

CREATE POLICY agency_artist_roster_select_anon_deny
  ON public.agency_artist_roster
  FOR SELECT TO anon
  USING (false);

CREATE POLICY agency_artist_roster_select_member_admin
  ON public.agency_artist_roster
  FOR SELECT TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR public.is_ws_member(auth.uid(), agency_artist_roster.agency_workspace_id)
    OR public.is_artist_workspace_member(auth.uid(), agency_artist_roster.artist_workspace_id)
  );

CREATE POLICY agency_artist_roster_insert_agency_admin
  ON public.agency_artist_roster
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    OR public.is_ws_admin(auth.uid(), agency_artist_roster.agency_workspace_id)
  );

CREATE POLICY agency_artist_roster_update_agency_admin
  ON public.agency_artist_roster
  FOR UPDATE TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR public.is_ws_admin(auth.uid(), agency_artist_roster.agency_workspace_id)
  )
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    OR public.is_ws_admin(auth.uid(), agency_artist_roster.agency_workspace_id)
  );

CREATE POLICY agency_artist_roster_delete_agency_admin
  ON public.agency_artist_roster
  FOR DELETE TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR public.is_ws_admin(auth.uid(), agency_artist_roster.agency_workspace_id)
  );

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.agency_artist_roster', 'INSERT')
    OR has_table_privilege('anon', 'public.agency_artist_roster', 'UPDATE')
    OR has_table_privilege('anon', 'public.agency_artist_roster', 'DELETE') THEN
    RAISE EXCEPTION 'agency_artist_roster grant assert failed: anon has write privilege';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agency_artist_roster'
      AND policyname = 'agency_artist_roster_select_anon_deny'
      AND roles = ARRAY['anon']::name[]
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'agency_artist_roster RLS assert failed: anon deny policy missing';
  END IF;
END $$;
