-- Phase 2.5 G1 hardening — closes Codex K-05 findings on 20260423030000.
--
-- Codex K-05 on commit 58dbf6e returned HIGH (4 HIGH + 2 MEDIUM + 1 LOW). All
-- findings apply-safe; this migration is additive against live DB
-- (jvamvbpxnztynsccvcmr). Triggered per yagi GO fix-all-rev-migration
-- 2026-04-23.
--
-- Findings closed by this migration:
--   H2 — challenge_submissions_update_self let owner mutate status /
--        challenge_id / submitter_id. Section 1 adds a BEFORE UPDATE guard
--        trigger; admin bypasses via is_yagi_admin.
--   H3 — votes / judgments / showcase_challenge_winners stored challenge_id
--        and submission_id as independent FKs; nothing enforced they matched.
--        Section 2 adds a UNIQUE (challenge_id, id) on challenge_submissions
--        + composite FKs on the three children.
--   H4 — role consistency only fired on INSERT; UPDATE on stale creators/
--        studios rows survived role flips; no mutual exclusion. Section 3
--        tightens UPDATE policies with role EXISTS + adds dual-role INSERT
--        triggers. Stale rows preserved as read-only historical record
--        (was: hard-delete; yagi Q2 pre-apply flip — winner attribution
--        and submission history worth more than schema tidiness). Read
--        queries in G3/G6 must join profiles.role to surface only active
--        personas. Cleanup function retained as no-op stub for future
--        re-introduction if policy decision reverses.
--   M1 — slug CHECK used citext's `~` operator which is case-INSENSITIVE.
--        'ABC-123'::citext ~ '^[a-z0-9-]+$' returned TRUE in live DB probe.
--        Section 4 drops + re-adds CHECK using slug::text regex + explicit
--        lower(slug::text) = slug::text defense layer.
--   M2 — admin INSERT/ALL policies didn't bind audit columns to auth.uid().
--        Admin A could insert with created_by = Admin B. Section 5 adds the
--        bindings to challenges_admin_insert / challenge_judgments_admin_all /
--        showcase_challenge_winners_admin_write WITH CHECK.
--   L1 — G1 main migration header claim "challenge_updates_enabled covers
--        BOTH transactional AND marketing" is stale after SPEC FU-2
--        addendum which narrowed scope to transactional-only. Correction
--        noted here; main migration file is applied — header cosmetic only.
--
-- SPEC drift reconciliation (separate commit — not in this migration):
--   challenge_judgments is admin-only per DB state; SPEC v2 §3 G1 will be
--   amended to match (judgment notes must not be public — they may contain
--   internal deliberation).
--
-- H1 — database.types.ts stderr leak — closed OUT OF MIGRATION SCOPE via
--      clean regeneration using Supabase MCP generate_typescript_types.

-- ===========================================================================
-- 1. H2 — challenge_submissions self-mutate guard
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.tg_challenge_submissions_guard_self_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Admin bypass (status transitions, force-move, etc.).
  IF public.is_yagi_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Block non-admin mutation of workflow/identity columns.
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

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'challenge_submissions.created_at is immutable (submission=%)', OLD.id
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_challenge_submissions_guard_self_mutation
BEFORE UPDATE ON public.challenge_submissions
FOR EACH ROW
EXECUTE FUNCTION public.tg_challenge_submissions_guard_self_mutation();


-- ===========================================================================
-- 2. H3 — cross-FK (challenge_id, submission_id) consistency
-- ===========================================================================

-- Composite FK target: UNIQUE (challenge_id, id). Redundant on id (PK) but
-- required for the children's composite FKs to resolve.
ALTER TABLE public.challenge_submissions
  ADD CONSTRAINT challenge_submissions_challenge_id_id_key
  UNIQUE (challenge_id, id);

