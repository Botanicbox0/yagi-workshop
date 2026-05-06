-- Phase 7 Wave C v2 — schema additions for HIGH-3 + MED-1 + MED-2.
--
-- Source-of-truth: .yagi-autobuild/phase-7/_wave_c_v2_spec.md
--   §3 HIGH-3 (work preview MIME column)
--   §4 MED-1 (find_user_by_email security-definer RPC)
--   §4 MED-2 + §11 #5 LOCKED (campaign_distributions multi-channel RLS)
--
-- Dependency:
--   - 20260506000000_phase_7_campaigns.sql (campaigns/submissions/distributions
--     tables + RLS + column-level GRANT lockdown)
--   - 20260506200000_phase_7_workspaces_kind_creator.sql (workspaces.kind
--     'creator' addition)
-- Both must be applied first; this migration assumes the campaigns schema
-- and the campaign_distributions_insert_applicant policy exist.
--
-- Apply via Supabase Dashboard SQL editor (Path B per yagi 2026-05-06 protocol).
-- Single transaction; verify queries in POST-MIGRATION VERIFY section below.
--
-- L-049 4-perspective audit (focused — no new tables, only one RPC + one
-- policy revision + one column add):
--   1. yagi_admin: unchanged. find_user_by_email service_role only;
--      RPC is bypass-safe by definition (existing user lookup is read-only).
--   2. ws_admin: unchanged. No new write paths to workspaces.
--   3. authenticated (creator/brand/artist): can now INSERT campaign_distributions
--      while parent submission.status IS DISTRIBUTED (in addition to
--      approved_for_distribution). Defense-in-depth: added_by=auth.uid() +
--      workspace_member of applicant_workspace_id still enforced.
--   4. anon: no change. Public has no INSERT path on campaign_distributions.
--
-- yagi-wording-rules: no user-facing copy in this migration.

BEGIN;

-- ===========================================================================
-- 1. find_user_by_email RPC (MED-1)
--
-- Replaces the .schema('auth').from('users') side-channel that K-05 LOOP-1
-- FINDING 3 flagged as non-portable on hosted Supabase. Security-definer SQL
-- function with explicit search_path (auth schema not exposed to public API
-- by default; security-definer + service_role grant is the supported path).
-- Stable so callers may cache via PostgREST (no side effects).
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO service_role;

COMMENT ON FUNCTION public.find_user_by_email(text) IS
  'Wave C v2 / MED-1: existing user lookup for anon submit flow. service_role only. '
  'Replaces .schema("auth").from("users") side-channel (K-05 LOOP-1 F3, '
  '.yagi-autobuild/phase-7/_wave_c_codex_review.md).';

-- ===========================================================================
-- 2. campaign_distributions multi-channel RLS (MED-2, §11 #5 LOCKED)
--
-- Preserve K-05 LOOP-1 F2 MED-A fix (added_by = auth.uid() binding +
-- workspace_member scoping); only expand the parent submission status set
-- to include 'distributed' so the SECOND, THIRD, ... channel registrations
-- after the first one auto-flips the submission to 'distributed' continue
-- to pass RLS WITH CHECK.
--
-- Note: SPEC §4 MED-2 example uses `cs.applicant_user_id = auth.uid()` but
-- that column does not exist on campaign_submissions yet — its addition is
-- tracked as FU-W2 (workspace 2nd member RLS hardening). Until that lands,
-- we keep the existing workspace_member scoping that base migration
-- 20260506000000:713-724 established.
-- ===========================================================================

DROP POLICY IF EXISTS campaign_distributions_insert_applicant ON campaign_distributions;

CREATE POLICY campaign_distributions_insert_applicant ON campaign_distributions
  FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM campaign_submissions s
      JOIN workspace_members wm ON wm.workspace_id = s.applicant_workspace_id
      WHERE s.id = campaign_distributions.submission_id
        AND wm.user_id = auth.uid()
        AND s.status IN ('approved_for_distribution', 'distributed')
    )
  );

