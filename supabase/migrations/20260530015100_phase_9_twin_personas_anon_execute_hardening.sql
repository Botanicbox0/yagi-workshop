-- Phase 9 twin_personas follow-up hardening.
--
-- Keep unauthenticated SELECT behavior as an empty result set, but do not expose
-- the SECURITY DEFINER membership helper itself to anon RPC execution.

REVOKE EXECUTE ON FUNCTION public.is_artist_workspace_member(uuid, uuid) FROM anon;

DROP POLICY IF EXISTS twin_personas_select_owner_admin ON public.twin_personas;

CREATE POLICY twin_personas_select_owner_admin ON public.twin_personas
  FOR SELECT TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR public.is_artist_workspace_member(auth.uid(), twin_personas.artist_workspace_id)
  );

CREATE POLICY twin_personas_select_anon_deny ON public.twin_personas
  FOR SELECT TO anon
  USING (false);

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.is_artist_workspace_member(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'twin_personas hardening assert failed: anon can execute is_artist_workspace_member';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.is_artist_workspace_member(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'twin_personas hardening assert failed: authenticated cannot execute is_artist_workspace_member';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'twin_personas'
      AND policyname = 'twin_personas_select_anon_deny'
      AND roles = ARRAY['anon']::name[]
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'twin_personas hardening assert failed: anon deny policy missing';
  END IF;
END $$;
