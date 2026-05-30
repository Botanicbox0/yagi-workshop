-- Phase 9 — Deal status history.
--
-- Scope:
--   - Immutable status audit log for deals.
--   - Written only by SECURITY DEFINER RPC/system trigger paths.
--   - Realtime enabled for in-app deal rooms.

CREATE TABLE public.deal_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL
    REFERENCES public.deals(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid
    REFERENCES public.profiles(id),
  actor_role text NOT NULL
    CHECK (actor_role IN ('brand', 'artist', 'agency', 'yagi_admin', 'system')),
  comment text,
  transitioned_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.deal_status_history IS
  'Phase 9 monetization: immutable audit log of deal status transitions.';

CREATE INDEX deal_status_history_deal_idx
  ON public.deal_status_history(deal_id, transitioned_at DESC);
CREATE INDEX deal_status_history_actor_idx
  ON public.deal_status_history(actor_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'deal_status_history realtime assert failed: supabase_realtime publication missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'deal_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_status_history;
  END IF;
END $$;

ALTER TABLE public.deal_status_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.deal_status_history FROM PUBLIC;
REVOKE ALL ON public.deal_status_history FROM anon;
REVOKE ALL ON public.deal_status_history FROM authenticated;

GRANT SELECT ON public.deal_status_history TO anon, authenticated;

CREATE POLICY deal_status_history_select_anon_deny
  ON public.deal_status_history
  FOR SELECT TO anon
  USING (false);

CREATE POLICY deal_status_history_select_actor
  ON public.deal_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_status_history.deal_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR public.is_artist_workspace_member(auth.uid(), d.artist_workspace_id)
          OR public.is_ws_member(auth.uid(), d.brand_workspace_id)
        )
    )
  );

CREATE POLICY deal_status_history_insert_deny
  ON public.deal_status_history
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY deal_status_history_update_deny
  ON public.deal_status_history
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY deal_status_history_delete_deny
  ON public.deal_status_history
  FOR DELETE TO authenticated
  USING (false);

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.deal_status_history', 'INSERT')
    OR has_table_privilege('anon', 'public.deal_status_history', 'UPDATE')
    OR has_table_privilege('anon', 'public.deal_status_history', 'DELETE') THEN
    RAISE EXCEPTION 'deal_status_history grant assert failed: anon has write privilege';
  END IF;
  IF has_table_privilege('authenticated', 'public.deal_status_history', 'INSERT')
    OR has_table_privilege('authenticated', 'public.deal_status_history', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.deal_status_history', 'DELETE') THEN
    RAISE EXCEPTION 'deal_status_history grant assert failed: authenticated has write privilege';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deal_status_history'
      AND policyname = 'deal_status_history_select_anon_deny'
      AND cmd = 'SELECT'
      AND roles::text[] @> ARRAY['anon']
  ) THEN
    RAISE EXCEPTION 'deal_status_history RLS assert failed: anon deny policy missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'deal_status_history'
  ) THEN
    RAISE EXCEPTION 'deal_status_history realtime assert failed: table not in publication';
  END IF;
END $$;
