-- =============================================================================
-- Phase 5 Wave A task_02 — Data migration: attached_pdfs/urls jsonb → briefing_documents
-- =============================================================================
--
-- PURPOSE:
--   Back-fill the new briefing_documents table (created in task_01:
--   20260504052541_phase_5_briefing_documents.sql) from the legacy
--   attached_pdfs / attached_urls jsonb arrays on project_boards.
--
-- DEPENDENCY:
--   MUST apply AFTER 20260504052541_phase_5_briefing_documents.sql.
--   The briefing_documents table must exist before this migration runs.
--
-- ONE-RUN-ONLY / IDEMPOTENCY:
--   The two INSERT … SELECT statements are NOT inherently idempotent —
--   re-running would create duplicate rows in briefing_documents.
--   Guard: a DO $$ BEGIN … END $$ block checks IF EXISTS (SELECT 1 FROM
--   briefing_documents LIMIT 1) before executing. If the table already has
--   any rows the block emits a NOTICE and returns without inserting.
--
--   Rationale: "any row present" is the cheapest possible sentinel that
--   requires zero schema changes. The table is empty at task_01 apply time
--   (no other code path populates it yet in Phase 5 Wave A). If a partial
--   run occurred and left orphan rows Builder must manually TRUNCATE
--   briefing_documents before re-applying; that case is called out in the
--   K-05 notes at the bottom of this file.
--
-- SPEC NOTE — source table correction:
--   The KICKOFF.md spec (lines 444–479) reads `FROM projects p,
--   jsonb_array_elements(p.attached_pdfs) AS item` and uses `p.created_by`
--   as a fallback. However, the attached_pdfs / attached_urls columns do NOT
--   exist on the projects table — they were added to project_boards in
--   Phase 3.1 hotfix-3 (20260429144523). Therefore this migration sources
--   data from project_boards (with a JOIN to projects for the created_by
--   fallback). All other column mappings follow the KICKOFF spec exactly.
--   This correction is documented in _wave_a_task_02_result.md.
--
-- COLUMNS NOT DROPPED:
--   project_boards.attached_pdfs and project_boards.attached_urls are NOT
--   dropped by this migration — per KICKOFF §제약 line 1031 (data preservation;
--   cleanup deferred to Wave D ff-merge hotfix or Phase 5.1).
--
-- =============================================================================
-- PRE-APPLY VERIFICATION (Builder runs manually before apply):
--
--   -- Count total PDF elements across all project_boards
--   SELECT
--     COUNT(*) AS board_count,
--     SUM(jsonb_array_length(attached_pdfs)) AS total_pdf_elements,
--     SUM(jsonb_array_length(attached_urls)) AS total_url_elements
--   FROM project_boards
--   WHERE (attached_pdfs IS NOT NULL AND jsonb_array_length(attached_pdfs) > 0)
--      OR (attached_urls IS NOT NULL AND jsonb_array_length(attached_urls) > 0);
--
--   -- Confirm briefing_documents is empty before migration
--   SELECT COUNT(*) FROM briefing_documents;
--   -- Expected: 0
--
-- =============================================================================
-- POST-APPLY VERIFICATION (Builder runs manually after apply):
--
--   -- Count rows in briefing_documents vs source jsonb element counts
--   SELECT
--     source_type,
--     COUNT(*) AS migrated_rows
--   FROM briefing_documents
--   WHERE kind = 'reference'
--   GROUP BY source_type;
--   -- migrated_rows for 'upload' should equal total_pdf_elements above
--   -- migrated_rows for 'url'    should equal total_url_elements above
--
--   -- Cross-check: no orphan rows (briefing_documents without a parent project)
--   SELECT COUNT(*) FROM briefing_documents bd
--   LEFT JOIN projects p ON p.id = bd.project_id
--   WHERE p.id IS NULL;
--   -- Expected: 0
--
--   -- Check for NULL storage_key (would violate briefing_documents_source_check)
--   -- (should be caught by the constraint, but worth verifying separately)
--   SELECT COUNT(*) FROM briefing_documents
--   WHERE source_type = 'upload' AND (storage_key IS NULL OR filename IS NULL);
--   -- Expected: 0
--
--   -- Check for NULL url (would violate briefing_documents_source_check)
--   SELECT COUNT(*) FROM briefing_documents
--   WHERE source_type = 'url' AND url IS NULL;
--   -- Expected: 0
--
-- =============================================================================

