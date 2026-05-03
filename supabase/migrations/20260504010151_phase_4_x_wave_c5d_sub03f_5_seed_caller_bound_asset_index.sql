-- Wave C.5d sub_03f_5 F3 — seed_project_board_from_wizard hardening.
--
-- Codex K-05 (codex exec, 2026-05-04) HIGH-B finding: the existing seed
-- function from migration 20260429151821 is `SECURITY DEFINER` and is
-- granted to `authenticated`. It writes the three server-managed
-- columns on project_boards (attached_pdfs, attached_urls, asset_index)
-- using values supplied by the caller. The Wave C.5d sub_03f_2
-- table-level UPDATE revoke does NOT cover SECURITY DEFINER paths, so
-- a malicious client could invoke this RPC directly (bypassing
-- submitProjectAction's server-side asset_index recomputation and
-- caller-bound storage_key checks) and persist arbitrary R2 keys.
--
-- This migration replaces the function with a hardened version that:
--
--   1. Validates every storage_key in `p_initial_attached_pdfs` is
--      caller-bound. The accepted prefixes match
--      `add_project_board_pdf` (sub_03f_5 F2):
--        - `board-assets/<auth.uid()>/...`
--        - `project-wizard/<auth.uid()>/...`
--        - `project-board/<v_board_id>/...` (board belongs to project)
--      Anything else is rejected.
--
--   2. Validates every URL in `p_initial_attached_urls` is http or
--      https only. (Defense in depth — add_project_board_url already
--      enforces this, but the seed path predates that gate.)
--
--   3. Server-recomputes `asset_index` from the validated
--      attached_pdfs + attached_urls arrays. The `p_initial_asset_index`
--      parameter is retained for caller backwards compatibility but
--      its value is IGNORED. Canvas-derived entries are not built here
--      (parsing tldraw store snapshots in plpgsql is not supported);
--      the first saveBoardDocumentAction call after seed will rebuild
--      asset_index including canvas entries via the user-action's
--      TypeScript extractAssetIndex helper. Empty/near-empty documents
--      at wizard submit are the common case, so the gap is bounded.
--
--   4. Keeps the existing auth + project status gates (yagi_admin OR
--      project.created_by == caller, project.status == 'in_review').

-- LOOP 2 F3a: drop the older 3-arg overload from migration
-- 20260429124343 so an authenticated client can never reach the
-- legacy seed path that accepts an unvalidated caller-supplied
-- asset_index. PostgREST resolves overloads by argument set; with
-- this DROP, only the 5-arg hardened overload remains. The
-- TypeScript caller in submitProjectAction already passes 5 args,
-- so removing the 3-arg version does not affect any in-tree caller.
DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb, jsonb);

-- Helper function — caller-bound storage_key check used by the seed
-- function for every entry in p_initial_attached_pdfs. Mirrored on
-- add_project_board_pdf inside migration 20260504004349 so the two
-- write paths stay in sync.
CREATE OR REPLACE FUNCTION assert_caller_bound_pdf_storage_key(
  p_storage_key text,
  p_caller_id   uuid,
  p_board_id    uuid
) RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
    RAISE EXCEPTION 'caller-bound check: invalid storage_key (null/traversal/leading slash)';
  END IF;
  IF NOT (
    p_storage_key LIKE 'board-assets/' || p_caller_id::text || '/%'
    OR p_storage_key LIKE 'project-wizard/' || p_caller_id::text || '/%'
    OR p_storage_key LIKE 'project-board/' || p_board_id::text || '/%'
  ) THEN
    RAISE EXCEPTION 'caller-bound check: storage_key % not bound to caller % or board %',
      p_storage_key, p_caller_id, p_board_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  p_project_id            uuid,
  p_initial_document      jsonb,
  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb  -- ignored; kept for backwards compat
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_board_id          uuid;
  v_existing_board_id uuid;
  v_project_status    text;
  v_caller_id         uuid := auth.uid();
  v_pdf               jsonb;
  v_url               jsonb;
  v_url_text          text;
  v_pdf_entries       jsonb := '[]'::jsonb;
  v_url_entries       jsonb := '[]'::jsonb;
  v_asset_index       jsonb;
