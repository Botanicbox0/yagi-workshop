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
DO $$
DECLARE
  v_table_update boolean;
  v_doc_update   boolean;
  v_asset_update boolean;
  v_pdfs_update  boolean;
  v_urls_update  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'project_boards'
      AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  ) INTO v_table_update;
  IF v_table_update THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has table-level UPDATE on project_boards';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'project_boards'
      AND column_name = 'document' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  ) INTO v_doc_update;
  IF NOT v_doc_update THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost UPDATE on project_boards.document';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'project_boards'
      AND column_name = 'asset_index' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  ) INTO v_asset_update;
  IF v_asset_update THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.asset_index';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'project_boards'
      AND column_name = 'attached_pdfs' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  ) INTO v_pdfs_update;
  IF v_pdfs_update THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.attached_pdfs';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'project_boards'
      AND column_name = 'attached_urls' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  ) INTO v_urls_update;
  IF v_urls_update THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.attached_urls';
  END IF;
END $$;
