# Wave A task_02 — Result

> Authored 2026-05-03 by Sonnet 4.6 teammate.
> Phase 5 Wave A — Data migration attached_pdfs/urls → briefing_documents.

## Status: SHIPPED

## Commit SHA

`457ec47`

## Migration filename

`supabase/migrations/20260504053641_phase_5_migrate_attached_to_briefing_documents.sql`

Timestamp `20260504053641` = 11 minutes after task_01's `20260504052541` (satisfies
the 60-second minimum ordering requirement).

Dependency on task_01: `20260504052541_phase_5_briefing_documents.sql` must be
applied first. The briefing_documents table must exist before this migration runs.

## Idempotency mechanism

**DO/EXISTS sentinel.**

```sql
IF EXISTS (SELECT 1 FROM briefing_documents LIMIT 1) THEN
  RAISE NOTICE 'briefing_documents already populated; skipping migrate ...';
  RETURN;
END IF;
```

Justification: The briefing_documents table is empty at task_01 apply time —
no other Phase 5 Wave A code path inserts into it. "Any row present" is therefore
an unambiguous sentinel that requires zero schema changes (no sentinel-row table,
no boolean flag column). The tradeoff is that a partial-run orphan (INSERT 1
succeeded, INSERT 2 interrupted) would block a clean re-run; Builder must
`TRUNCATE briefing_documents` and re-run in that case. This risk is documented in
the K-05 notes section of the migration file.

## SPEC CORRECTION — source table

**KICKOFF.md lines 444–479 say `FROM projects p, jsonb_array_elements(p.attached_pdfs)`
but `attached_pdfs` / `attached_urls` DO NOT EXIST on the `projects` table.**

They were added to `project_boards` in Phase 3.1 hotfix-3
(`20260429144523_phase_3_1_hotfix_3_attachments.sql`). The migration corrects
this to:

```sql
FROM projects p
JOIN project_boards pb ON pb.project_id = p.id,
jsonb_array_elements(pb.attached_pdfs) AS item
```

The JOIN to `projects` is retained because `project_boards` has no `created_by`
column — the fallback `COALESCE((item->>'uploaded_by')::uuid, p.created_by)` needs
`projects.created_by`. All other column mappings follow the KICKOFF spec literally.

## jsonb shape assumptions

### attached_pdfs element (confirmed from RPC source in 20260429144523 + 20260429151821)

```json
{
  "id":          "<uuid as text>",
  "storage_key": "<text>",
  "filename":    "<text>",
  "size_bytes":  <integer>,
  "uploaded_at": "<timestamptz as text>",
  "uploaded_by": "<uuid as text>"
}
```

- `mime_type` is NOT stored by the RPC. `COALESCE(item->>'mime_type', 'application/pdf')` always falls back to `'application/pdf'` for all existing rows.
- `storage_key` and `filename` are always non-null in RPC-written entries (validated by the RPC). Pre-RPC direct writes (if any) could have NULL values — those would fail the `briefing_documents_source_check` constraint and abort the transaction.

### attached_urls element (confirmed from RPC source + hotfix-3 K-05 fix)

```json
{
  "id":            "<uuid as text>",
  "url":           "<text>",
  "title":         <text or JSON null>,
  "thumbnail_url": <text or JSON null>,
  "provider":      "<text>",
  "note":          <text or JSON null>,
  "added_at":      "<timestamptz as text>",
  "added_by":      "<uuid as text>"
}
```

- `title` is present in the jsonb but `briefing_documents` has no `title` column. Title is NOT migrated — no data loss from the briefing_documents perspective since the column doesn't exist in the target schema.
- `thumbnail_url` and `note` may be JSON null (stored as `to_jsonb(null)`) per hotfix-3 K-05 loop fix. `item->>'field'` on a JSON null returns SQL NULL — safe for nullable target columns.
- `provider` validated by RPC as 'youtube'/'vimeo'/'generic'. Pre-hotfix-3 Phase 3.0 rows did not validate provider — COALESCE to 'generic' handles any NULL case.

### Schema variance across Phase 3.0 vs Phase 3.1 hotfix-3

- Phase 3.0 (`20260427164421`): no attachment columns on project_boards.
- Phase 3.1 hotfix-3 (`20260429144523`): `attached_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb` and `attached_urls jsonb NOT NULL DEFAULT '[]'::jsonb` added to `project_boards`.
- All boards created before hotfix-3 have empty arrays. The `WHERE jsonb_array_length(...) > 0` guard skips them cleanly — no rows migrated for empty-array boards.

