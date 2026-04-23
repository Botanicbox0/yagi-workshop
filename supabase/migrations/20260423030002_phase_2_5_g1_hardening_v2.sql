-- Phase 2.5 G1 hardening v2 — closes Codex K-05 findings on hardening v1.
--
-- Codex K-05 on commit be7553d returned MEDIUM_ONLY:
--   N-M1 (MED) — FOR ALL WITH CHECK (audit_col = auth.uid()) on judgments +
--     showcase_challenge_winners blocked cross-admin UPDATE. Admin A could
--     not edit Admin B's judgment/winner pin. INSERT binding correct, UPDATE
--     over-constrained.
--   N-L1 (LOW) — H2 trigger admin bypass RETURN NEW early, so created_at
--     immutability check never ran for admins. Audit trail integrity hole.
--   N-L2 (LOW) — tg_profiles_role_flip_cleanup scaffold body was RETURN NEW
--     no-op. Future re-attachment of trigger without body update = silent.
--
-- Fixes (yagi GO fix-all-N 2026-04-23):
--   §1 — DROP+split challenge_judgments_admin_all and
--        showcase_challenge_winners_admin_write into 4 per-command policies
--        each. INSERT gets audit-column binding; SELECT/UPDATE/DELETE are
--        any-admin. Preserves M2 intent (anti-spoof at insertion) while
--        restoring cross-admin collaboration on edits/retractions.
--   §2 — H2 trigger function rewritten (CREATE OR REPLACE). created_at
--        immutability check moved ABOVE admin bypass — enforced for ALL
--        roles including admins. Admin bypass then covers status /
--        challenge_id / submitter_id only.
--   §3 — tg_profiles_role_flip_cleanup scaffold body changed from RETURN NEW
--        to RAISE EXCEPTION with SQLSTATE 0A000 (feature_not_supported).
--        Any future trigger re-attach without body update fails loudly on
--        first role flip.

-- ===========================================================================
-- 1. N-M1 — split challenge_judgments + showcase_challenge_winners policies
-- ===========================================================================

-- challenge_judgments
DROP POLICY IF EXISTS challenge_judgments_admin_all ON public.challenge_judgments;

CREATE POLICY challenge_judgments_admin_select ON public.challenge_judgments
  FOR SELECT
  USING (public.is_yagi_admin(auth.uid()));

CREATE POLICY challenge_judgments_admin_insert ON public.challenge_judgments
  FOR INSERT
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    AND admin_id = auth.uid()
  );

CREATE POLICY challenge_judgments_admin_update ON public.challenge_judgments
  FOR UPDATE
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY challenge_judgments_admin_delete ON public.challenge_judgments
  FOR DELETE
  USING (public.is_yagi_admin(auth.uid()));

-- showcase_challenge_winners (SELECT is public — not dropped)
DROP POLICY IF EXISTS showcase_challenge_winners_admin_write ON public.showcase_challenge_winners;

CREATE POLICY showcase_challenge_winners_admin_insert ON public.showcase_challenge_winners
  FOR INSERT
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    AND announced_by = auth.uid()
  );

CREATE POLICY showcase_challenge_winners_admin_update ON public.showcase_challenge_winners
  FOR UPDATE
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY showcase_challenge_winners_admin_delete ON public.showcase_challenge_winners
  FOR DELETE
  USING (public.is_yagi_admin(auth.uid()));


-- ===========================================================================
-- 2. N-L1 — H2 trigger: created_at immutable for ALL roles (incl. admin)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.tg_challenge_submissions_guard_self_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- created_at immutable for all roles — audit trail integrity, even admins
  -- cannot rewrite submission history timestamps.
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'challenge_submissions.created_at is immutable (submission=%)', OLD.id
      USING ERRCODE = '42501';
  END IF;

  -- Admin bypass for workflow/identity mutations.
  IF public.is_yagi_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admin owner cannot change workflow/identity columns.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'challenge_submissions.status is not owner-writable (submitter=%)', OLD.submitter_id
      USING ERRCODE = '42501';
  END IF;

  IF NEW.challenge_id IS DISTINCT FROM OLD.challenge_id THEN
    RAISE EXCEPTION 'challenge_submissions.challenge_id is immutable (submission=%)', OLD.id
      USING ERRCODE = '42501';
  END IF;

  IF NEW.submitter_id IS DISTINCT FROM OLD.submitter_id THEN
    RAISE EXCEPTION 'challenge_submissions.submitter_id is immutable (submission=%)', OLD.id
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


-- ===========================================================================
-- 3. N-L2 — scaffold guard: tg_profiles_role_flip_cleanup raises loudly
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Scaffold guard. Yagi Q2 pre-apply decision: role-flip cleanup is
  -- intentionally a no-op (stale creators/studios rows preserved as
  -- historical record). This function is retained only as a named
  -- scaffold for potential future policy reversal. If a future migration
  -- re-attaches a trigger without updating this body, the first role
  -- flip fires this RAISE — fail loud, never silent.
  RAISE EXCEPTION 'tg_profiles_role_flip_cleanup scaffold — implement policy body before attaching trigger'
    USING ERRCODE = '0A000';  -- feature_not_supported
END;
$$;
