-- Phase 4.x Wave C.5b amend_01 — auto-create profiles row on auth.users INSERT.
--
-- Background: Wave C.5b sub_01 retired the `/onboarding/role` selection page
-- as part of the persona-A lock (DECISIONS Q-094, Brand-only). The legacy
-- profile-creation step lived inside `completeProfileAction` driven by that
-- page; deleting it left signup flow with no profile creation. Result:
-- new users land on `/onboarding/workspace` and the bootstrap_workspace RPC
-- raises `profile_required`. Manual SQL was used as a stop-gap once.
--
-- This migration moves profile creation to a database trigger so the
-- application surface no longer carries the responsibility. New auth.users
-- INSERT → profiles row materialises in the same transaction.
--
-- Default role = 'client' since persona A = Brand-only active persona.
-- Phase 5 entry will revisit when the Artist intake surface comes online
-- (DECISIONS Q-094); the artist demo account in amend_02 is created via
-- the service-role admin path which can override the default role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handle citext;
  v_display_name text;
  v_locale text;
  v_attempt int := 0;
BEGIN
  -- handle: c_<8-char-md5> (matches profiles_handle_check ^[a-z0-9_-]{3,30}$).
  -- md5() returns lowercase hex, so the result is always [a-f0-9] — no
  -- escaping needed and no SQL injection vector despite the concatenation
  -- of NEW.email (md5 of any input is sanitised hex).
  -- Retry on collision: the handle UNIQUE constraint has its own backstop,
  -- but pre-checking lets us surface a clear error before INSERT.
  LOOP
    v_handle := ('c_' || substr(md5(NEW.id::text || COALESCE(NEW.email, '') || v_attempt::text), 1, 8))::citext;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE handle = v_handle);
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      RAISE EXCEPTION 'profile handle generation failed after 6 attempts for user_id=%', NEW.id;
    END IF;
  END LOOP;

  -- display_name: email local part fallback. Guard against empty local part
  -- (an email like "@example.com" — invalid but defensible on insert path)
  -- and against a NULL email entirely.
  v_display_name := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');
  IF v_display_name IS NULL THEN
    v_display_name := 'user';
  END IF;

  -- locale: prefer raw_user_meta_data (signup may set this), fall back to 'ko'.
  -- profiles.locale CHECK only allows 'ko' or 'en'; coerce anything else.
  v_locale := COALESCE(NEW.raw_user_meta_data->>'locale', 'ko');
  IF v_locale NOT IN ('ko', 'en') THEN
    v_locale := 'ko';
  END IF;

  -- Idempotent on profiles.id (the PK). Handle collision is guarded by the
  -- retry loop above; the application layer (sub_13 admin-create path)
  -- separately upserts and can override role on conflict.
  INSERT INTO public.profiles (id, handle, display_name, role, locale)
  VALUES (NEW.id, v_handle, v_display_name, 'client', v_locale)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Defense in depth: SECURITY DEFINER functions don't need EXECUTE granted
-- to be called by the trigger system, but blocking direct invocation by
-- authenticated/anon roles closes a privilege-escalation surface where a
-- user could call `SELECT public.handle_new_user(forged_record)` and try
-- to create a profile for an arbitrary uuid.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
