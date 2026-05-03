-- Wave C.5d sub_03f_2 — close the project_boards UPDATE bypass.
--
-- Phase 3.1 hotfix-3 (migration 20260429151821) tried to seal the three
-- server-managed columns on project_boards (attached_pdfs, attached_urls,
-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
-- role still holds table-level UPDATE: Postgres column privileges
-- evaluate as max(table-grant, column-grant). The default Supabase
-- bootstrap grants table-level UPDATE to `authenticated` on every public
-- table, so PostgREST clients have been able to UPDATE attached_pdfs /
-- attached_urls / asset_index directly, bypassing
-- add_project_board_pdf / add_project_board_url RPC validation
-- (count cap, URL scheme allowlist, lock state) and the asset_index
-- trust boundary (server-recomputed from document + attached_*).
--
-- Codex generic K-05 review (Phase 4.x branch, 2026-05-03) flagged this
-- as P1.
--
-- Lockdown:
--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
--   2. GRANT  UPDATE (document, updated_at) TO authenticated
--
-- After this migration, the only columns an authenticated PostgREST
-- client can UPDATE on project_boards are `document` (the user's own
-- tldraw store snapshot) and `updated_at` (timestamp the user can
-- trigger via document edits). All other columns flow through:
--   - add_project_board_pdf       (SECURITY DEFINER RPC)
--   - add_project_board_url       (SECURITY DEFINER RPC)
--   - toggle_project_board_lock   (SECURITY DEFINER RPC)
--   - service-role client inside board-actions.ts (asset_index updates
--     in saveBoardDocumentAction, restoreVersionAction, and the
--     recomputeAndUpdateAssetIndex helper)
--
-- The companion source-code refactor in
-- src/app/[locale]/app/projects/[id]/board-actions.ts is shipped in the
-- same Wave C.5d sub_03f_2 commit so the autosave / restore / repair
-- paths keep working under the new grant.

REVOKE UPDATE ON project_boards FROM authenticated;
GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;

-- Sanity assertions — fail the migration if the privilege state is not
-- what we expect, so we never silently ship a half-applied lockdown.
--
-- Wave C.5d sub_03f_5 F5: information_schema.role_table_grants /
-- column_privileges only see direct grants to the named role; they do
-- not surface privileges inherited via PUBLIC or via role membership.
-- Use has_table_privilege() / has_column_privilege() instead — those
-- check effective privileges (the same path PostgREST evaluates) so
-- the assertion catches drift through any inheritance chain.
DO $$
BEGIN
  -- Effective table-level UPDATE must be denied to authenticated.
  IF has_table_privilege('authenticated', 'public.project_boards', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards (check PUBLIC + inherited grants)';
  END IF;

  -- Effective column-level UPDATE must remain on the explicitly granted
  -- columns the action layer relies on.
  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'document', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.document';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.updated_at';
  END IF;

  -- Effective column-level UPDATE must be denied on every server-managed
  -- column. asset_index, attached_pdfs, attached_urls, is_locked,
  -- locked_by, locked_at, schema_version, source, project_id, id flow
  -- through SECURITY DEFINER RPCs or the service-role client.
  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.is_locked';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_by';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_at';
  END IF;
END $$;
