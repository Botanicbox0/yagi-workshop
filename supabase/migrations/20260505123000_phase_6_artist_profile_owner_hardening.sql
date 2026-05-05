-- Phase 6 Wave A LOOP-1 hardening — artist_profile owner-scoped RLS.
--
-- Origin: K-05 Codex Tier 1 review of Wave A surfaced HIGH-B finding —
-- the SELECT/UPDATE RLS policies on artist_profile (introduced in
-- 20260505000000_phase_6_artist_profile.sql) are scoped to "any
-- workspace_member of the artist workspace", not to the invited Artist
-- (the row owner). Phase 6 lock = single member per Artist workspace,
-- but if a second member is ever added (admin tooling glitch, future
-- co-management feature, etc.) that user inherits SELECT/UPDATE on
-- the display fields and can complete onboarding on someone else's
-- behalf. Defense-in-depth fix: add an explicit owner_user_id column
-- and pin the policies to it.
--
-- L-019 pre-flight (verified 2026-05-05 via mcp execute_sql):
--   - artist_profile rows: 0 (Phase 6 Wave A is fresh, no Artists
--     have been invited yet).
--   - This means ADD COLUMN ... NOT NULL with no default is safe — no
--     backfill required.
--
-- Composite review: this hardening was authored after Codex K-05 LOOP-1
-- on the main 20260505000000 migration that was already applied via
-- mcp.apply_migration. Per CLAUDE.md DB write protocol §3 (verdict →
-- action: HIGH-B Inline fix mandatory), this migration is a separate
-- file applied as the next link in the chain. Re-review by K-05 LOOP-2
-- on the composite is mandatory before push to remote.
--
-- L-049 4-perspective audit on the new policies:
--   1. As `client` (the invited Artist, owner_user_id = auth.uid()) —
--      SELECT/UPDATE permitted on own row; INSERT denied (yagi_admin
--      only); DELETE denied. Column GRANT continues to restrict UPDATE
--      to (display_name, short_bio, instagram_handle, updated_at).
--   2. As `ws_admin` of the workspace (no special owner identity) —
--      SELECT/UPDATE DENIED unless the ws_admin's auth.uid() also
--      equals the row's owner_user_id (i.e., they are also the Artist
--      themselves). Pre-hardening they had access; post-hardening they
--      do not. This is the intended security tightening.
--   3. As `yagi_admin` — full SELECT/INSERT/UPDATE/DELETE through the
--      is_yagi_admin() OR branch on every policy.
--   4. As `different-user same-workspace` — denied (their auth.uid()
--      does not equal owner_user_id). Pre-hardening they had implicit
--      access via workspace_member predicate; post-hardening they do
--      not.

-- ---------------------------------------------------------------------------
-- 1. ADD COLUMN owner_user_id
--
-- FK action: ON DELETE CASCADE. Rationale (K-05 LOOP-2 F1 finding):
-- combining `ON DELETE SET NULL` with `NOT NULL` is contradictory — a
-- deletion of the auth user would attempt SET NULL and immediately
-- violate the NOT NULL constraint, blocking the auth.users delete with
-- a confusing FK error rather than producing the documented "NULL owner"
-- state. CASCADE is the cleaner intent: if the Artist's auth user is
-- deleted (admin reconciliation), the artist_profile row is removed
-- with them. The parent workspace remains (separate decision: workspace
-- garbage collection is a Phase 7+ concern). The cleanup chain in
-- inviteArtistAction already deletes workspace BEFORE auth user, so the
-- artist_profile row is gone via workspaces ON DELETE CASCADE before
-- the auth.users delete fires; this means CASCADE here is a defensive
-- belt-and-braces for paths outside that action.
-- ---------------------------------------------------------------------------

ALTER TABLE artist_profile
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN artist_profile.owner_user_id IS
  'auth.uid() of the invited Artist who owns this profile. Set by '
  'inviteArtistAction at INSERT time. RLS SELECT/UPDATE policies key '
  'on this column rather than workspace_members so a second member of '
  'the workspace cannot inherit row access. ON DELETE CASCADE: if the '
  'auth user is deleted, the profile row is removed with them.';

-- Backfill is unnecessary (L-019: 0 existing rows). Enforce NOT NULL
-- so future inserts (which all flow through inviteArtistAction) cannot
-- omit the owner identity.
ALTER TABLE artist_profile
  ALTER COLUMN owner_user_id SET NOT NULL;

-- Index for the hot RLS predicate (owner lookups by auth.uid()).
CREATE INDEX idx_artist_profile_owner ON artist_profile(owner_user_id);

-- ---------------------------------------------------------------------------
-- 2. Replace SELECT + UPDATE policies (workspace_member → owner)
--
-- INSERT and DELETE policies (yagi_admin only) are unchanged and not
-- recreated.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS artist_profile_select ON artist_profile;
DROP POLICY IF EXISTS artist_profile_update ON artist_profile;

CREATE POLICY artist_profile_select ON artist_profile
  FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.is_yagi_admin(auth.uid())
  );

CREATE POLICY artist_profile_update ON artist_profile
  FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR public.is_yagi_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Re-assert column GRANT lockdown
--
-- The earlier REVOKE/GRANT pair already locked authenticated to the
-- 4 display columns; this should still be in effect. Re-assert via
-- DO-block to fail apply if the matrix has drifted.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Authenticated must NOT have table-level UPDATE
  IF has_table_privilege('authenticated', 'public.artist_profile', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated has table-level UPDATE on artist_profile';
  END IF;

  -- Authenticated MUST have UPDATE on the 4 display columns
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'display_name', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated lost UPDATE on display_name';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'short_bio', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated lost UPDATE on short_bio';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'instagram_handle', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated lost UPDATE on instagram_handle';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated lost UPDATE on updated_at';
  END IF;

  -- Authenticated must NOT have UPDATE on owner_user_id (admin-write only).
  -- New column gets table-default privileges; we explicitly refuse to grant.
  IF has_column_privilege('authenticated', 'public.artist_profile', 'owner_user_id', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated unexpectedly has UPDATE on owner_user_id';
  END IF;

  -- Re-assert admin-write columns remain locked
  IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_status', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated has UPDATE on twin_status';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'visibility_mode', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated has UPDATE on visibility_mode';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'bypass_brand_ids', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated has UPDATE on bypass_brand_ids';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'auto_decline_categories', 'UPDATE') THEN
    RAISE EXCEPTION 'hardening assert failed: authenticated has UPDATE on auto_decline_categories';
  END IF;
END $$;
