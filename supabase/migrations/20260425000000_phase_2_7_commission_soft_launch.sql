-- =============================================================================
-- Phase 2.7 G1 — Commission Soft Launch
-- =============================================================================
-- Source: .yagi-autobuild/phase-2-7/SPEC.md v2 §3, IMPLEMENTATION.md v2 §1
-- Scope: minimal additions for AI VFX commission intake form + sponsored
--        challenge attribution. Does NOT create projects/project_proposals/
--        project_contracts/project_milestones/project_deliverables/project_messages
--        — those are deferred to Phase 2.8 per ADR-011.
--
-- Sections (ordering matters; see IMPL §1):
--   1. profiles.role enum extension ('client')
--   2. clients table
--   3. commission_intakes table
--   4. challenges.sponsor_client_id column
--   5. RLS policies
--   6. State machine trigger (commission_intakes)
--   7. Realtime publication
-- =============================================================================


-- =============================================================================
-- 1. profiles role enum — add 'client'
-- =============================================================================

-- The existing constraint was added inline with ADD COLUMN in Phase 2.5
-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
-- semantic from Phase 2.5 (mid-onboarding users may still have role IS NULL).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));


-- =============================================================================
-- 2. clients table — company info for the 'client' persona (1:1 with profiles)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL CHECK (char_length(company_name) BETWEEN 1 AND 120),
  company_type text NOT NULL CHECK (company_type IN (
    'label', 'agency', 'studio', 'independent', 'other'
  )),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 60),
  contact_email citext NOT NULL,
  contact_phone text CHECK (contact_phone IS NULL OR char_length(contact_phone) BETWEEN 1 AND 40),
  website_url text CHECK (website_url IS NULL OR char_length(website_url) BETWEEN 1 AND 500),
  instagram_handle text CHECK (instagram_handle IS NULL OR char_length(instagram_handle) BETWEEN 1 AND 60),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clients IS
  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
  'verified_at stamped manually by yagi_admin after sales-ops verification of company identity.';

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;


-- =============================================================================
-- 3. commission_intakes table — AI VFX intake form submissions
-- =============================================================================
-- Each row is one AI VFX commission inquiry from a client. State machine:
--   submitted → admin_responded → closed → archived
-- with archive accessible from any prior state.
--
-- The interactive timeline-annotation player is Phase 2.8; for MVP, clients
-- describe shot-level markings as free-form text in `timestamp_notes`.

CREATE TABLE IF NOT EXISTS public.commission_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  category text NOT NULL CHECK (category IN (
    'music_video', 'commercial', 'teaser', 'lyric_video', 'performance', 'social', 'other'
  )),
  budget_range text NOT NULL CHECK (budget_range IN (
    'under_5m', '5m_15m', '15m_30m', '30m_50m', '50m_100m', '100m_plus', 'negotiable'
  )),
  deadline_preference date,
  reference_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  reference_uploads jsonb NOT NULL DEFAULT '[]'::jsonb,
  brief_md text NOT NULL CHECK (char_length(brief_md) BETWEEN 50 AND 10000),
  timestamp_notes text CHECK (timestamp_notes IS NULL OR char_length(timestamp_notes) <= 5000),
  state text NOT NULL DEFAULT 'submitted' CHECK (state IN (
    'submitted', 'admin_responded', 'closed', 'archived'
  )),
  admin_response_md text CHECK (admin_response_md IS NULL OR char_length(admin_response_md) BETWEEN 1 AND 20000),
  admin_responded_at timestamptz,
  admin_responded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.commission_intakes IS
  'Phase 2.7 — AI VFX commission intake form submissions. Manual-response MVP: '
  'admin reviews each row and posts admin_response_md. The full marketplace '
  '(creator proposals, contracts, milestones, deliverables) is deferred to Phase 2.8.';

ALTER TABLE public.commission_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_intakes FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS commission_intakes_client_idx
  ON public.commission_intakes(client_id);
CREATE INDEX IF NOT EXISTS commission_intakes_state_idx
  ON public.commission_intakes(state);