COMMENT ON POLICY campaign_distributions_insert_applicant ON campaign_distributions IS
  'Wave C v2 / MED-2 (§11 #5 LOCKED): multi-channel support. Permits applicant '
  'INSERT while parent submission.status IS approved_for_distribution OR distributed. '
  'Preserves K-05 LOOP-1 F2 added_by binding + workspace_member scoping.';

-- ===========================================================================
-- 3. campaign_submissions.content_mime column (HIGH-3)
--
-- Stores the MIME type extracted by the R2 HEAD-check in
-- submitCampaignApplicationAction (HIGH-2 server-side validation). Read by
-- the WorkPreview component for media-aware rendering (image/* → <img>,
-- video/* → <video controls>, otherwise filename chip).
--
-- text plain (no enum) — allowed values are bounded at the application
-- layer (image/* | video/* | application/pdf) so future MIME family
-- expansion does not require a schema migration.
-- ===========================================================================

ALTER TABLE campaign_submissions
  ADD COLUMN IF NOT EXISTS content_mime text;

COMMENT ON COLUMN campaign_submissions.content_mime IS
  'Wave C v2 / HIGH-3: MIME type from R2 HEAD-check (image/* | video/* | application/pdf). '
  'Used by WorkPreview component for media-aware rendering. Application-layer '
  'whitelist; text-plain to allow future MIME family expansion without schema migration.';

COMMIT;

-- ===========================================================================
-- POST-MIGRATION VERIFY
--
-- Apply the BEGIN/COMMIT block above via Supabase Dashboard SQL editor, then
-- run these queries to confirm each change landed correctly. Paste each
-- result back to yagi for sign-off before STEP 3.
-- ===========================================================================

-- Verify 1 — find_user_by_email RPC exists with security-definer
-- expected: 1 row, prosecdef = true
--
-- SELECT proname, prosecdef
-- FROM pg_proc
-- WHERE proname = 'find_user_by_email';

-- Verify 2 — find_user_by_email grants: service_role only
-- expected: 1 row only (grantee = service_role, privilege_type = EXECUTE)
--
-- SELECT grantee, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_name = 'find_user_by_email'
--   AND routine_schema = 'public'
-- ORDER BY grantee;

-- Verify 3 — campaign_distributions_insert_applicant policy with_check
-- includes 'distributed' status
-- expected: with_check expression contains both 'approved_for_distribution'
-- and 'distributed'
--
-- SELECT polname, pg_get_expr(polwithcheck, polrelid) AS with_check
-- FROM pg_policy
-- WHERE polname = 'campaign_distributions_insert_applicant';

-- Verify 4 — campaign_submissions.content_mime column exists, type text
-- expected: 1 row, data_type = text, is_nullable = YES
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'campaign_submissions'
--   AND column_name = 'content_mime';

-- ===========================================================================
-- ROLLBACK (manual, commented — uncomment + apply only if explicit yagi instruction)
--
-- BEGIN;
--
-- -- Revert MED-2 (multi-channel RLS) → single-channel only
-- DROP POLICY IF EXISTS campaign_distributions_insert_applicant ON campaign_distributions;
-- CREATE POLICY campaign_distributions_insert_applicant ON campaign_distributions
--   FOR INSERT TO authenticated
--   WITH CHECK (
--     added_by = auth.uid()
--     AND EXISTS (
--       SELECT 1 FROM campaign_submissions s
--       JOIN workspace_members wm ON wm.workspace_id = s.applicant_workspace_id
--       WHERE s.id = campaign_distributions.submission_id
--         AND wm.user_id = auth.uid()
--         AND s.status = 'approved_for_distribution'
--     )
--   );
--
-- -- Revert MED-1 (RPC) — drop function (reverts to .schema('auth') side-channel)
-- DROP FUNCTION IF EXISTS public.find_user_by_email(text);
--
-- -- Revert HIGH-3 (content_mime) — column drop is destructive (mime data lost)
-- -- ALTER TABLE campaign_submissions DROP COLUMN IF EXISTS content_mime;
-- -- ↑ uncomment ONLY with explicit yagi instruction; column deletion is irreversible
-- -- without backup.
--
-- COMMIT;
-- ===========================================================================
