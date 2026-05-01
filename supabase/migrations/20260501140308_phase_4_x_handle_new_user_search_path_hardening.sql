-- Phase 4.x Wave C.5b amend_01 hardening (Codex K-05 LOOP 1 F1).
-- Tighten search_path to follow the repo's stronger convention used by
-- transition_project_status / is_valid_transition / validate_profile_role_transition
-- (search_path = public, pg_temp). Defense vs pg_temp shadowing per
-- https://www.postgresql.org/docs/current/sql-createfunction.html.
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