DO $$
BEGIN
  -- Idempotency guard: if any row already exists in briefing_documents,
  -- a previous run (or partial run) has already populated it. Skip to avoid
  -- duplicates. Builder must TRUNCATE briefing_documents manually if a
  -- partial run left orphan rows and a clean re-run is desired.
  IF EXISTS (SELECT 1 FROM briefing_documents LIMIT 1) THEN
    RAISE NOTICE 'briefing_documents already populated; skipping migrate (task_02 idempotency guard)';
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- INSERT 1: PDF uploads from project_boards.attached_pdfs
  --
  -- jsonb element shape (set by add_project_board_pdf RPC):
  --   { "id": "<uuid>", "storage_key": "<text>", "filename": "<text>",
  --     "size_bytes": <bigint>, "uploaded_at": "<timestamptz>",
  --     "uploaded_by": "<uuid>" }
  --
  -- Assumption: storage_key and filename are always non-null in well-formed
  -- entries (the RPC validates them). Rows where either is NULL are skipped by
  -- the briefing_documents_source_check constraint and will raise on INSERT.
  -- Builder should verify COUNT(*) matches pre-apply total_pdf_elements after
  -- apply.
  --
  -- Assumption: mime_type is not stored in the jsonb element by the existing
  -- RPC (add_project_board_pdf does not persist mime_type in the jsonb blob).
  -- COALESCE falls back to 'application/pdf' as specified in KICKOFF line 454.
  --
  -- Assumption: uploaded_at (not uploaded_at) is the timestamp field name —
  -- confirmed from RPC source in 20260429144523. KICKOFF uses 'uploaded_at'
  -- which matches the actual jsonb key.
  --
  -- Fallback for created_by: jsonb element uploaded_by → projects.created_by.
  -- project_boards does not have a created_by column; the join to projects
  -- provides the fallback owner (the project creator). This matches the spirit
  -- of the KICKOFF spec which used p.created_by from a (corrected) projects
  -- join.
  -- -------------------------------------------------------------------------
  INSERT INTO briefing_documents (
    project_id, kind, source_type,
    storage_key, filename, size_bytes, mime_type,
    created_at, created_by
  )
  SELECT
    p.id,
    'reference',
    'upload',
    (item->>'storage_key'),
    (item->>'filename'),
    (item->>'size_bytes')::bigint,
    COALESCE(item->>'mime_type', 'application/pdf'),
    COALESCE((item->>'uploaded_at')::timestamptz, p.created_at),
    COALESCE((item->>'uploaded_by')::uuid, p.created_by)
  FROM projects p
  JOIN project_boards pb ON pb.project_id = p.id,
  jsonb_array_elements(pb.attached_pdfs) AS item
  WHERE pb.attached_pdfs IS NOT NULL
    AND jsonb_array_length(pb.attached_pdfs) > 0;

  -- -------------------------------------------------------------------------
  -- INSERT 2: URL references from project_boards.attached_urls
  --
  -- jsonb element shape (set by add_project_board_url RPC, hotfix-3 version):
  --   { "id": "<uuid>", "url": "<text>", "title": <text|null>,
  --     "thumbnail_url": <text|null>, "provider": "<text>",
  --     "note": <text|null>, "added_at": "<timestamptz>",
  --     "added_by": "<uuid>" }
  --
  -- Assumption: 'added_at' / 'added_by' are the timestamp/user fields —
  -- confirmed from RPC source. KICKOFF spec uses these exact keys.
  --
  -- Assumption: provider is always non-null in well-formed entries
  -- (RPC validates it as 'youtube'/'vimeo'/'generic'). COALESCE to 'generic'
  -- matches KICKOFF line 471 as a safety net for legacy Phase 3.0 rows that
  -- may have been seeded before the provider validation was added.
  --
  -- Note: 'title' is stored in the jsonb element but briefing_documents has
  -- no 'title' column. Title is intentionally NOT migrated (no target column).
  -- This is documented in _wave_a_task_02_result.md.
  --
  -- Fallback for created_by: same pattern as INSERT 1 — jsonb added_by →
  -- projects.created_by.
  -- -------------------------------------------------------------------------
  INSERT INTO briefing_documents (
    project_id, kind, source_type,
    url, provider, thumbnail_url, note,
    created_at, created_by
  )
  SELECT
    p.id,
    'reference',
    'url',
    (item->>'url'),
    COALESCE(item->>'provider', 'generic'),
    (item->>'thumbnail_url'),
    (item->>'note'),
    COALESCE((item->>'added_at')::timestamptz, p.created_at),
    COALESCE((item->>'added_by')::uuid, p.created_by)
  FROM projects p
  JOIN project_boards pb ON pb.project_id = p.id,
  jsonb_array_elements(pb.attached_urls) AS item
  WHERE pb.attached_urls IS NOT NULL
    AND jsonb_array_length(pb.attached_urls) > 0;

  -- -------------------------------------------------------------------------
  -- sub_4 F4 sanity assertion (Wave A K-05 LOOP 1 MED-C deferred safety net)
  --
  -- Codex K-05 LOOP 1 flagged the theoretical risk that a deleted profile
  -- UUID inside attached_pdfs.uploaded_by / attached_urls.added_by would
  -- pass the ::uuid cast but violate briefing_documents.created_by REFERENCES
  -- profiles(id) on INSERT. Production audit at apply time confirmed 0
  -- stale UIDs (and 0 source elements) so the immediate risk is nil and the
  -- finding is FU-Phase5-1 deferred.
  --
  -- This assertion is the future-proof safety net: any orphan row that
  -- somehow survives both casts AND the FK enforcement (impossible in
  -- normal Postgres, but cheap to verify) will fail the migration loudly
  -- rather than silently leaving inconsistent data. Re-run safe — the
  -- assertion only loops over rows this migration just inserted, and
  -- because the migration is wrapped in an implicit transaction the
  -- failure rolls everything back.
  -- -------------------------------------------------------------------------
  DECLARE
    v_orphan_count int;
  BEGIN
    SELECT COUNT(*) INTO v_orphan_count
    FROM briefing_documents bd
    LEFT JOIN profiles p ON p.id = bd.created_by
    WHERE p.id IS NULL;
    IF v_orphan_count > 0 THEN
      RAISE EXCEPTION
        'sub_4 F4 assert failed: % orphan briefing_documents.created_by FK rows after migration',
        v_orphan_count;
    END IF;
  END;

