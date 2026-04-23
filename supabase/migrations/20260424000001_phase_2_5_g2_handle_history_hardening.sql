-- Phase 2.5 G2 hardening v1 — closes Codex K-05 findings on G2 main migration.
--
-- Codex K-05 on 20260424000000_phase_2_5_g2_handle_history.sql returned HIGH:
--   H1 (HIGH) — is_handle_available GRANT EXECUTE TO anon exposed
--     handle_history audit content (retired handles) to unauthenticated
--     callers, bypassing owner/admin-only SELECT policies.
--   M1 (MED)  — change_handle race window between precheck and INSERT: loser
--     received bare '23505 unique_violation' instead of documented structured
--     'handle_taken' / 'handle_retired' errors.
--   M2 (MED)  — handle_history ENABLE RLS without FORCE. Table owner (postgres
--     via Supabase managed migrations role) could bypass RLS. EXPLICITLY
--     DEFERRED to FU-13 Phase 2.6 system-wide FORCE RLS rollout (rationale
--     below).
--   L1 (LOW)  — ERRCODE '22023' (invalid_parameter_value) misapplied to
--     state-dependent failures (handle_not_yet_set, handle_unchanged).
--   L2 (LOW)  — is_handle_available(NULL) returned true. Should guard.
--   L3 (LOW)  — change_handle(NULL) hit NOT NULL constraint instead of
--     structured error.
--
-- Fixes (yagi GO fix-all 2026-04-23):
--   §1  H1 — REVOKE EXECUTE ON is_handle_available FROM anon. Authenticated
--            callers remain granted (all onboarding/profile/<role> pages are
--            behind auth). Settings handle-change UI is also behind auth.
--   §2  M2 — SKIPPED (deferred). handle_history alone gaining FORCE RLS
--            while profiles/creators/studios/challenges/etc. remain
--            ENABLE-only would be inconsistent defense. FU-13 in Phase 2.6
--            performs coordinated system-wide rollout alongside FU-8
--            auth.uid() optimization (single PR blast radius, single Codex
--            K-05 pass covers all tables). Risk in isolation: MED — table
--            owner RLS bypass possible but Supabase managed role leakage is
--            rare. Not a HIGH; defense in depth.
--   §3  L2 — is_handle_available rewritten LANGUAGE sql → plpgsql with
--            explicit NULL guard returning false. CREATE OR REPLACE
--            preserves authenticated grant (anon revoked in §1 stays
--            revoked — Postgres grants are persisted at function-object
--            level, not rewritten on CREATE OR REPLACE).
--   §4  L3 + L1 + M1 — change_handle rewritten:
--            - NULL input guard raises 'handle_invalid' ERRCODE '22023'
--              (genuine invalid_parameter_value — input is literal NULL).
--            - handle_not_yet_set / handle_unchanged re-assigned ERRCODE
--              '55000' (object_not_in_prerequisite_state — correct class
--              for state-dependent prerequisite failures).
--            - SELECT ... FOR UPDATE on profiles row to serialize concurrent
--              change_handle calls by same user.
--            - EXCEPTION WHEN unique_violation block + GET STACKED
--              DIAGNOSTICS CONSTRAINT_NAME to remap raw 23505 to structured
--              'handle_taken' (profiles_handle_key) or 'handle_retired'
--              (handle_history_old_handle_unique). Unknown constraint =
--              re-RAISE to preserve bug visibility.
--
-- Residual risk after hardening v1:
--   - FORCE RLS deferred (M2 → FU-13 Phase 2.6). See header §2 rationale.
--   - UNION ALL in is_handle_available not converted to OR EXISTS (FU-11,
--     Phase 2.6 perf sweep). Current load: zero.

-- ===========================================================================
-- §1. H1 fix — revoke anon execute on is_handle_available
-- ===========================================================================

REVOKE EXECUTE ON FUNCTION public.is_handle_available(citext) FROM anon;

-- ===========================================================================
-- §3. L2 fix — is_handle_available NULL guard (plpgsql rewrite)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.is_handle_available(candidate citext)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF candidate IS NULL THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE handle = candidate
    UNION ALL
    SELECT 1 FROM public.handle_history WHERE old_handle = candidate
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION public.is_handle_available(citext) IS
  'Returns true if handle is not held by any profile and has not been retired via handle_history. NULL input returns false. Case-insensitive via citext. authenticated-only (anon revoked per G2 hardening v1 H1).';