-- =============================================================================
-- 4. challenges.sponsor_client_id — sponsored challenge attribution
-- =============================================================================
-- A nullable FK to clients. When set, public challenge pages display
-- "Sponsored by {company_name}". RLS unchanged: existing challenges
-- admin-write policy already covers UPDATE.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS sponsor_client_id uuid
    REFERENCES public.clients(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.challenges.sponsor_client_id IS
  'Phase 2.7 — when non-null, surface the client''s company_name as challenge sponsor. '
  'ON DELETE SET NULL preserves the challenge if the client account is removed.';

CREATE INDEX IF NOT EXISTS challenges_sponsor_idx
  ON public.challenges(sponsor_client_id)
  WHERE sponsor_client_id IS NOT NULL;


-- =============================================================================
-- 5. RLS policies
-- =============================================================================
-- All policies are guarded with DROP POLICY IF EXISTS for re-apply safety
-- (hardening v1 K05-001 Finding 5).

-- ----- clients -----

DROP POLICY IF EXISTS clients_select_self_or_admin ON public.clients;
CREATE POLICY clients_select_self_or_admin
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR public.is_yagi_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS clients_insert_self ON public.clients;
CREATE POLICY clients_insert_self
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'client'
    )
  );

DROP POLICY IF EXISTS clients_update_self_or_admin ON public.clients;
CREATE POLICY clients_update_self_or_admin
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    id = (select auth.uid())
    OR public.is_yagi_admin((select auth.uid()))
  )
  WITH CHECK (
    id = (select auth.uid())
    OR public.is_yagi_admin((select auth.uid()))
  );

-- DELETE policy intentionally absent for clients: removal cascades from
-- profiles/auth.users deletion only. Manual delete via DB role for support cases.


-- ----- commission_intakes -----

DROP POLICY IF EXISTS commission_intakes_select_owner_or_admin ON public.commission_intakes;
CREATE POLICY commission_intakes_select_owner_or_admin
  ON public.commission_intakes
  FOR SELECT
  TO authenticated
  USING (
    client_id = (select auth.uid())
    OR public.is_yagi_admin((select auth.uid()))
  );

-- INSERT: only the client themselves, and only after their profiles.role is
-- 'client'. Defense-in-depth: app layer also gates, but the role check here
-- prevents creators/studios/observers from creating commission_intakes by
-- spoofing client_id = own uid. Also paired with the
-- validate_profile_role_transition trigger (§9) which prevents self-flipping
-- profiles.role to 'client' from any prior non-null role.
DROP POLICY IF EXISTS commission_intakes_insert_self_client ON public.commission_intakes;
CREATE POLICY commission_intakes_insert_self_client
  ON public.commission_intakes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'client'
    )
  );

-- Owner can edit their own form only while still in 'submitted' state.
-- Once admin responds, edits are locked (admin-only updates after that).
-- Column-level enforcement (no admin_* tampering) lives in the
-- validate_commission_intake_state_transition trigger (§6) — RLS WITH CHECK
-- alone cannot block targeted column writes.
DROP POLICY IF EXISTS commission_intakes_update_owner_pre_response ON public.commission_intakes;
CREATE POLICY commission_intakes_update_owner_pre_response
  ON public.commission_intakes
  FOR UPDATE
  TO authenticated
  USING (
    client_id = (select auth.uid())
    AND state = 'submitted'
  )
  WITH CHECK (
    client_id = (select auth.uid())
    AND state = 'submitted'
  );

-- Admin updates everything: response composition, state transitions.
DROP POLICY IF EXISTS commission_intakes_update_admin ON public.commission_intakes;
CREATE POLICY commission_intakes_update_admin
  ON public.commission_intakes
  FOR UPDATE
  TO authenticated
  USING (public.is_yagi_admin((select auth.uid())))
  WITH CHECK (public.is_yagi_admin((select auth.uid())));


-- =============================================================================
-- 6. State machine + column-guard trigger (defense-in-depth)
-- =============================================================================
-- Mirrors Phase 2.5 G8 hardening pattern: even if RLS allows an UPDATE,
-- the trigger rejects illegal state transitions and admin-only column
-- tampering at the row level.

CREATE OR REPLACE FUNCTION public.validate_commission_intake_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  -- Caller resolution. NULL caller (service_role / direct DB session) bypasses
  -- both checks below — those paths are trusted (they require service-role key
  -- or direct DB access, both of which represent a total compromise anyway).
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_yagi_admin(v_caller);

  -- Column guard (K05-001 Finding 2): a non-admin owner UPDATE must not
  -- modify the admin response columns. RLS WITH CHECK cannot enforce
  -- per-column constraints, so we enforce here.
  IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
    IF NEW.admin_response_md   IS DISTINCT FROM OLD.admin_response_md
       OR NEW.admin_responded_at IS DISTINCT FROM OLD.admin_responded_at
       OR NEW.admin_responded_by IS DISTINCT FROM OLD.admin_responded_by THEN
      RAISE EXCEPTION
        'only admin may modify admin response columns'
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
  END IF;

  -- State transition validation (applies to all callers including admin —
  -- the trigger is the source of truth on legal transitions).
  IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
    IF NOT (
      (OLD.state = 'submitted'       AND NEW.state IN ('admin_responded', 'archived'))
      OR (OLD.state = 'admin_responded' AND NEW.state IN ('closed', 'archived'))
      OR (OLD.state = 'closed'        AND NEW.state = 'archived')
    ) THEN
      RAISE EXCEPTION
        'invalid commission_intake state transition: % -> %',
        OLD.state, NEW.state
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.validate_commission_intake_state_transition() FROM PUBLIC;

