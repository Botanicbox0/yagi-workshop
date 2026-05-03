-- Wave D sub_03g F2 — close the profiles.role self-mutation gap.
--
-- Codex K-05 Wave D final LOOP 1 MED-B: widening profiles.role to
-- include 'artist' (Phase 4.x Wave C.5b sub_13) left the existing
-- validate_profile_role_transition trigger covering only specific
-- enum transitions (anything -> client, client -> anything, role ->
-- null). It does NOT block:
--   - NULL -> 'artist' (a fresh signup or any user without a role yet
--     can self-promote to artist by hitting profiles UPDATE through
--     PostgREST)
--   - 'creator' -> 'studio' / 'observer' / 'artist' (any non-client
--     to non-client transition is currently unguarded)
--   - 'studio' -> 'creator' / 'artist' / etc.
--
-- The Phase 2.7 trigger was scoped narrowly to 'client' because that
-- was the only persona with adjacent privilege (commission intake).
-- Phase 4.x adds 'artist' as an admin-curated persona (DECISIONS Q-094)
-- and the trigger needs to enforce that curation at the DB layer.
--
-- This migration replaces the trigger with a stricter contract:
--
--   1. service_role / direct DB sessions: bypass (trusted contexts).
--   2. yagi_admin: bypass (admin-driven role changes via support tools).
--   3. Other authenticated callers (PostgREST):
--      a. INSERT (initial signup): unchanged. Trigger does not fire.
--      b. UPDATE NULL -> non-NULL (onboarding completion): allowed
--         ONLY if the new role is in the self-assignable allowlist
--         {creator, studio, observer, client}. 'artist' and any
--         future admin-curated role must come through admin migration
--         or an RPC.
--      c. UPDATE non-NULL -> anything else: rejected. The previous
--         trigger only blocked specific transitions; this version
--         denies the whole class because there is no legitimate
--         user-driven re-role flow today.
--
-- Comments on the prior trigger's narrow rules (client-specific) are
-- preserved as inline justification.

CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_self_assignable_roles text[] := ARRAY['creator', 'studio', 'observer', 'client'];
BEGIN
  -- service_role / direct DB sessions bypass — trusted contexts.
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- yagi_admin can change roles freely (e.g., support migrations,
  -- artist curation).
  IF public.is_yagi_admin(v_caller) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- (a) NULL -> non-NULL: onboarding completion. Allowed only for
    -- the four self-assignable personas; 'artist' is admin-curated and
    -- must arrive via the bypass branch above.
    IF OLD.role IS NULL AND NEW.role IS NOT NULL THEN
      IF NOT (NEW.role = ANY(v_self_assignable_roles)) THEN
        RAISE EXCEPTION
          'cannot self-assign role: % (admin-only role; allowed self-assignable roles: %)',
          NEW.role, array_to_string(v_self_assignable_roles, ', ')
          USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;

    -- (b) Any other transition (non-NULL -> NULL, non-NULL -> different
    -- non-NULL) is admin-only. This subsumes the prior client-specific
    -- guards plus closes the artist-promotion path:
    --   K05 Phase 2.7: client cannot self-claim from non-NULL prior;
    --   K05 hardening v2: cannot self-clear role to NULL;
    --   K05 hardening v3: client cannot self-change to other roles;
    --   Wave D sub_03g F2: nothing self-mutates an existing role.
    RAISE EXCEPTION
      'cannot self-change profile role from % to % (admin-only after onboarding)',
      coalesce(OLD.role, '<null>'), coalesce(NEW.role, '<null>')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;

-- The trigger declaration from migration 20260425000000 stays in place;
-- CREATE OR REPLACE FUNCTION above swaps the implementation. No DROP/
-- CREATE TRIGGER needed.
COMMENT ON FUNCTION public.validate_profile_role_transition() IS
  'Wave D sub_03g F2: blocks self-assign to admin-curated roles '
  '(artist, future yagi_admin) and forbids non-NULL -> non-NULL role '
  'transitions for non-admin callers. service_role + yagi_admin bypass.';