-- Composite FK: challenge_votes. Keeps the existing single-column FKs intact
-- (per yagi's guide — double-bind invariant at DB level).
ALTER TABLE public.challenge_votes
  ADD CONSTRAINT challenge_votes_submission_challenge_consistency_fkey
  FOREIGN KEY (challenge_id, submission_id)
  REFERENCES public.challenge_submissions (challenge_id, id)
  ON DELETE CASCADE;

-- Composite FK: challenge_judgments.
ALTER TABLE public.challenge_judgments
  ADD CONSTRAINT challenge_judgments_submission_challenge_consistency_fkey
  FOREIGN KEY (challenge_id, submission_id)
  REFERENCES public.challenge_submissions (challenge_id, id)
  ON DELETE CASCADE;

-- Composite FK: showcase_challenge_winners.
ALTER TABLE public.showcase_challenge_winners
  ADD CONSTRAINT showcase_challenge_winners_submission_challenge_consistency_fkey
  FOREIGN KEY (challenge_id, submission_id)
  REFERENCES public.challenge_submissions (challenge_id, id)
  ON DELETE CASCADE;


-- ===========================================================================
-- 3. H4 — creators/studios role exclusivity + role-flip cleanup
-- ===========================================================================

-- 3a. Tighten UPDATE policies — role must match at mutation time.
DROP POLICY IF EXISTS creators_update_self ON public.creators;
CREATE POLICY creators_update_self ON public.creators
  FOR UPDATE
  USING (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'creator'
    )
  )
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'creator'
    )
  );

DROP POLICY IF EXISTS studios_update_self ON public.studios;
CREATE POLICY studios_update_self ON public.studios
  FOR UPDATE
  USING (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'studio'
    )
  )
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'studio'
    )
  );

-- 3b. Dual-role INSERT block triggers (defense against race after RLS).
CREATE OR REPLACE FUNCTION public.tg_creators_block_dual_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.studios WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'user % already has a studios row — role exclusivity', NEW.id
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_creators_block_dual_role
BEFORE INSERT ON public.creators
FOR EACH ROW
EXECUTE FUNCTION public.tg_creators_block_dual_role();

CREATE OR REPLACE FUNCTION public.tg_studios_block_dual_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.creators WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'user % already has a creators row — role exclusivity', NEW.id
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_studios_block_dual_role
BEFORE INSERT ON public.studios
FOR EACH ROW
EXECUTE FUNCTION public.tg_studios_block_dual_role();

-- 3c. Role-flip cleanup — NO-OP STUB (yagi Q2 pre-apply decision).
--
-- Stale creators/studios rows preserved by design. UPDATE blocked by 3a
-- role-match policies. G3/G6 read queries must join profiles.role to
-- display correct active persona. Historical attribution preserved for
-- showcase winners + submissions. Function retained as scaffold for
-- future re-introduction if persona retirement policy reverses; NO
-- TRIGGER is attached. SECURITY INVOKER (no DELETE, no privilege need).
CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Intentionally no-op. See migration header §3c design note.
  RETURN NEW;
END;
$$;

-- Historical-record COMMENTs so G3/G6 query authors don't assume 1:1 with
-- current profiles.role.
COMMENT ON TABLE public.creators IS
  'Phase 2.5 — AI creator persona. Row may persist after role flip; G3/G6 '
  'read queries must filter by current profiles.role.';

COMMENT ON TABLE public.studios IS
  'Phase 2.5 — AI studio org. Row may persist after role flip; G3/G6 read '
  'queries must filter by current profiles.role.';


-- ===========================================================================
-- 4. M1 — slug citext case-insensitive regex bypass
-- ===========================================================================

ALTER TABLE public.challenges
  DROP CONSTRAINT challenges_slug_check;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_slug_check CHECK (
    char_length(slug) BETWEEN 3 AND 80
    AND slug::text ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    AND slug::text !~ '^(new|gallery|submit|edit|judge|announce|admin)$'
    AND slug::text = lower(slug::text)
  );


-- ===========================================================================
-- 5. M2 — admin audit column binding (anti-spoof)
-- ===========================================================================

DROP POLICY IF EXISTS challenges_admin_insert ON public.challenges;
CREATE POLICY challenges_admin_insert ON public.challenges
  FOR INSERT
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS challenge_judgments_admin_all ON public.challenge_judgments;
CREATE POLICY challenge_judgments_admin_all ON public.challenge_judgments
  FOR ALL
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    AND admin_id = auth.uid()
  );

DROP POLICY IF EXISTS showcase_challenge_winners_admin_write ON public.showcase_challenge_winners;
CREATE POLICY showcase_challenge_winners_admin_write ON public.showcase_challenge_winners
  FOR ALL
  USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    AND announced_by = auth.uid()
  );