BEGIN
  -- Auth gate (unchanged from prior migration).
  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
  END IF;

  SELECT status INTO v_project_status
  FROM projects
  WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'project not found: %', p_project_id;
  END IF;

  IF v_project_status != 'in_review' THEN
    RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
      p_project_id, v_project_status;
  END IF;

  -- Resolve / pre-create the board id so caller-bound checks for
  -- `project-board/<v_board_id>/...` storage_keys can run before we
  -- accept any client-supplied attachments.
  SELECT id INTO v_existing_board_id
  FROM project_boards WHERE project_id = p_project_id;
  v_board_id := COALESCE(v_existing_board_id, gen_random_uuid());

  -- ---------- LOOP 2 F3b: reject non-array attachment payloads ----------
  -- The original validation skipped non-array values, but the upsert
  -- below still wrote `COALESCE(p_initial_attached_pdfs, '[]'::jsonb)`
  -- which would have persisted a malformed scalar/object as-is.
  -- Reject early so the upsert only ever sees a NULL or a real array.
  IF p_initial_attached_pdfs IS NOT NULL
     AND jsonb_typeof(p_initial_attached_pdfs) != 'array' THEN
    RAISE EXCEPTION
      'seed_project_board_from_wizard: p_initial_attached_pdfs must be a jsonb array or null (got %)',
      jsonb_typeof(p_initial_attached_pdfs);
  END IF;
  IF p_initial_attached_urls IS NOT NULL
     AND jsonb_typeof(p_initial_attached_urls) != 'array' THEN
    RAISE EXCEPTION
      'seed_project_board_from_wizard: p_initial_attached_urls must be a jsonb array or null (got %)',
      jsonb_typeof(p_initial_attached_urls);
  END IF;

  -- ---------- Validate attached_pdfs ----------
  IF p_initial_attached_pdfs IS NOT NULL THEN
    FOR v_pdf IN SELECT * FROM jsonb_array_elements(p_initial_attached_pdfs)
    LOOP
      PERFORM assert_caller_bound_pdf_storage_key(
        v_pdf->>'storage_key',
        v_caller_id,
        v_board_id
      );
    END LOOP;
  END IF;

  -- ---------- Validate attached_urls (http/https only) ----------
  IF p_initial_attached_urls IS NOT NULL THEN
    FOR v_url IN SELECT * FROM jsonb_array_elements(p_initial_attached_urls)
    LOOP
      v_url_text := v_url->>'url';
      IF v_url_text IS NULL
         OR length(v_url_text) = 0
         OR length(v_url_text) > 2000
         OR NOT (v_url_text ~* '^https?://') THEN
        RAISE EXCEPTION 'seed_project_board_from_wizard: attached_url scheme must be http or https (got %)',
          coalesce(left(v_url_text, 80), '<null>');
      END IF;
    END LOOP;
  END IF;

  -- ---------- Server-recompute asset_index from arrays ----------
  -- (sub_03f_5 F3 option A) Canvas-derived entries are not built here;
  -- the first saveBoardDocumentAction call rebuilds asset_index from
  -- the document via the TypeScript extractAssetIndex helper.
  -- p_initial_asset_index is intentionally ignored.
  IF p_initial_attached_pdfs IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',           pdf->>'id',
        'source',       'attached_pdf',
        'kind',         'pdf',
        'url',          pdf->>'storage_key',
        'title',        pdf->>'filename',
        'thumbnail_url', NULL,
        'filename',     pdf->>'filename',
        'size_bytes',   (pdf->>'size_bytes')::bigint,
        'note',         NULL,
        'added_at',     pdf->>'uploaded_at'
      )
      ORDER BY pdf->>'uploaded_at'
    ), '[]'::jsonb)
    INTO v_pdf_entries
    FROM jsonb_array_elements(p_initial_attached_pdfs) AS pdf;
  END IF;

  IF p_initial_attached_urls IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',           u->>'id',
        'source',       'attached_url',
        'kind',         'url',
        'url',          u->>'url',
        'title',        u->>'title',
        'thumbnail_url', u->>'thumbnail_url',
        'provider',     u->>'provider',
        'note',         u->>'note',
        'added_at',     u->>'added_at'
      )
      ORDER BY u->>'added_at'
    ), '[]'::jsonb)
    INTO v_url_entries
    FROM jsonb_array_elements(p_initial_attached_urls) AS u;
  END IF;

  v_asset_index := v_pdf_entries || v_url_entries;

  -- ---------- Upsert ----------
  INSERT INTO project_boards (
    id, project_id, document, attached_pdfs, attached_urls, asset_index, source
  )
  VALUES (
    v_board_id,
    p_project_id,
    p_initial_document,
    COALESCE(p_initial_attached_pdfs, '[]'::jsonb),
    COALESCE(p_initial_attached_urls, '[]'::jsonb),
    v_asset_index,
    'wizard_seed'
  )
  ON CONFLICT (project_id) DO UPDATE
    SET document      = EXCLUDED.document,
        attached_pdfs = EXCLUDED.attached_pdfs,
        attached_urls = EXCLUDED.attached_urls,
        asset_index   = EXCLUDED.asset_index,
        source        = 'wizard_seed',
        updated_at    = now()
  RETURNING id INTO v_board_id;

  RETURN v_board_id;
END;
$$;

COMMENT ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb, jsonb, jsonb) IS
  'Wave C.5d sub_03f_5 F3: caller-bound storage_key validation on every '
  'attached_pdf entry, http/https-only attached_url, server-recomputed '
  'asset_index from arrays (canvas entries added on first save). '
  'p_initial_asset_index parameter retained for caller compat but ignored.';