DROP TRIGGER IF EXISTS validate_commission_intake_state_transition_trigger
  ON public.commission_intakes;

CREATE TRIGGER validate_commission_intake_state_transition_trigger
  BEFORE UPDATE ON public.commission_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_commission_intake_state_transition();


-- =============================================================================
-- 6b. profiles.role transition guard (K05-001 Finding 1, HIGH-A)
-- =============================================================================
-- Phase 2.7 specifically calls out "signup role 'client' bypass" as
-- a no-downgrade vigilance area. Existing Phase 2.5 RLS allows users to
-- self-UPDATE their profile, including the `role` column. Without this
-- trigger an authenticated creator/studio/observer could:
--   1. UPDATE profiles SET role = 'client'
--   2. INSERT a clients row (passes clients_insert_self because role='client')
--   3. INSERT commission_intakes (passes self-client gate)
-- effectively spoofing the client persona to access the commission surface.
--
-- This trigger blocks any role transition involving 'client' from a
-- non-NULL prior role for non-admin callers. Admin-driven role changes
-- (yagi_admin) and service-role direct writes bypass.

CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  -- service_role / direct DB sessions bypass — trusted contexts.
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- yagi_admin can change roles freely (e.g., support migrations).
  IF public.is_yagi_admin(v_caller) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Cannot self-assign 'client' from a prior non-null role. Fresh signup
    -- writes profiles via INSERT (which this trigger does not fire on), so
    -- the only legitimate UPDATE path to 'client' is admin-driven.
    IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
      RAISE EXCEPTION
        'cannot self-assign client role from existing role: %',
        OLD.role
        USING ERRCODE = '42501';
    END IF;

    -- K05-002 hardening v2 (Loop 2 finding): also block non-NULL -> NULL
    -- transitions for non-admin callers. Without this, an attacker could
    -- two-step their way around the previous check:
    --   creator -> NULL (allowed before)  -> client (allowed because OLD IS NULL).
    -- Self-clearing role serves no legitimate user-driven flow today;
    -- soft-retirement / role removal is admin-only via the bypass branch.
    IF NEW.role IS NULL AND OLD.role IS NOT NULL THEN
      RAISE EXCEPTION
        'cannot self-clear role from existing role: %',
        OLD.role
        USING ERRCODE = '42501';
    END IF;

    -- Once a client, cannot self-change to another role. Admin migration
    -- is required (and goes through the bypass branch above).
    IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
      RAISE EXCEPTION
        'cannot self-change client role to: %',
        NEW.role
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;

DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
  ON public.profiles;

CREATE TRIGGER validate_profile_role_transition_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_role_transition();


-- =============================================================================
-- 7. updated_at maintenance trigger (matches Phase 2.5 baseline pattern)
-- =============================================================================
-- Reuses the existing public.set_updated_at() helper if present; otherwise
-- sets the column via per-table trigger function.

CREATE OR REPLACE FUNCTION public.set_commission_intake_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.set_commission_intake_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_commission_intake_updated_at_trigger
  ON public.commission_intakes;

CREATE TRIGGER set_commission_intake_updated_at_trigger
  BEFORE UPDATE ON public.commission_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_commission_intake_updated_at();


CREATE OR REPLACE FUNCTION public.set_clients_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.set_clients_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_clients_updated_at_trigger
  ON public.clients;

CREATE TRIGGER set_clients_updated_at_trigger
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_clients_updated_at();


-- =============================================================================
-- 8. Realtime publication
-- =============================================================================
-- commission_intakes: admin queue benefits from live updates.
-- clients: deliberately NOT in publication — PII protection.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'commission_intakes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_intakes';
  END IF;
END $$;


-- =============================================================================
-- END Phase 2.7 G1
-- =============================================================================