-- ===========================================================================
-- §4. L3 + L1 + M1 fix — change_handle rewrite with NULL guard, corrected
-- ERRCODE semantics, row-level serialization, and unique_violation remap.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.change_handle(new_handle_input citext)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_handle citext;
  v_last_changed timestamptz;
  v_lock_end timestamptz;
  v_constraint text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- L3: NULL input guard — genuine invalid_parameter_value
  IF new_handle_input IS NULL THEN
    RAISE EXCEPTION 'handle_invalid' USING ERRCODE = '22023';
  END IF;

  -- M1: Serialize concurrent change_handle by same user via row lock.
  -- Two sessions of the same user attempting simultaneous changes will
  -- queue on this SELECT; the second caller re-reads updated state and
  -- hits handle_change_locked or handle_unchanged instead of racing.
  SELECT handle, handle_changed_at
    INTO v_current_handle, v_last_changed
    FROM public.profiles
   WHERE id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- L1: 55000 object_not_in_prerequisite_state — handle not claimed yet,
  -- so change_handle has no source to rename from (should use claim flow).
  IF v_current_handle IS NULL THEN
    RAISE EXCEPTION 'handle_not_yet_set' USING ERRCODE = '55000';
  END IF;

  -- L1: 55000 — idempotent duplicate submission of current value.
  IF v_current_handle = new_handle_input THEN
    RAISE EXCEPTION 'handle_unchanged' USING ERRCODE = '55000';
  END IF;

  -- 90-day lock
  IF v_last_changed IS NOT NULL THEN
    v_lock_end := v_last_changed + INTERVAL '90 days';
    IF now() < v_lock_end THEN
      RAISE EXCEPTION 'handle_change_locked'
        USING ERRCODE = '23514',
              DETAIL = 'unlock_at=' || v_lock_end::text;
    END IF;
  END IF;

  -- Optimistic availability precheck (best-effort UX — authoritative race
  -- winner is the atomic INSERT below).
  IF EXISTS (
    SELECT 1 FROM public.profiles
     WHERE handle = new_handle_input AND id <> v_user_id
  ) THEN
    RAISE EXCEPTION 'handle_taken' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.handle_history WHERE old_handle = new_handle_input
  ) THEN
    RAISE EXCEPTION 'handle_retired' USING ERRCODE = '23505';
  END IF;

  -- M1: Atomic INSERT + UPDATE. EXCEPTION WHEN unique_violation catches
  -- the race window between the precheck and index commit, remapping the
  -- raw 23505 to structured application errors by constraint name.
  -- plpgsql BEGIN ... EXCEPTION implicitly opens a subtransaction
  -- (savepoint), so a failed INSERT does not partial-apply: the caller
  -- sees a structured RAISE, nothing was written.
  BEGIN
    INSERT INTO public.handle_history (user_id, old_handle, new_handle)
    VALUES (v_user_id, v_current_handle, new_handle_input);

    UPDATE public.profiles
       SET handle = new_handle_input,
           handle_changed_at = now()
     WHERE id = v_user_id;

  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    IF v_constraint = 'handle_history_old_handle_unique' THEN
      RAISE EXCEPTION 'handle_retired' USING ERRCODE = '23505';
    ELSIF v_constraint = 'profiles_handle_key' THEN
      RAISE EXCEPTION 'handle_taken' USING ERRCODE = '23505';
    ELSE
      -- Unknown constraint — re-raise with full context for bug visibility.
      RAISE;
    END IF;
  END;
END;
$$;

COMMENT ON FUNCTION public.change_handle(citext) IS
  'Atomically rename the calling user handle. Enforces 90-day lock + anti-squatting via handle_history. Structured errors: 42501 not_authenticated, 22023 handle_invalid (NULL), 55000 handle_not_yet_set / handle_unchanged, 23514 handle_change_locked (DETAIL unlock_at=...), 23505 handle_taken / handle_retired. Hardening v1 (2026-04-23) added row-level lock + unique_violation remap via CONSTRAINT_NAME.';
