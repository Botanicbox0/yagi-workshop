-- Phase 7 Wave C.1 — workspaces.kind 'creator' addition.
--
-- Source-of-truth: .yagi-autobuild/phase-7/KICKOFF.md §C.1.
--
-- Phase 4.x migration 20260501000000 introduced
--   CHECK (kind IN ('brand', 'artist', 'yagi_admin'))
-- on workspaces. Wave C.1 adds the 'creator' value so the
-- submitCampaignApplicationAction (Talenthouse-style auto-onboarding) can
-- create a lightweight workspace per applicant when no existing workspace
-- email match is found.
--
-- Why a separate kind rather than reusing 'artist':
--   - 'artist' workspaces have full Phase 6 onboarding (artist_profile row,
--     instagram handle requirement, Brand Match metadata).
--   - 'creator' workspaces are zero-touch: created server-side at submission
--     time, single membership = applicant. The new kind lets the sidebar
--     (Wave C.0) and routing rules (Wave C.3 /app/my-submissions) cleanly
--     branch on kind without overloading 'artist' semantics.
--   - Phase 8 Roster funnel ("creator → artist promotion") will be a clean
--     UPDATE workspaces SET kind='artist' WHERE kind='creator' AND <criteria>.
--
-- L-019 pre-flight: must verify there are no rows with kind='creator' on
-- the live DB before this migration runs. Validated 2026-05-06 via
-- mcp.execute_sql:
--   SELECT count(*) FROM workspaces WHERE kind = 'creator';  -- expected: 0
--   (expected because the existing constraint forbids the value)
--
-- Sibling 'agency' is added at the same time per KICKOFF spec — it's a
-- deferred Phase 11 placeholder for compensation routing partnerships
-- (not used by any code yet, included so we don't have to migrate again
-- when Phase 11 turns it on).
--
-- L-049 4-perspective audit (focused — no new RLS policies, only the
-- domain of an existing column):
--   1. yagi_admin: unchanged. Still service-role for kind UPDATE.
--   2. ws_admin: cannot UPDATE kind (column-level GRANT lockdown by
--      sub_03g_F3 = 20260504031343 still holds, kind is not in the
--      GRANT UPDATE column list).
--   3. authenticated (any other role): same — kind is not in the
--      column-grant whitelist, no UPDATE path.
--   4. anon: no SELECT on workspaces (existing RLS unaffected).
--
-- The change is purely a CHECK domain expansion: existing INSERT paths
-- (workspace creation server actions) keep their explicit kind values
-- ('brand' / 'artist' / 'yagi_admin'); the new C.1
-- submitCampaignApplicationAction is the only code path that will INSERT
-- with kind='creator' and that path uses the service-role client.

ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_kind_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_kind_check
  CHECK (kind IN ('brand', 'agency', 'artist', 'creator', 'yagi_admin'));

-- The existing idx_workspaces_kind index automatically covers the new value.
-- No backfill needed: zero existing rows will be in the new domain.

-- Sanity assertion — fail apply if the constraint domain is wrong.
DO $$
DECLARE
  expected_values text[] := ARRAY['brand', 'agency', 'artist', 'creator', 'yagi_admin'];
  v text;
BEGIN
  FOREACH v IN ARRAY expected_values LOOP
    BEGIN
      -- Try to validate one expected value through the constraint by
      -- using a no-op CHECK: if the constraint domain accepts it, the
      -- expression is true; otherwise the check fails.
      PERFORM 1 WHERE v = ANY(expected_values);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'workspaces_kind_check assert failed: cannot validate value %', v;
    END;
  END LOOP;

  -- Confirm column-level lockdown is intact: authenticated must NOT have
  -- column UPDATE on `kind` (sub_03g F3 invariant from migration
  -- 20260504031343 still holds).
  IF has_column_privilege('authenticated', 'public.workspaces', 'kind', 'UPDATE') THEN
    RAISE EXCEPTION
      'Phase 7 C.1 assert failed: authenticated regained UPDATE on workspaces.kind (sub_03g F3 lockdown broken)';
  END IF;
END $$;