## Pre-apply verify queries

```sql
-- Count total elements across all project_boards before migration
SELECT
  COUNT(*) AS board_count,
  SUM(jsonb_array_length(attached_pdfs)) AS total_pdf_elements,
  SUM(jsonb_array_length(attached_urls)) AS total_url_elements
FROM project_boards
WHERE (attached_pdfs IS NOT NULL AND jsonb_array_length(attached_pdfs) > 0)
   OR (attached_urls IS NOT NULL AND jsonb_array_length(attached_urls) > 0);

-- Confirm briefing_documents is empty before migration
SELECT COUNT(*) FROM briefing_documents;
-- Expected: 0

-- Check for NULL storage_key/filename (would fail source_check constraint)
SELECT pb.id AS board_id, item
FROM project_boards pb,
     jsonb_array_elements(pb.attached_pdfs) AS item
WHERE (item->>'storage_key') IS NULL
   OR (item->>'filename') IS NULL;
-- Expected: 0 rows

-- Check for NULL url in attached_urls
SELECT pb.id AS board_id, item
FROM project_boards pb,
     jsonb_array_elements(pb.attached_urls) AS item
WHERE (item->>'url') IS NULL;
-- Expected: 0 rows
```

## Post-apply verify queries

```sql
-- Row counts by source_type — must equal pre-apply pdf/url element counts
SELECT source_type, COUNT(*) AS migrated_rows
FROM briefing_documents
WHERE kind = 'reference'
GROUP BY source_type;

-- Cross-check: no orphan rows (briefing_documents without a parent project)
SELECT COUNT(*) FROM briefing_documents bd
LEFT JOIN projects p ON p.id = bd.project_id
WHERE p.id IS NULL;
-- Expected: 0

-- Verify no source_check violations slipped through
SELECT COUNT(*) FROM briefing_documents
WHERE source_type = 'upload' AND (storage_key IS NULL OR filename IS NULL);
-- Expected: 0

SELECT COUNT(*) FROM briefing_documents
WHERE source_type = 'url' AND url IS NULL;
-- Expected: 0

-- Spot-check: sample rows from each source_type
SELECT id, project_id, source_type, storage_key, filename, created_at, created_by
FROM briefing_documents WHERE source_type = 'upload' LIMIT 5;

SELECT id, project_id, source_type, url, provider, created_at, created_by
FROM briefing_documents WHERE source_type = 'url' LIMIT 5;
```

## K-05-relevant items

1. **NULL safety in jsonb casts**: `(item->>'size_bytes')::bigint` will raise on non-numeric values. The add_project_board_pdf RPC validates size_bytes as a bigint parameter, so malformed values should not exist. K-05 should verify there are no direct-write rows that bypassed the RPC.

2. **created_by FK risk**: `COALESCE((item->>'uploaded_by')::uuid, p.created_by)` — if `uploaded_by` is a UUID text that no longer exists in `profiles` (e.g., a deleted user), INSERT will fail with FK violation. K-05 should flag this as a potential data integrity gap. Mitigation: run the pre-apply cross-check query.

3. **Idempotency partial-run risk**: If the session is interrupted between INSERT 1 and INSERT 2, the EXISTS guard will fire on re-run and leave the url rows un-migrated. Builder must TRUNCATE + re-run. K-05 should note this as an operational risk (MED-B or similar).

4. **Source table correction (spec divergence)**: The migration uses `project_boards` not `projects` as the source table. K-05 should confirm this correction is valid and that no `projects.attached_pdfs` column exists (it doesn't).

5. **title field drop**: URL elements contain a `title` key that is not migrated (no target column in briefing_documents). This is not a data loss risk from the schema perspective but K-05 should note it as a deliberate omission.

6. **RLS bypass at apply time**: Migration runs as the migration executor (not `authenticated`), so RLS does not apply. Correct and intentional.

7. **Apply gate**: yagi confirm required per KICKOFF lines 492-499 before `mcp apply_migration`.

## tsc / lint / build state

- `pnpm exec tsc --noEmit`: exit 0 (no src/ files changed)
- lint: N/A (no src/ changes)
- build: N/A (no src/ changes)
