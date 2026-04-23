-- Phase 2.5 G2 — handle_history table + change_handle RPC.
--
-- Per G2 Decision Package §E (90-day lock + anti-squatting):
--   - Users may change handle once per 90 days.
--   - Old handles are permanently retired (never reclaimable by anyone,
--     including the original owner on a later change).
--
-- Surface:
--   - public.handle_history — audit trail, one row per change
--   - public.change_handle(citext) — atomic RPC enforcing lock + retirement
--   - public.is_handle_available(citext) — read-only check (profiles UNION
--     retired history)
--
-- Callers:
--   - Onboarding profile pages validate availability via is_handle_available
--     before attempting INSERT (defense in depth; profiles.handle UNIQUE +
--     handle_history.old_handle UNIQUE catch races).
--   - Settings profile form calls change_handle on handle change.

-- ===========================================================================
-- 1. handle_history table
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.handle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_handle citext NOT NULL,
  new_handle citext NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Anti-squatting: once a handle appears as old_handle, no one (not even the
-- original owner) can claim it again. citext UNIQUE → case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS handle_history_old_handle_unique
  ON public.handle_history (old_handle);

-- Per-user history lookup (most recent first)
CREATE INDEX IF NOT EXISTS handle_history_user_id_changed_at_idx
  ON public.handle_history (user_id, changed_at DESC);

ALTER TABLE public.handle_history ENABLE ROW LEVEL SECURITY;

-- Owner can read their own history
DROP POLICY IF EXISTS handle_history_owner_select ON public.handle_history;
CREATE POLICY handle_history_owner_select ON public.handle_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all
DROP POLICY IF EXISTS handle_history_admin_select ON public.handle_history;
CREATE POLICY handle_history_admin_select ON public.handle_history
  FOR SELECT
  USING (public.is_yagi_admin(auth.uid()));

-- No direct INSERT/UPDATE/DELETE policies — all writes go through
-- change_handle RPC (security definer). Default-deny under RLS.

-- ===========================================================================
-- 2. is_handle_available(citext) — read-only availability check
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.is_handle_available(candidate citext)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE handle = candidate
    UNION ALL
    SELECT 1 FROM public.handle_history WHERE old_handle = candidate
    LIMIT 1
  );
$$;

REVOKE ALL ON FUNCTION public.is_handle_available(citext) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_handle_available(citext) TO authenticated, anon;

COMMENT ON FUNCTION public.is_handle_available(citext) IS
  'Returns true if handle is not held by any profile and has not been retired via handle_history. Case-insensitive via citext.';

-- ===========================================================================
-- 3. change_handle(citext) — atomic handle change with lock + retirement
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT handle, handle_changed_at
    INTO v_current_handle, v_last_changed
    FROM public.profiles
   WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_current_handle IS NULL THEN
    RAISE EXCEPTION 'handle_not_yet_set' USING ERRCODE = '22023';
  END IF;

  IF v_current_handle = new_handle_input THEN
    RAISE EXCEPTION 'handle_unchanged' USING ERRCODE = '22023';
  END IF;

  -- 90-day lock: enforce from last change
  IF v_last_changed IS NOT NULL THEN
    v_lock_end := v_last_changed + INTERVAL '90 days';
    IF now() < v_lock_end THEN
      RAISE EXCEPTION 'handle_change_locked'
        USING ERRCODE = '23514',
              DETAIL = 'unlock_at=' || v_lock_end::text;
    END IF;
  END IF;

  -- Availability check (both profiles + retired history)
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

  -- Atomic: record history + update profile (single transaction via function)
  INSERT INTO public.handle_history (user_id, old_handle, new_handle)
  VALUES (v_user_id, v_current_handle, new_handle_input);

  UPDATE public.profiles
     SET handle = new_handle_input,
         handle_changed_at = now()
   WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.change_handle(citext) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_handle(citext) TO authenticated;

COMMENT ON FUNCTION public.change_handle(citext) IS
  'Atomically rename the calling user handle. Enforces 90-day lock + anti-squatting via handle_history. Raises structured errors (ERRCODE): 42501 not_authenticated, 23514 handle_change_locked (DETAIL unlock_at=...), 23505 handle_taken/handle_retired.';
