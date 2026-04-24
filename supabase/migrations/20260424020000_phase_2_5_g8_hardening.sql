-- Phase 2.5 G8 — Consolidated hardening for Codex K-05 findings.
-- Addresses: K05-001 (submission SELECT leak), K05-002 (vote SELECT leak +
-- aggregate RPC), K05-003 (submission content trigger), K05-005 (state
-- transition trigger). K05-004 + K05-006 are app-layer (T2).

BEGIN;

-- ========================================================================
-- K05-001 — challenge_submissions_select: split into 3 policies
-- ========================================================================

DROP POLICY IF EXISTS challenge_submissions_select ON public.challenge_submissions;

-- Public read: only status='ready' AND parent challenge is in a public state.
CREATE POLICY challenge_submissions_select_public
  ON public.challenge_submissions
  FOR SELECT
  USING (
    status = 'ready'
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_submissions.challenge_id
        AND c.state IN ('open','closed_judging','closed_announced','archived')
    )
  );

-- Owner read: own rows at any status.
CREATE POLICY challenge_submissions_select_owner
  ON public.challenge_submissions
  FOR SELECT
  USING (submitter_id = (select auth.uid()));

-- Admin read: all rows (moderation).
CREATE POLICY challenge_submissions_select_admin
  ON public.challenge_submissions
  FOR SELECT
  USING (public.is_yagi_admin((select auth.uid())));

-- ========================================================================
-- K05-002 — challenge_votes_select: drop public, add owner/admin, add RPC
-- ========================================================================

DROP POLICY IF EXISTS challenge_votes_select ON public.challenge_votes;

CREATE POLICY challenge_votes_select_owner
  ON public.challenge_votes
  FOR SELECT
  USING (voter_id = (select auth.uid()));

CREATE POLICY challenge_votes_select_admin
  ON public.challenge_votes
  FOR SELECT
  USING (public.is_yagi_admin((select auth.uid())));

-- Aggregate RPC for anonymous/authenticated count-only access.
-- SECURITY DEFINER so it bypasses the narrowed RLS above while returning
-- ONLY aggregate counts (no voter_id leaks).
CREATE OR REPLACE FUNCTION public.get_submission_vote_counts(
  p_challenge_id uuid
)
RETURNS TABLE(submission_id uuid, vote_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT v.submission_id, count(*)::bigint AS vote_count
      FROM public.challenge_votes v
     WHERE v.challenge_id = p_challenge_id
     GROUP BY v.submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_submission_vote_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_submission_vote_counts(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_submission_vote_counts(uuid) IS
  'Phase 2.5 G8 hardening (K05-002). Returns per-submission vote counts for a challenge. Aggregate-only — no voter_id leak.';

-- ========================================================================
-- K05-003 — challenge_submissions content/status validation trigger
-- ========================================================================

CREATE OR REPLACE FUNCTION public.validate_challenge_submission_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_state text;
  v_min_chars int;
  v_max_chars int;
  v_text text;
BEGIN
  -- Fetch parent challenge state + text_description bounds.
  SELECT state,
         COALESCE((submission_requirements->'text_description'->>'min_chars')::int, 50),
         COALESCE((submission_requirements->'text_description'->>'max_chars')::int, 2000)
    INTO v_state, v_min_chars, v_max_chars
    FROM public.challenges
   WHERE id = NEW.challenge_id;

  -- Challenge must be open for INSERT or UPDATE of submitter's own row.
  IF TG_OP = 'INSERT' AND v_state <> 'open' THEN
    RAISE EXCEPTION 'challenge_not_open' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND v_state <> 'open' THEN
    RAISE EXCEPTION 'challenge_locked' USING ERRCODE = '23514';
  END IF;

  -- status transition enforcement: only 'ready' allowed on INSERT.
  -- ('created' / 'processing' / 'rejected' are reserved for future admin/server-action paths.)
  IF TG_OP = 'INSERT' AND NEW.status <> 'ready' THEN
    RAISE EXCEPTION 'invalid_submission_status' USING ERRCODE = '23514';
  END IF;

  -- On UPDATE, status flips to 'rejected' are admin-only (handled by separate
  -- admin RLS path); owner path cannot change status.
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_yagi_admin((select auth.uid())) THEN
      RAISE EXCEPTION 'status_change_admin_only' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- content must be a JSON object.
  IF jsonb_typeof(NEW.content) <> 'object' THEN
    RAISE EXCEPTION 'content_must_be_object' USING ERRCODE = '22023';
  END IF;

  -- text_description bounds (always required per SPEC §1).
  v_text := NEW.content->>'text_description';
  IF v_text IS NULL OR char_length(v_text) < v_min_chars OR char_length(v_text) > v_max_chars THEN
    RAISE EXCEPTION 'text_description_out_of_bounds' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_challenge_submission_content() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_challenge_submission_content
  ON public.challenge_submissions;

CREATE TRIGGER trg_validate_challenge_submission_content
  BEFORE INSERT OR UPDATE ON public.challenge_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_challenge_submission_content();

COMMENT ON FUNCTION public.validate_challenge_submission_content() IS
  'Phase 2.5 G8 hardening (K05-003). Validates content/status on direct table writes; status changes from non-admin paths are rejected.';

-- ========================================================================
-- K05-005 — challenge.state transition trigger
-- ========================================================================

CREATE OR REPLACE FUNCTION public.validate_challenge_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only run when state actually changes.
  IF NEW.state IS NOT DISTINCT FROM OLD.state THEN
    RETURN NEW;
  END IF;

  -- Allowed transitions mirror src/lib/challenges/state-machine.ts.
  IF NOT (
    (OLD.state = 'draft'            AND NEW.state = 'open')
    OR (OLD.state = 'open'             AND NEW.state = 'closed_judging')
    OR (OLD.state = 'closed_judging'   AND NEW.state IN ('closed_announced','open'))
    OR (OLD.state = 'closed_announced' AND NEW.state = 'archived')
  ) THEN
    RAISE EXCEPTION 'invalid_state_transition'
      USING ERRCODE = '23514',
            DETAIL = format('from=%s to=%s', OLD.state, NEW.state);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_challenge_state_transition() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_challenge_state_transition
  ON public.challenges;

CREATE TRIGGER trg_validate_challenge_state_transition
  BEFORE UPDATE OF state ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_challenge_state_transition();

COMMENT ON FUNCTION public.validate_challenge_state_transition() IS
  'Phase 2.5 G8 hardening (K05-005). Enforces allowed state transitions on direct admin UPDATE.';

COMMIT;