END $$;

-- =============================================================================
-- K-05 NOTES (for Codex adversarial review):
--
-- 1. NULL safety: storage_key / filename NULLs in attached_pdfs elements will
--    cause INSERT to fail at the briefing_documents_source_check constraint
--    (source_type='upload' requires both non-null). Malformed elements from
--    pre-RPC direct DB writes (if any) would abort the DO block. Builder
--    should run the pre-apply NULL-check query above before apply.
--
-- 2. created_by FK validity: jsonb uploaded_by / added_by values are stored
--    as text-encoded UUIDs. COALESCE(...)::uuid cast will fail on malformed
--    values. The outer fallback to p.created_by (a FK-validated column on
--    projects) reduces but does not eliminate risk for the primary cast. If
--    the cast fails the entire DO block rolls back (it runs in a single
--    implicit transaction). No partial insert risk.
--
-- 3. Idempotency: guarded by the EXISTS check at block entry. Partial-run
--    risk exists if the Postgres session is interrupted mid-block (between
--    INSERT 1 and INSERT 2). In that case briefing_documents will have upload
--    rows but no url rows; the guard will fire on re-run and skip. Builder
--    must TRUNCATE briefing_documents and re-run. This is the accepted
--    tradeoff for the sentinel approach.
--
-- 4. Schema variance: Phase 3.0 had no attachment columns on project_boards
--    (they were added in hotfix-3 / 20260429144523). The DEFAULT '[]'::jsonb
--    on the columns means older boards have empty arrays; the WHERE
--    jsonb_array_length(...) > 0 guard skips them cleanly.
--    The hotfix-3 K-05 loop (20260429151910) fixed null-handling for
--    title/thumbnail_url/note using to_jsonb(). Those fields may be stored as
--    JSON null (not SQL NULL). `item->>'field'` on a JSON null returns SQL
--    NULL, which is safe for nullable columns.
--
-- 5. Apply gate: yagi confirm required before prod apply per KICKOFF lines
--    492-499. Data loss risk if applied incorrectly (no rollback for data
--    migration). Builder must receive explicit GO before mcp apply_migration.
--
-- 6. RLS bypass: this migration runs as the migration executor role (not an
--    authenticated user), so RLS does not apply during the INSERT. This is
--    correct and intentional — the migration is a one-time back-fill, not a
--    user-facing write.
-- =============================================================================
