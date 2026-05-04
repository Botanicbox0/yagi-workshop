-- Phase 6 Wave A.1 — artist_profile table.
--
-- Per KICKOFF.md §"A.1 Schema migration: artist_profile" + L-019 pre-flight
-- (verified 2026-05-05 via mcp execute_sql: 0 existing artist-kind workspaces,
-- artist_profile table absent).
--
-- Design intent (from PRODUCT-MASTER §K + §L):
--   - Phase 6 captures the columns; UI for the权限 dial (visibility_mode /
--     auto_decline_categories / bypass_brand_ids) lands in Phase 8 Wave E.
--   - twin_status starts at 'not_started' for every Artist; the R2 upload
--     pipeline that flips it to 'training' / 'active' is Phase 7+.
--   - instagram_handle is nullable at INSERT (yagi_admin invite) but the
--     Phase 6 onboarding gate (Wave A.3) blocks /[locale]/app/* until the
--     Artist completes the 1-step onboarding form. Application-layer
--     enforcement, not DB NOT NULL, so admin tooling can re-import legacy
--     accounts without backfill.
--
-- RLS posture:
--   - SELECT: Artist (workspace_member) + yagi_admin
--   - INSERT: yagi_admin only (Artist self-invite blocked)
--   - UPDATE: Artist + yagi_admin (RLS), but column-level GRANT lockdown
--     restricts Artist to (display_name, short_bio, instagram_handle,
--     updated_at) only — twin_status / visibility_mode / bypass_brand_ids /
--     auto_decline_categories are admin-write through service-role tooling.
--   - DELETE: yagi_admin only
--
-- L-049 4-perspective audit (binding from codex-review-protocol.md):
--   1. As `client` (auth.uid() = workspace_member, no admin role) —
--      SELECT/UPDATE allowed for own row; INSERT denied (yagi_admin gate);
--      DELETE denied; column GRANT restricts UPDATE to display fields only.
--   2. As `ws_admin` — same as client (no special policy branch); cannot
--      INSERT or DELETE; UPDATE restricted by column GRANT.
--   3. As `yagi_admin` — full SELECT/INSERT/UPDATE/DELETE through RLS
--      bypass functions. Service-role client used in admin tooling.
--   4. As different-user same-workspace — RLS USING (workspace_member
--      JOIN) denies row read/write since membership predicate fails.

CREATE TABLE artist_profile (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Twin asset metadata (Phase 6 = column only; pipeline = Phase 7+)
  twin_status text NOT NULL DEFAULT 'not_started'
    CHECK (twin_status IN ('not_started', 'training', 'active', 'paused')),
  twin_r2_prefix text,
  -- Permission dials (Phase 6 = column only; UI = Phase 8 Wave E)
  auto_decline_categories text[] NOT NULL DEFAULT '{}',
  visibility_mode text NOT NULL DEFAULT 'paused'
    CHECK (visibility_mode IN ('open', 'paused')),
  bypass_brand_ids uuid[] NOT NULL DEFAULT '{}',
  -- Display
  display_name text,
  short_bio text,
  -- Instagram handle — nullable at INSERT (admin invite); onboarding gate
  -- enforces NOT NULL before /[locale]/app/* access (application layer)
  instagram_handle text,
  -- Meta
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE artist_profile IS
  'Phase 6 Wave A.1 — Artist workspace profile (1:1 with workspaces.kind = artist). '
  'Twin asset metadata + permission dials + display fields. Admin-write columns '
  '(twin_status / visibility_mode / bypass_brand_ids / auto_decline_categories) '
  'are protected via column-level GRANT lockdown.';

CREATE INDEX idx_artist_profile_visibility ON artist_profile(visibility_mode)
  WHERE visibility_mode = 'open';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE artist_profile ENABLE ROW LEVEL SECURITY;

-- SELECT: Artist (workspace_member) + yagi_admin
CREATE POLICY artist_profile_select ON artist_profile
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- INSERT: yagi_admin only. Artist self-invite is blocked at the policy
-- layer; admin tooling uses service-role client to bypass RLS while
-- still subject to application-layer guard (inviteArtistAction in A.3).
CREATE POLICY artist_profile_insert ON artist_profile
  FOR INSERT TO authenticated
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- UPDATE: Artist (workspace_member) for the display columns granted
-- below + yagi_admin for everything. Column GRANT lockdown enforces
-- the restriction for non-admin callers.
CREATE POLICY artist_profile_update ON artist_profile
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- DELETE: yagi_admin only
CREATE POLICY artist_profile_delete ON artist_profile
  FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Column-level GRANT lockdown (sub_03f_2 / sub_5 pattern, L-048)
--
-- REVOKE all UPDATE from authenticated, then re-GRANT only the columns
-- the Artist is allowed to mutate (display_name / short_bio /
-- instagram_handle / updated_at). Admin-write columns (twin_status /
-- visibility_mode / bypass_brand_ids / auto_decline_categories /
-- twin_r2_prefix / activated_at) require service-role client.
-- ---------------------------------------------------------------------------

REVOKE UPDATE ON artist_profile FROM authenticated;
GRANT UPDATE (display_name, short_bio, instagram_handle, updated_at)
  ON artist_profile TO authenticated;

-- Verification block — fail apply if the column grant matrix drifts.
DO $$
BEGIN
  -- Authenticated must NOT have table-level UPDATE (column-level only)
  IF has_table_privilege('authenticated', 'public.artist_profile', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated has table-level UPDATE on artist_profile';
  END IF;

  -- Authenticated MUST have UPDATE on the 4 display columns
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'display_name', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on display_name';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'short_bio', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on short_bio';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'instagram_handle', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on instagram_handle';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on updated_at';
  END IF;

  -- Authenticated must NOT have UPDATE on admin-write columns
  IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_status', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on twin_status';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'visibility_mode', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on visibility_mode';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'bypass_brand_ids', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on bypass_brand_ids';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'auto_decline_categories', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on auto_decline_categories';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_r2_prefix', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on twin_r2_prefix';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'activated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on activated_at';
  END IF;
END $$;
