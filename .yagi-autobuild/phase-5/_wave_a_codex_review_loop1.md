Reading additional input from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: medium
reasoning summaries: none
session id: 019def8f-5fab-72f3-a585-214dc1b3fe29
--------
user
Phase 5 Wave A K-05 LOOP 1 (Tier 1 high). Three new migrations + one server action edit. Adversarial review focused on: RLS scope, data-migration integrity, defense-in-depth on a defaults-only column.

Files in scope (4 total — file count budget honoured):
- supabase/migrations/20260504052541_phase_5_briefing_documents.sql (NEW table + 4 RLS policies + 2 indexes — task_01)
- supabase/migrations/20260504053641_phase_5_migrate_attached_to_briefing_documents.sql (data migration — task_02)
- supabase/migrations/20260504053000_phase_5_interested_in_twin.sql (ADD COLUMN — task_03 sub_3a)
- src/app/[locale]/app/projects/new/actions.ts (zod field + INSERT mapping — task_03 sub_3a)

The migrations are NOT yet applied to prod. Verdict gates the apply.

Builder grep audit (do not redo — verify):
- workspace_members.role CHECK constraint (Phase 2.0 baseline line 1825) only accepts `'admin'` or `'member'`. `'owner'` is NOT a valid role value in this codebase. Surface anywhere the new policy text reads `'owner'`.
- `attached_pdfs` / `attached_urls` jsonb columns live on `project_boards`, not `projects` (Phase 3.1 hotfix-3 migration 20260429144523 line 9). The KICKOFF spec said `FROM projects p` but that would error at runtime — the task_02 teammate corrected to `FROM project_boards pb JOIN projects p ON p.id = pb.project_id`. Verify the JOIN preserves the original spec's intent (every jsonb element becomes one briefing_documents row, with project_id from the parent project).
- twin_intent existing consumers at src/app/[locale]/app/dashboard/page.tsx:41/114/148-150/221 still read the deprecated column for display. The task_03 sub_3a INSERT path writes both twin_intent and interested_in_twin to the same row; legacy reads continue to work. Verify no path drops twin_intent.

Six focus areas:

1. **Cross-tenant leak** — briefing_documents SELECT/INSERT/UPDATE/DELETE policies. RLS scopes via `project_id IN (SELECT p.id FROM projects p JOIN workspace_members wm …)`. Confirm a non-member of the project's workspace sees zero rows on every operation. Look for any subquery that escapes the workspace scope.

2. **`workspace_members.role` enum reality** — the INSERT policy in task_01 uses `role IN ('owner', 'admin')`. Given the actual CHECK is only `'admin'`/`'member'`, `'owner'` matches no rows. This is dead code rather than a security hole, but flag it as a correctness issue — recommend either dropping `'owner'` from the policy text or adding the role to the table-level CHECK if `'owner'` is the intended future state.

3. **UPDATE 24h race** — the task_01 UPDATE policy gates on `(created_by = auth.uid() AND created_at > now() - interval '24 hours')`. Confirm `created_at` is column-default `now()` and not mutated by any trigger (no trigger on this new table; no inherited hook). A user could not extend their window by mutating `created_at` because the column-grant pattern from sub_03f_2 is not yet applied to `briefing_documents` — flag the gap as MED-B for Wave-A-end batch sweep candidate.

4. **task_02 idempotency** — DO/EXISTS sentinel guards re-run when ANY row exists in `briefing_documents`. Confirm: (a) interrupted-mid-migration scenario between INSERT 1 (pdfs) and INSERT 2 (urls) leaves the table partially populated with pdfs only, and the sentinel then refuses to re-run — Builder must `TRUNCATE briefing_documents` to recover. Document this as a known limitation in the migration's comment is accepted by you, OR recommend a finer-grained sentinel.

5. **task_02 NULL safety + FK** — `(item->>'size_bytes')::bigint` raises if the jsonb element's size_bytes is non-numeric. Verify all known prod jsonb elements have a numeric size_bytes (or, if not, that the cast safely fails the migration with a clear error). `created_by` falls back to `p.created_by`; verify no edge case yields a NULL or a deleted-user uuid that would violate the briefing_documents.created_by FK.

6. **task_03 sub_3a defense-in-depth** — the zod schema accepts a client-supplied `interested_in_twin` boolean. The DB column has DEFAULT false. INSERT path writes `data.interested_in_twin` (client value). RLS impact = zero (boolean column). Confirm there's no write path on this column outside the wizard (no admin override needed for a defaults-only column at this stage).

Output format:

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (not in Builder grep audit summary above):
[FINDING N] CLASS (HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | MED-C | LOW): file:line — short description — recommended fix

If 0 NEW HIGH/MED findings, declare "VERDICT: CLEAN — Wave A ready for prod migration apply after yagi GO."

Otherwise "VERDICT: NEEDS-ATTENTION — block apply until findings addressed."

End with one-line summary for run log.
codex
I’ll review only the four scoped files plus targeted supporting schema references needed to verify the policy and migration claims. I’ll use the provided grep audit as input rather than redoing broad searches.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504052541_phase_5_briefing_documents.sql' | Select-Object -First 260" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504053641_phase_5_migrate_attached_to_briefing_documents.sql' | Select-Object -First 260" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504053000_phase_5_interested_in_twin.sql' | Select-Object -First 180" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/actions.ts' | Select-Object -First 260" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 468ms:
-- Phase 5 Wave A task_01 ??briefing_documents table for the new Briefing Canvas paradigm (replaces the projects.attached_pdfs/urls jsonb pattern). Schema + 4 RLS policies. Data migration from the legacy jsonb columns lands in task_02.

-- briefing_documents ??Phase 5 ?좉퇋 ?뚯씠釉?-- 遺꾨━: 湲고쉷??(?섎ː?먭? 吏곸젒 留뚮뱺 ?먮즺) vs ?덊띁?곗뒪 (?몃? 李멸퀬 ?먮즺)
CREATE TABLE briefing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- 遺꾨쪟: 湲고쉷??vs ?덊띁?곗뒪
  kind text NOT NULL CHECK (kind IN ('brief', 'reference')),
  -- ?먮즺 source
  source_type text NOT NULL CHECK (source_type IN ('upload', 'url')),
  -- upload (PDF, image ??
  storage_key text,
  filename text,
  size_bytes bigint,
  mime_type text,
  -- url (?곸긽/?ъ씠???덊띁?곗뒪)
  url text,
  provider text,  -- 'youtube' / 'vimeo' / 'instagram' / 'generic'
  thumbnail_url text,
  oembed_html text,
  -- ?섎ː??硫붾え + 遺꾨쪟 (reference 留??섎?)
  note text,
  category text CHECK (category IS NULL OR category IN ('mood', 'composition', 'pacing', 'general')),
  -- meta
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  -- source_type 蹂?required field 媛뺤젣
  CONSTRAINT briefing_documents_source_check CHECK (
    (source_type = 'upload' AND storage_key IS NOT NULL AND filename IS NOT NULL) OR
    (source_type = 'url' AND url IS NOT NULL)
  )
);

CREATE INDEX idx_briefing_documents_project_kind ON briefing_documents(project_id, kind);
CREATE INDEX idx_briefing_documents_created ON briefing_documents(created_at DESC);

-- RLS ??project ??workspace member 留?access
ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace member ?먮뒗 yagi_admin
CREATE POLICY "briefing_documents_select" ON briefing_documents
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- INSERT: project ??created_by 蹂몄씤 ?먮뒗 workspace_admin (yagi_admin ??
CREATE POLICY "briefing_documents_insert" ON briefing_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.created_by = auth.uid()
        OR p.workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- UPDATE: 媛숈? ?뚰겕?ㅽ럹?댁뒪 admin/owner ?먮뒗 蹂몄씤??INSERT ??row + 24h ?대궡
-- (?섎ː?먭? 臾댄븳???먮즺 ?섏젙 紐??섍쾶 ??Brief 媛 lock ?섎㈃ ?꾧뎄??lock)
CREATE POLICY "briefing_documents_update" ON briefing_documents
  FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid() AND created_at > now() - interval '24 hours')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- DELETE: created_by 蹂몄씤 (project 媛 in_review ?먮뒗 洹??댄썑硫?deny)
CREATE POLICY "briefing_documents_delete" ON briefing_documents
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND project_id IN (
      SELECT id FROM projects WHERE status IN ('draft')
    )
  );

 succeeded in 497ms:
-- =============================================================================
-- Phase 5 Wave A task_02 ??Data migration: attached_pdfs/urls jsonb ??briefing_documents
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
--   The two INSERT ??SELECT statements are NOT inherently idempotent ??--   re-running would create duplicate rows in briefing_documents.
--   Guard: a DO $$ BEGIN ??END $$ block checks IF EXISTS (SELECT 1 FROM
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
-- SPEC NOTE ??source table correction:
--   The KICKOFF.md spec (lines 444??79) reads `FROM projects p,
--   jsonb_array_elements(p.attached_pdfs) AS item` and uses `p.created_by`
--   as a fallback. However, the attached_pdfs / attached_urls columns do NOT
--   exist on the projects table ??they were added to project_boards in
--   Phase 3.1 hotfix-3 (20260429144523). Therefore this migration sources
--   data from project_boards (with a JOIN to projects for the created_by
--   fallback). All other column mappings follow the KICKOFF spec exactly.
--   This correction is documented in _wave_a_task_02_result.md.
--
-- COLUMNS NOT DROPPED:
--   project_boards.attached_pdfs and project_boards.attached_urls are NOT
--   dropped by this migration ??per KICKOFF 짠?쒖빟 line 1031 (data preservation;
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
  -- Assumption: uploaded_at (not uploaded_at) is the timestamp field name ??  -- confirmed from RPC source in 20260429144523. KICKOFF uses 'uploaded_at'
  -- which matches the actual jsonb key.
  --
  -- Fallback for created_by: jsonb element uploaded_by ??projects.created_by.
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
  -- Assumption: 'added_at' / 'added_by' are the timestamp/user fields ??  -- confirmed from RPC source. KICKOFF spec uses these exact keys.
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
  -- Fallback for created_by: same pattern as INSERT 1 ??jsonb added_by ??  -- projects.created_by.
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
--    correct and intentional ??the migration is a one-time back-fill, not a
--    user-facing write.
-- =============================================================================

 succeeded in 515ms:
-- Phase 5 Wave A task_03 sub_3a ??adds interested_in_twin boolean column to
-- projects. twin_intent enum kept (deprecated, comment-flagged) for legacy
-- data preservation.

ALTER TABLE projects
  ADD COLUMN interested_in_twin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN projects.twin_intent IS 'DEPRECATED Phase 5 ??use interested_in_twin instead. Kept for legacy data preservation.';

 succeeded in 534ms:
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";
import { fetchVideoMetadata, type OEmbedResult } from "@/lib/oembed";
import { extractAssetIndex } from "@/lib/board/asset-index";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

// -----------------------------------------------------------------------------
// Phase 2.8.1 G_B1-B ??Wizard draft mode
// -----------------------------------------------------------------------------
// The wizard now creates the projects row early (status='draft') so Step 2
// can mount BriefBoardEditor against a real project_id and the user can
// drop images / paste embeds before "submit". Submit flips the status from
// 'draft' to 'submitted' rather than INSERTing a fresh row.
//
// Server actions exposed:
//   - createProject       : pre-2.8.1 single-shot INSERT path (kept for
//                           backwards compatibility; wizard no longer calls
//                           it but tests / direct callers still do)
//   - ensureDraftProject  : find-or-create the user's wizard draft. Returns
//                           project + brief bootstrap for the editor.
//   - submitDraftProject  : UPDATE the existing draft with the latest
//                           wizard fields and (optionally) flip to 'submitted'.
// -----------------------------------------------------------------------------

const sharedFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  brand_id: z.string().uuid().nullable().optional(),
  tone: z.string().max(500).optional().nullable(),
  // Phase 2.7.2: free-text tag list (was a closed enum). Maps to the
  // existing `deliverable_types text[]` Postgres column ??no migration
  // needed; the meaning shifts from "format" to "intended use".
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .max(10)
    .default([]),
  estimated_budget_range: z.string().max(100).optional().nullable(),
  target_delivery_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  intent: z.enum(["draft", "submit"]).default("draft"),
};

// Phase 2.8.1 G_B1-E: proposalSchema + discriminatedUnion deleted ??// proposal_request intake mode is no longer authored. The legacy
// `projects.intake_mode` column stays; existing rows still render via
// the read-only banner on /app/projects/[id].
const createProjectSchema = z.object({
  ...sharedFields,
  intake_mode: z.literal("brief"),
});

type ActionResult =
  | { ok: true; id: string; status: string }
  | {
      error: "validation";
      issues: z.ZodFormattedError<z.infer<typeof createProjectSchema>>;
    }
  | { error: "unauthenticated" }
  | { error: "no_workspace" }
  | { error: "db"; message: string };

export async function createProject(input: unknown): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.format() };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // Wave C.5d sub_03c ??replace first-membership fallback with the
  // cookie-based active workspace resolver (Codex K-05 final review LOOP 1
  // MED-C). createProject is the legacy direct-INSERT path retained for
  // backwards compatibility; the wizard goes through ensureDraftProject +
  // submitProjectAction. Same misroute risk regardless, same fix.
  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { error: "no_workspace" };
  const membership = { workspace_id: active.id };

  const status = parsed.data.intent === "submit" ? "submitted" : "draft";

  // Column mapping notes:
  // - spec field `description` ??DB column `brief` (no standalone `description` col)
  // - spec field `tone` ??NO matching column on `projects`; omitted from insert
  // - `estimated_budget_range` matches exactly
  const data = parsed.data;

  // Wave D sub_03g F4: verify the client-supplied brand_id (if any)
  // belongs to the resolved workspace. RLS on `brands` already scopes
  // SELECTs to the caller's memberships, but it does not block a
  // cross-workspace brand_id from another workspace the caller is also
  // a member of. Explicit check rejects the cross-workspace path
  // before the projects INSERT trusts the value.
  if (data.brand_id) {
    const { data: brandRow } = await supabase
      .from("brands")
      .select("id")
      .eq("id", data.brand_id)
      .eq("workspace_id", membership.workspace_id)
      .maybeSingle();
    if (!brandRow) {
      return {
        error: "db",
        message: "brand_id does not belong to the resolved workspace",
      };
    }
  }

  const insertPayload = {
    workspace_id: membership.workspace_id,
    created_by: user.id,
    project_type: "direct_commission" as const,
    status,
    title: data.title,
    brief: data.description ?? null,
    brand_id: data.brand_id ?? null,
    deliverable_types: data.deliverable_types,
    estimated_budget_range: data.estimated_budget_range ?? null,
    target_delivery_at: data.target_delivery_at ?? null,
    intake_mode: data.intake_mode,
  };

  const { data: project, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !project) {
    console.error("[createProject] Supabase error:", error);
    return { error: "db", message: error?.message ?? "insert failed" };
  }

  // Phase 2.8 G_B-7: every new project gets a sibling project_briefs row
  // with empty content, so the Brief tab on /app/projects/[id] can mount
  // the editor immediately. RLS allows this INSERT because the caller
  // is the project's workspace member (just created the project above).
  //
  // K05-PHASE-2-8-04 fix: brief INSERT failure is now FATAL. If the
  // sibling row can't be created we roll back the project to avoid
  // leaving an orphan project that the Brief tab cannot edit (saveBrief
  // returns not_found when the row is missing ??there is no lazy-create
  // path). Atomicity-via-RPC lands in Phase 2.8.1 (FU-2.8-saveversion-rollback
  // covers a related two-write atomicity gap).
  const { error: briefErr } = await supabase
    .from("project_briefs")
    .insert({
      project_id: project.id,
      // status / current_version / tiptap_schema_version use column defaults
      // (editing / 0 / 1) ??required by validate_project_brief_change for
      // non-yagi_admin INSERT.
      updated_by: user.id,
    });
  if (briefErr) {
    console.error(
      "[createProject] project_briefs sibling insert failed (rolling back project):",
      briefErr
    );
    // K05-PHASE-2-8-LOOP2-03 fix: rollback DELETE must use the
    // service-role client. The user-scoped supabase client honors
    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
    // a non-yagi workspace_admin's rollback would be silently denied
    // and leave an orphan project. Service role bypasses RLS so the
    // rollback succeeds for all caller roles. Atomicity-via-RPC is
    // still the cleaner long-term fix (FU-2.8-saveversion-rollback).
    const service = createSupabaseService();
    const { error: rollbackErr } = await service
      .from("projects")
      .delete()
      .eq("id", project.id);
    if (rollbackErr) {
      console.error("[createProject] rollback DELETE failed:", rollbackErr);
    }
    return {
      error: "db",
      message: `brief insert failed: ${briefErr.message}`,
    };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, id: project.id, status };
}

// =============================================================================
// Phase 2.8.1 G_B1-B ??wizard draft mode
// =============================================================================

const wizardDraftFields = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  brand_id: z.string().uuid().nullable().optional(),
  tone: z.string().max(500).optional().nullable(),
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .max(10)
    .default([]),
  estimated_budget_range: z.string().max(100).optional().nullable(),
  target_delivery_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

const ensureDraftInput = z.object({
  initial: wizardDraftFields,
});

const submitDraftInput = z.object({
  projectId: z.string().uuid(),
  fields: wizardDraftFields,
  intent: z.enum(["draft", "submit"]),
});

export type WizardDraftFields = z.infer<typeof wizardDraftFields>;

type DraftBootstrap = {
  projectId: string;
  status: "draft" | "submitted" | string;
  brief: {
    contentJson: Json;
    updatedAt: string;
    status: "editing" | "locked";
  };
};

export type EnsureDraftResult =
  | { ok: true; data: DraftBootstrap }
  | { error: "validation"; issues: z.ZodIssue[] }
  | { error: "unauthenticated" }
  | { error: "no_workspace" }
  | { error: "db"; message: string };

export type SubmitDraftResult =
  | { ok: true; id: string; status: "draft" | "submitted" }
  | { error: "validation"; issues: z.ZodIssue[] }
  | { error: "unauthenticated" }
  | { error: "not_found" }
  | { error: "forbidden" }
  | { error: "db"; message: string };

const PG_UNIQUE_VIOLATION = "23505";

async function fetchDraftBootstrap(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  projectId: string,
): Promise<DraftBootstrap | null> {
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, status")

codex
The new table policy file has the expected owner-role dead text in INSERT. I’m now checking the action’s later draft paths and the exact line numbers so findings can be tied to concrete locations.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -LiteralPath 'src/app/[locale]/app/projects/new/actions.ts' -Pattern 'interested_in_twin|twin_intent|insertPayload|updatePayload|wizardDraftFields|ensureDraftProject|submitDraftProject' -Context 3,6" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260504052541_phase_5_briefing_documents.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260504053641_phase_5_migrate_attached_to_briefing_documents.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260504053000_phase_5_interested_in_twin.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 376ms:
   1: -- Phase 5 Wave A task_03 sub_3a ??adds interested_in_twin boolean column to
   2: -- projects. twin_intent enum kept (deprecated, comment-flagged) for legacy
   3: -- data preservation.
   4: 
   5: ALTER TABLE projects
   6:   ADD COLUMN interested_in_twin boolean NOT NULL DEFAULT false;
   7: 
   8: COMMENT ON COLUMN projects.twin_intent IS 'DEPRECATED Phase 5 ??use interested_in_twin instead. Kept for legacy data preservation.';

 succeeded in 380ms:
   1: -- Phase 5 Wave A task_01 ??briefing_documents table for the new Briefing Canvas paradigm (replaces the projects.attached_pdfs/urls jsonb pattern). Schema + 4 RLS policies. Data migration from the legacy jsonb columns lands in task_02.
   2: 
   3: -- briefing_documents ??Phase 5 ?좉퇋 ?뚯씠釉?-- 遺꾨━: 湲고쉷??(?섎ː?먭? 吏곸젒 留뚮뱺 ?먮즺) vs ?덊띁?곗뒪 (?몃? 李멸퀬 ?먮즺)
   4: CREATE TABLE briefing_documents (
   5:   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   6:   project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
   7:   -- 遺꾨쪟: 湲고쉷??vs ?덊띁?곗뒪
   8:   kind text NOT NULL CHECK (kind IN ('brief', 'reference')),
   9:   -- ?먮즺 source
  10:   source_type text NOT NULL CHECK (source_type IN ('upload', 'url')),
  11:   -- upload (PDF, image ??
  12:   storage_key text,
  13:   filename text,
  14:   size_bytes bigint,
  15:   mime_type text,
  16:   -- url (?곸긽/?ъ씠???덊띁?곗뒪)
  17:   url text,
  18:   provider text,  -- 'youtube' / 'vimeo' / 'instagram' / 'generic'
  19:   thumbnail_url text,
  20:   oembed_html text,
  21:   -- ?섎ː??硫붾え + 遺꾨쪟 (reference 留??섎?)
  22:   note text,
  23:   category text CHECK (category IS NULL OR category IN ('mood', 'composition', 'pacing', 'general')),
  24:   -- meta
  25:   created_at timestamptz NOT NULL DEFAULT now(),
  26:   created_by uuid NOT NULL REFERENCES profiles(id),
  27:   -- source_type 蹂?required field 媛뺤젣
  28:   CONSTRAINT briefing_documents_source_check CHECK (
  29:     (source_type = 'upload' AND storage_key IS NOT NULL AND filename IS NOT NULL) OR
  30:     (source_type = 'url' AND url IS NOT NULL)
  31:   )
  32: );
  33: 
  34: CREATE INDEX idx_briefing_documents_project_kind ON briefing_documents(project_id, kind);
  35: CREATE INDEX idx_briefing_documents_created ON briefing_documents(created_at DESC);
  36: 
  37: -- RLS ??project ??workspace member 留?access
  38: ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;
  39: 
  40: -- SELECT: workspace member ?먮뒗 yagi_admin
  41: CREATE POLICY "briefing_documents_select" ON briefing_documents
  42:   FOR SELECT TO authenticated
  43:   USING (
  44:     project_id IN (
  45:       SELECT p.id FROM projects p
  46:       JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
  47:       WHERE wm.user_id = auth.uid()
  48:     )
  49:     OR EXISTS (
  50:       SELECT 1 FROM profiles
  51:       WHERE id = auth.uid() AND role = 'yagi_admin'
  52:     )
  53:   );
  54: 
  55: -- INSERT: project ??created_by 蹂몄씤 ?먮뒗 workspace_admin (yagi_admin ??
  56: CREATE POLICY "briefing_documents_insert" ON briefing_documents
  57:   FOR INSERT TO authenticated
  58:   WITH CHECK (
  59:     project_id IN (
  60:       SELECT p.id FROM projects p
  61:       WHERE p.created_by = auth.uid()
  62:         OR p.workspace_id IN (
  63:           SELECT workspace_id FROM workspace_members
  64:           WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  65:         )
  66:     )
  67:     OR EXISTS (
  68:       SELECT 1 FROM profiles
  69:       WHERE id = auth.uid() AND role = 'yagi_admin'
  70:     )
  71:   );
  72: 
  73: -- UPDATE: 媛숈? ?뚰겕?ㅽ럹?댁뒪 admin/owner ?먮뒗 蹂몄씤??INSERT ??row + 24h ?대궡
  74: -- (?섎ː?먭? 臾댄븳???먮즺 ?섏젙 紐??섍쾶 ??Brief 媛 lock ?섎㈃ ?꾧뎄??lock)
  75: CREATE POLICY "briefing_documents_update" ON briefing_documents
  76:   FOR UPDATE TO authenticated
  77:   USING (
  78:     (created_by = auth.uid() AND created_at > now() - interval '24 hours')
  79:     OR EXISTS (
  80:       SELECT 1 FROM profiles
  81:       WHERE id = auth.uid() AND role = 'yagi_admin'
  82:     )
  83:   );
  84: 
  85: -- DELETE: created_by 蹂몄씤 (project 媛 in_review ?먮뒗 洹??댄썑硫?deny)
  86: CREATE POLICY "briefing_documents_delete" ON briefing_documents
  87:   FOR DELETE TO authenticated
  88:   USING (
  89:     created_by = auth.uid()
  90:     AND project_id IN (
  91:       SELECT id FROM projects WHERE status IN ('draft')
  92:     )
  93:   );

 succeeded in 394ms:
   1: -- =============================================================================
   2: -- Phase 5 Wave A task_02 ??Data migration: attached_pdfs/urls jsonb ??briefing_documents
   3: -- =============================================================================
   4: --
   5: -- PURPOSE:
   6: --   Back-fill the new briefing_documents table (created in task_01:
   7: --   20260504052541_phase_5_briefing_documents.sql) from the legacy
   8: --   attached_pdfs / attached_urls jsonb arrays on project_boards.
   9: --
  10: -- DEPENDENCY:
  11: --   MUST apply AFTER 20260504052541_phase_5_briefing_documents.sql.
  12: --   The briefing_documents table must exist before this migration runs.
  13: --
  14: -- ONE-RUN-ONLY / IDEMPOTENCY:
  15: --   The two INSERT ??SELECT statements are NOT inherently idempotent ??--   re-running would create duplicate rows in briefing_documents.
  16: --   Guard: a DO $$ BEGIN ??END $$ block checks IF EXISTS (SELECT 1 FROM
  17: --   briefing_documents LIMIT 1) before executing. If the table already has
  18: --   any rows the block emits a NOTICE and returns without inserting.
  19: --
  20: --   Rationale: "any row present" is the cheapest possible sentinel that
  21: --   requires zero schema changes. The table is empty at task_01 apply time
  22: --   (no other code path populates it yet in Phase 5 Wave A). If a partial
  23: --   run occurred and left orphan rows Builder must manually TRUNCATE
  24: --   briefing_documents before re-applying; that case is called out in the
  25: --   K-05 notes at the bottom of this file.
  26: --
  27: -- SPEC NOTE ??source table correction:
  28: --   The KICKOFF.md spec (lines 444??79) reads `FROM projects p,
  29: --   jsonb_array_elements(p.attached_pdfs) AS item` and uses `p.created_by`
  30: --   as a fallback. However, the attached_pdfs / attached_urls columns do NOT
  31: --   exist on the projects table ??they were added to project_boards in
  32: --   Phase 3.1 hotfix-3 (20260429144523). Therefore this migration sources
  33: --   data from project_boards (with a JOIN to projects for the created_by
  34: --   fallback). All other column mappings follow the KICKOFF spec exactly.
  35: --   This correction is documented in _wave_a_task_02_result.md.
  36: --
  37: -- COLUMNS NOT DROPPED:
  38: --   project_boards.attached_pdfs and project_boards.attached_urls are NOT
  39: --   dropped by this migration ??per KICKOFF 짠?쒖빟 line 1031 (data preservation;
  40: --   cleanup deferred to Wave D ff-merge hotfix or Phase 5.1).
  41: --
  42: -- =============================================================================
  43: -- PRE-APPLY VERIFICATION (Builder runs manually before apply):
  44: --
  45: --   -- Count total PDF elements across all project_boards
  46: --   SELECT
  47: --     COUNT(*) AS board_count,
  48: --     SUM(jsonb_array_length(attached_pdfs)) AS total_pdf_elements,
  49: --     SUM(jsonb_array_length(attached_urls)) AS total_url_elements
  50: --   FROM project_boards
  51: --   WHERE (attached_pdfs IS NOT NULL AND jsonb_array_length(attached_pdfs) > 0)
  52: --      OR (attached_urls IS NOT NULL AND jsonb_array_length(attached_urls) > 0);
  53: --
  54: --   -- Confirm briefing_documents is empty before migration
  55: --   SELECT COUNT(*) FROM briefing_documents;
  56: --   -- Expected: 0
  57: --
  58: -- =============================================================================
  59: -- POST-APPLY VERIFICATION (Builder runs manually after apply):
  60: --
  61: --   -- Count rows in briefing_documents vs source jsonb element counts
  62: --   SELECT
  63: --     source_type,
  64: --     COUNT(*) AS migrated_rows
  65: --   FROM briefing_documents
  66: --   WHERE kind = 'reference'
  67: --   GROUP BY source_type;
  68: --   -- migrated_rows for 'upload' should equal total_pdf_elements above
  69: --   -- migrated_rows for 'url'    should equal total_url_elements above
  70: --
  71: --   -- Cross-check: no orphan rows (briefing_documents without a parent project)
  72: --   SELECT COUNT(*) FROM briefing_documents bd
  73: --   LEFT JOIN projects p ON p.id = bd.project_id
  74: --   WHERE p.id IS NULL;
  75: --   -- Expected: 0
  76: --
  77: --   -- Check for NULL storage_key (would violate briefing_documents_source_check)
  78: --   -- (should be caught by the constraint, but worth verifying separately)
  79: --   SELECT COUNT(*) FROM briefing_documents
  80: --   WHERE source_type = 'upload' AND (storage_key IS NULL OR filename IS NULL);
  81: --   -- Expected: 0
  82: --
  83: --   -- Check for NULL url (would violate briefing_documents_source_check)
  84: --   SELECT COUNT(*) FROM briefing_documents
  85: --   WHERE source_type = 'url' AND url IS NULL;
  86: --   -- Expected: 0
  87: --
  88: -- =============================================================================
  89: 
  90: DO $$
  91: BEGIN
  92:   -- Idempotency guard: if any row already exists in briefing_documents,
  93:   -- a previous run (or partial run) has already populated it. Skip to avoid
  94:   -- duplicates. Builder must TRUNCATE briefing_documents manually if a
  95:   -- partial run left orphan rows and a clean re-run is desired.
  96:   IF EXISTS (SELECT 1 FROM briefing_documents LIMIT 1) THEN
  97:     RAISE NOTICE 'briefing_documents already populated; skipping migrate (task_02 idempotency guard)';
  98:     RETURN;
  99:   END IF;
 100: 
 101:   -- -------------------------------------------------------------------------
 102:   -- INSERT 1: PDF uploads from project_boards.attached_pdfs
 103:   --
 104:   -- jsonb element shape (set by add_project_board_pdf RPC):
 105:   --   { "id": "<uuid>", "storage_key": "<text>", "filename": "<text>",
 106:   --     "size_bytes": <bigint>, "uploaded_at": "<timestamptz>",
 107:   --     "uploaded_by": "<uuid>" }
 108:   --
 109:   -- Assumption: storage_key and filename are always non-null in well-formed
 110:   -- entries (the RPC validates them). Rows where either is NULL are skipped by
 111:   -- the briefing_documents_source_check constraint and will raise on INSERT.
 112:   -- Builder should verify COUNT(*) matches pre-apply total_pdf_elements after
 113:   -- apply.
 114:   --
 115:   -- Assumption: mime_type is not stored in the jsonb element by the existing
 116:   -- RPC (add_project_board_pdf does not persist mime_type in the jsonb blob).
 117:   -- COALESCE falls back to 'application/pdf' as specified in KICKOFF line 454.
 118:   --
 119:   -- Assumption: uploaded_at (not uploaded_at) is the timestamp field name ??  -- confirmed from RPC source in 20260429144523. KICKOFF uses 'uploaded_at'
 120:   -- which matches the actual jsonb key.
 121:   --
 122:   -- Fallback for created_by: jsonb element uploaded_by ??projects.created_by.
 123:   -- project_boards does not have a created_by column; the join to projects
 124:   -- provides the fallback owner (the project creator). This matches the spirit
 125:   -- of the KICKOFF spec which used p.created_by from a (corrected) projects
 126:   -- join.
 127:   -- -------------------------------------------------------------------------
 128:   INSERT INTO briefing_documents (
 129:     project_id, kind, source_type,
 130:     storage_key, filename, size_bytes, mime_type,
 131:     created_at, created_by
 132:   )
 133:   SELECT
 134:     p.id,
 135:     'reference',
 136:     'upload',
 137:     (item->>'storage_key'),
 138:     (item->>'filename'),
 139:     (item->>'size_bytes')::bigint,
 140:     COALESCE(item->>'mime_type', 'application/pdf'),
 141:     COALESCE((item->>'uploaded_at')::timestamptz, p.created_at),
 142:     COALESCE((item->>'uploaded_by')::uuid, p.created_by)
 143:   FROM projects p
 144:   JOIN project_boards pb ON pb.project_id = p.id,
 145:   jsonb_array_elements(pb.attached_pdfs) AS item
 146:   WHERE pb.attached_pdfs IS NOT NULL
 147:     AND jsonb_array_length(pb.attached_pdfs) > 0;
 148: 
 149:   -- -------------------------------------------------------------------------
 150:   -- INSERT 2: URL references from project_boards.attached_urls
 151:   --
 152:   -- jsonb element shape (set by add_project_board_url RPC, hotfix-3 version):
 153:   --   { "id": "<uuid>", "url": "<text>", "title": <text|null>,
 154:   --     "thumbnail_url": <text|null>, "provider": "<text>",
 155:   --     "note": <text|null>, "added_at": "<timestamptz>",
 156:   --     "added_by": "<uuid>" }
 157:   --
 158:   -- Assumption: 'added_at' / 'added_by' are the timestamp/user fields ??  -- confirmed from RPC source. KICKOFF spec uses these exact keys.
 159:   --
 160:   -- Assumption: provider is always non-null in well-formed entries
 161:   -- (RPC validates it as 'youtube'/'vimeo'/'generic'). COALESCE to 'generic'
 162:   -- matches KICKOFF line 471 as a safety net for legacy Phase 3.0 rows that
 163:   -- may have been seeded before the provider validation was added.
 164:   --
 165:   -- Note: 'title' is stored in the jsonb element but briefing_documents has
 166:   -- no 'title' column. Title is intentionally NOT migrated (no target column).
 167:   -- This is documented in _wave_a_task_02_result.md.
 168:   --
 169:   -- Fallback for created_by: same pattern as INSERT 1 ??jsonb added_by ??  -- projects.created_by.
 170:   -- -------------------------------------------------------------------------
 171:   INSERT INTO briefing_documents (
 172:     project_id, kind, source_type,
 173:     url, provider, thumbnail_url, note,
 174:     created_at, created_by
 175:   )
 176:   SELECT
 177:     p.id,
 178:     'reference',
 179:     'url',
 180:     (item->>'url'),
 181:     COALESCE(item->>'provider', 'generic'),
 182:     (item->>'thumbnail_url'),
 183:     (item->>'note'),
 184:     COALESCE((item->>'added_at')::timestamptz, p.created_at),
 185:     COALESCE((item->>'added_by')::uuid, p.created_by)
 186:   FROM projects p
 187:   JOIN project_boards pb ON pb.project_id = p.id,
 188:   jsonb_array_elements(pb.attached_urls) AS item
 189:   WHERE pb.attached_urls IS NOT NULL
 190:     AND jsonb_array_length(pb.attached_urls) > 0;
 191: 
 192: END $$;
 193: 
 194: -- =============================================================================
 195: -- K-05 NOTES (for Codex adversarial review):
 196: --
 197: -- 1. NULL safety: storage_key / filename NULLs in attached_pdfs elements will
 198: --    cause INSERT to fail at the briefing_documents_source_check constraint
 199: --    (source_type='upload' requires both non-null). Malformed elements from
 200: --    pre-RPC direct DB writes (if any) would abort the DO block. Builder
 201: --    should run the pre-apply NULL-check query above before apply.
 202: --
 203: -- 2. created_by FK validity: jsonb uploaded_by / added_by values are stored
 204: --    as text-encoded UUIDs. COALESCE(...)::uuid cast will fail on malformed
 205: --    values. The outer fallback to p.created_by (a FK-validated column on
 206: --    projects) reduces but does not eliminate risk for the primary cast. If
 207: --    the cast fails the entire DO block rolls back (it runs in a single
 208: --    implicit transaction). No partial insert risk.
 209: --
 210: -- 3. Idempotency: guarded by the EXISTS check at block entry. Partial-run
 211: --    risk exists if the Postgres session is interrupted mid-block (between
 212: --    INSERT 1 and INSERT 2). In that case briefing_documents will have upload
 213: --    rows but no url rows; the guard will fire on re-run and skip. Builder
 214: --    must TRUNCATE briefing_documents and re-run. This is the accepted
 215: --    tradeoff for the sentinel approach.
 216: --
 217: -- 4. Schema variance: Phase 3.0 had no attachment columns on project_boards
 218: --    (they were added in hotfix-3 / 20260429144523). The DEFAULT '[]'::jsonb
 219: --    on the columns means older boards have empty arrays; the WHERE
 220: --    jsonb_array_length(...) > 0 guard skips them cleanly.
 221: --    The hotfix-3 K-05 loop (20260429151910) fixed null-handling for
 222: --    title/thumbnail_url/note using to_jsonb(). Those fields may be stored as
 223: --    JSON null (not SQL NULL). `item->>'field'` on a JSON null returns SQL
 224: --    NULL, which is safe for nullable columns.
 225: --
 226: -- 5. Apply gate: yagi confirm required before prod apply per KICKOFF lines
 227: --    492-499. Data loss risk if applied incorrectly (no rollback for data
 228: --    migration). Builder must receive explicit GO before mcp apply_migration.
 229: --
 230: -- 6. RLS bypass: this migration runs as the migration executor role (not an
 231: --    authenticated user), so RLS does not apply during the INSERT. This is
 232: --    correct and intentional ??the migration is a one-time back-fill, not a
 233: --    user-facing write.
 234: -- =============================================================================

 succeeded in 488ms:

  src\app\[locale]\app\projects\new\actions.ts:21://   - createProject       : pre-2.8.1 single-shot INSERT path (kept 
for
  src\app\[locale]\app\projects\new\actions.ts:22://                           backwards compatibility; wizard no longe
r calls
  src\app\[locale]\app\projects\new\actions.ts:23://                           it but tests / direct callers still do)
> src\app\[locale]\app\projects\new\actions.ts:24://   - ensureDraftProject  : find-or-create the user's wizard draft. 
Returns
  src\app\[locale]\app\projects\new\actions.ts:25://                           project + brief bootstrap for the editor
.
> src\app\[locale]\app\projects\new\actions.ts:26://   - submitDraftProject  : UPDATE the existing draft with the lates
t
  src\app\[locale]\app\projects\new\actions.ts:27://                           wizard fields and (optionally) flip to '
submitted'.
  src\app\[locale]\app\projects\new\actions.ts:28:// ------------------------------------------------------------------
-----------
  src\app\[locale]\app\projects\new\actions.ts:29:
  src\app\[locale]\app\projects\new\actions.ts:30:const sharedFields = {
  src\app\[locale]\app\projects\new\actions.ts:31:  title: z.string().trim().min(1).max(200),
  src\app\[locale]\app\projects\new\actions.ts:32:  description: z.string().max(4000).optional().nullable(),
  src\app\[locale]\app\projects\new\actions.ts:82:  // Wave C.5d sub_03c — replace first-membership fallback with the
  src\app\[locale]\app\projects\new\actions.ts:83:  // cookie-based active workspace resolver (Codex K-05 final review 
LOOP 1
  src\app\[locale]\app\projects\new\actions.ts:84:  // MED-C). createProject is the legacy direct-INSERT path retained 
for
> src\app\[locale]\app\projects\new\actions.ts:85:  // backwards compatibility; the wizard goes through ensureDraftProj
ect +
  src\app\[locale]\app\projects\new\actions.ts:86:  // submitProjectAction. Same misroute risk regardless, same fix.
  src\app\[locale]\app\projects\new\actions.ts:87:  const active = await resolveActiveWorkspace(user.id);
  src\app\[locale]\app\projects\new\actions.ts:88:  if (!active) return { error: "no_workspace" };
  src\app\[locale]\app\projects\new\actions.ts:89:  const membership = { workspace_id: active.id };
  src\app\[locale]\app\projects\new\actions.ts:90:
  src\app\[locale]\app\projects\new\actions.ts:91:  const status = parsed.data.intent === "submit" ? "submitted" : "dra
ft";
  src\app\[locale]\app\projects\new\actions.ts:117:    }
  src\app\[locale]\app\projects\new\actions.ts:118:  }
  src\app\[locale]\app\projects\new\actions.ts:119:
> src\app\[locale]\app\projects\new\actions.ts:120:  const insertPayload = {
  src\app\[locale]\app\projects\new\actions.ts:121:    workspace_id: membership.workspace_id,
  src\app\[locale]\app\projects\new\actions.ts:122:    created_by: user.id,
  src\app\[locale]\app\projects\new\actions.ts:123:    project_type: "direct_commission" as const,
  src\app\[locale]\app\projects\new\actions.ts:124:    status,
  src\app\[locale]\app\projects\new\actions.ts:125:    title: data.title,
  src\app\[locale]\app\projects\new\actions.ts:126:    brief: data.description ?? null,
  src\app\[locale]\app\projects\new\actions.ts:133:
  src\app\[locale]\app\projects\new\actions.ts:134:  const { data: project, error } = await supabase
  src\app\[locale]\app\projects\new\actions.ts:135:    .from("projects")
> src\app\[locale]\app\projects\new\actions.ts:136:    .insert(insertPayload)
  src\app\[locale]\app\projects\new\actions.ts:137:    .select("id")
  src\app\[locale]\app\projects\new\actions.ts:138:    .single();
  src\app\[locale]\app\projects\new\actions.ts:139:
  src\app\[locale]\app\projects\new\actions.ts:140:  if (error || !project) {
  src\app\[locale]\app\projects\new\actions.ts:141:    console.error("[createProject] Supabase error:", error);
  src\app\[locale]\app\projects\new\actions.ts:142:    return { error: "db", message: error?.message ?? "insert failed"
 };
  src\app\[locale]\app\projects\new\actions.ts:196:// Phase 2.8.1 G_B1-B — wizard draft mode
  src\app\[locale]\app\projects\new\actions.ts:197:// =================================================================
============
  src\app\[locale]\app\projects\new\actions.ts:198:
> src\app\[locale]\app\projects\new\actions.ts:199:const wizardDraftFields = z.object({
  src\app\[locale]\app\projects\new\actions.ts:200:  title: z.string().trim().min(1).max(200),
  src\app\[locale]\app\projects\new\actions.ts:201:  description: z.string().max(4000).optional().nullable(),
  src\app\[locale]\app\projects\new\actions.ts:202:  brand_id: z.string().uuid().nullable().optional(),
  src\app\[locale]\app\projects\new\actions.ts:203:  tone: z.string().max(500).optional().nullable(),
  src\app\[locale]\app\projects\new\actions.ts:204:  deliverable_types: z
  src\app\[locale]\app\projects\new\actions.ts:205:    .array(z.string().trim().min(1).max(60))
  src\app\[locale]\app\projects\new\actions.ts:214:});
  src\app\[locale]\app\projects\new\actions.ts:215:
  src\app\[locale]\app\projects\new\actions.ts:216:const ensureDraftInput = z.object({
> src\app\[locale]\app\projects\new\actions.ts:217:  initial: wizardDraftFields,
  src\app\[locale]\app\projects\new\actions.ts:218:});
  src\app\[locale]\app\projects\new\actions.ts:219:
  src\app\[locale]\app\projects\new\actions.ts:220:const submitDraftInput = z.object({
  src\app\[locale]\app\projects\new\actions.ts:221:  projectId: z.string().uuid(),
> src\app\[locale]\app\projects\new\actions.ts:222:  fields: wizardDraftFields,
  src\app\[locale]\app\projects\new\actions.ts:223:  intent: z.enum(["draft", "submit"]),
  src\app\[locale]\app\projects\new\actions.ts:224:});
  src\app\[locale]\app\projects\new\actions.ts:225:
> src\app\[locale]\app\projects\new\actions.ts:226:export type WizardDraftFields = z.infer<typeof wizardDraftFields>;
  src\app\[locale]\app\projects\new\actions.ts:227:
  src\app\[locale]\app\projects\new\actions.ts:228:type DraftBootstrap = {
  src\app\[locale]\app\projects\new\actions.ts:229:  projectId: string;
  src\app\[locale]\app\projects\new\actions.ts:230:  status: "draft" | "submitted" | string;
  src\app\[locale]\app\projects\new\actions.ts:231:  brief: {
  src\app\[locale]\app\projects\new\actions.ts:232:    contentJson: Json;
  src\app\[locale]\app\projects\new\actions.ts:281:  };
  src\app\[locale]\app\projects\new\actions.ts:282:}
  src\app\[locale]\app\projects\new\actions.ts:283:
> src\app\[locale]\app\projects\new\actions.ts:284:export async function ensureDraftProject(
  src\app\[locale]\app\projects\new\actions.ts:285:  input: unknown,
  src\app\[locale]\app\projects\new\actions.ts:286:): Promise<EnsureDraftResult> {
  src\app\[locale]\app\projects\new\actions.ts:287:  const parsed = ensureDraftInput.safeParse(input);
  src\app\[locale]\app\projects\new\actions.ts:288:  if (!parsed.success) {
  src\app\[locale]\app\projects\new\actions.ts:289:    return { error: "validation", issues: parsed.error.issues };
  src\app\[locale]\app\projects\new\actions.ts:290:  }
  src\app\[locale]\app\projects\new\actions.ts:295:  } = await supabase.auth.getUser();
  src\app\[locale]\app\projects\new\actions.ts:296:  if (!user) return { error: "unauthenticated" };
  src\app\[locale]\app\projects\new\actions.ts:297:
> src\app\[locale]\app\projects\new\actions.ts:298:  // Wave C.5d sub_03c — same MED-C fix: ensureDraftProject must sco
pe to
  src\app\[locale]\app\projects\new\actions.ts:299:  // the workspace the user has selected in the switcher, not their
  src\app\[locale]\app\projects\new\actions.ts:300:  // oldest membership.
  src\app\[locale]\app\projects\new\actions.ts:301:  const active = await resolveActiveWorkspace(user.id);
  src\app\[locale]\app\projects\new\actions.ts:302:  if (!active) return { error: "no_workspace" };
  src\app\[locale]\app\projects\new\actions.ts:303:  const membership = { workspace_id: active.id };
  src\app\[locale]\app\projects\new\actions.ts:304:
  src\app\[locale]\app\projects\new\actions.ts:334:  // Wave D sub_03g F4: same brand_id cross-workspace guard as
  src\app\[locale]\app\projects\new\actions.ts:335:  // createProject above. Apply on draft creation as well so a draft
  src\app\[locale]\app\projects\new\actions.ts:336:  // never carries a brand_id from a different workspace forward int
o
> src\app\[locale]\app\projects\new\actions.ts:337:  // submitDraftProject.
  src\app\[locale]\app\projects\new\actions.ts:338:  if (fields.brand_id) {
  src\app\[locale]\app\projects\new\actions.ts:339:    const { data: brandRow } = await supabase
  src\app\[locale]\app\projects\new\actions.ts:340:      .from("brands")
  src\app\[locale]\app\projects\new\actions.ts:341:      .select("id")
  src\app\[locale]\app\projects\new\actions.ts:342:      .eq("id", fields.brand_id)
  src\app\[locale]\app\projects\new\actions.ts:343:      .eq("workspace_id", membership.workspace_id)
  src\app\[locale]\app\projects\new\actions.ts:350:    }
  src\app\[locale]\app\projects\new\actions.ts:351:  }
  src\app\[locale]\app\projects\new\actions.ts:352:
> src\app\[locale]\app\projects\new\actions.ts:353:  const insertPayload = {
  src\app\[locale]\app\projects\new\actions.ts:354:    workspace_id: membership.workspace_id,
  src\app\[locale]\app\projects\new\actions.ts:355:    created_by: user.id,
  src\app\[locale]\app\projects\new\actions.ts:356:    project_type: "direct_commission" as const,
  src\app\[locale]\app\projects\new\actions.ts:357:    status: "draft" as const,
  src\app\[locale]\app\projects\new\actions.ts:358:    intake_mode: "brief" as const,
  src\app\[locale]\app\projects\new\actions.ts:359:    title: fields.title,
  src\app\[locale]\app\projects\new\actions.ts:366:
  src\app\[locale]\app\projects\new\actions.ts:367:  const { data: project, error } = await supabase
  src\app\[locale]\app\projects\new\actions.ts:368:    .from("projects")
> src\app\[locale]\app\projects\new\actions.ts:369:    .insert(insertPayload)
  src\app\[locale]\app\projects\new\actions.ts:370:    .select("id, status")
  src\app\[locale]\app\projects\new\actions.ts:371:    .single();
  src\app\[locale]\app\projects\new\actions.ts:372:
  src\app\[locale]\app\projects\new\actions.ts:373:  if (error || !project) {
  src\app\[locale]\app\projects\new\actions.ts:374:    if (error?.code === PG_UNIQUE_VIOLATION) {
> src\app\[locale]\app\projects\new\actions.ts:375:      // A concurrent ensureDraftProject won the race. Re-SELECT and
 return
  src\app\[locale]\app\projects\new\actions.ts:376:      // the surviving row.
  src\app\[locale]\app\projects\new\actions.ts:377:      const { data: winner } = await supabase
  src\app\[locale]\app\projects\new\actions.ts:378:        .from("projects")
  src\app\[locale]\app\projects\new\actions.ts:379:        .select("id")
  src\app\[locale]\app\projects\new\actions.ts:380:        .eq("workspace_id", membership.workspace_id)
  src\app\[locale]\app\projects\new\actions.ts:381:        .eq("created_by", user.id)
  src\app\[locale]\app\projects\new\actions.ts:388:        if (bootstrap) return { ok: true, data: bootstrap };
  src\app\[locale]\app\projects\new\actions.ts:389:      }
  src\app\[locale]\app\projects\new\actions.ts:390:    }
> src\app\[locale]\app\projects\new\actions.ts:391:    console.error("[ensureDraftProject] insert error:", error);
  src\app\[locale]\app\projects\new\actions.ts:392:    return { error: "db", message: error?.message ?? "insert failed"
 };
  src\app\[locale]\app\projects\new\actions.ts:393:  }
  src\app\[locale]\app\projects\new\actions.ts:394:
  src\app\[locale]\app\projects\new\actions.ts:395:  // 3. Sibling project_briefs row. Same atomic-rollback pattern as
  src\app\[locale]\app\projects\new\actions.ts:396:  //    createProject — if the sibling INSERT fails we roll back via
 service
  src\app\[locale]\app\projects\new\actions.ts:397:  //    role so the wizard can retry without an orphan blocking the 
unique
  src\app\[locale]\app\projects\new\actions.ts:404:    });
  src\app\[locale]\app\projects\new\actions.ts:405:  if (briefErr) {
  src\app\[locale]\app\projects\new\actions.ts:406:    console.error(
> src\app\[locale]\app\projects\new\actions.ts:407:      "[ensureDraftProject] brief insert failed (rolling back projec
t):",
  src\app\[locale]\app\projects\new\actions.ts:408:      briefErr,
  src\app\[locale]\app\projects\new\actions.ts:409:    );
  src\app\[locale]\app\projects\new\actions.ts:410:    const service = createSupabaseService();
  src\app\[locale]\app\projects\new\actions.ts:411:    await service.from("projects").delete().eq("id", project.id);
  src\app\[locale]\app\projects\new\actions.ts:412:    return {
  src\app\[locale]\app\projects\new\actions.ts:413:      error: "db",
  src\app\[locale]\app\projects\new\actions.ts:424:  return { ok: true, data: bootstrap };
  src\app\[locale]\app\projects\new\actions.ts:425:}
  src\app\[locale]\app\projects\new\actions.ts:426:
> src\app\[locale]\app\projects\new\actions.ts:427:export async function submitDraftProject(
  src\app\[locale]\app\projects\new\actions.ts:428:  input: unknown,
  src\app\[locale]\app\projects\new\actions.ts:429:): Promise<SubmitDraftResult> {
  src\app\[locale]\app\projects\new\actions.ts:430:  const parsed = submitDraftInput.safeParse(input);
  src\app\[locale]\app\projects\new\actions.ts:431:  if (!parsed.success) {
  src\app\[locale]\app\projects\new\actions.ts:432:    return { error: "validation", issues: parsed.error.issues };
  src\app\[locale]\app\projects\new\actions.ts:433:  }
  src\app\[locale]\app\projects\new\actions.ts:502:    .single();
  src\app\[locale]\app\projects\new\actions.ts:503:
  src\app\[locale]\app\projects\new\actions.ts:504:  if (error || !updated) {
> src\app\[locale]\app\projects\new\actions.ts:505:    console.error("[submitDraftProject] update error:", error);
  src\app\[locale]\app\projects\new\actions.ts:506:    return { error: "db", message: error?.message ?? "update failed"
 };
  src\app\[locale]\app\projects\new\actions.ts:507:  }
  src\app\[locale]\app\projects\new\actions.ts:508:
  src\app\[locale]\app\projects\new\actions.ts:509:  revalidatePath("/[locale]/app/projects", "page");
  src\app\[locale]\app\projects\new\actions.ts:510:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  src\app\[locale]\app\projects\new\actions.ts:511:  return {
  src\app\[locale]\app\projects\new\actions.ts:828:  attachedPdfs: z.array(PdfAttachmentSchema).max(30).optional().defa
ult([]),
  src\app\[locale]\app\projects\new\actions.ts:829:  attachedUrls: z.array(UrlAttachmentSchema).max(50).optional().defa
ult([]),
  src\app\[locale]\app\projects\new\actions.ts:830:  // Phase 4.x task_03 — Digital Twin intent. Defense-in-depth: clie
nt-supplied
> src\app\[locale]\app\projects\new\actions.ts:831:  // value, validated here and again by the projects.twin_intent CHE
CK constraint
  src\app\[locale]\app\projects\new\actions.ts:832:  // added in task_01 migration. Default 'undecided' matches the col
umn default.
> src\app\[locale]\app\projects\new\actions.ts:833:  twin_intent: z
  src\app\[locale]\app\projects\new\actions.ts:834:    .enum(["undecided", "specific_in_mind", "no_twin"])
  src\app\[locale]\app\projects\new\actions.ts:835:    .optional()
  src\app\[locale]\app\projects\new\actions.ts:836:    .default("undecided"),
  src\app\[locale]\app\projects\new\actions.ts:837:  // Phase 5 Wave A task_03 sub_3a — new boolean twin intent field. 
The Phase 5
  src\app\[locale]\app\projects\new\actions.ts:838:  // wizard (Wave B) will set this field only; legacy paths continue
 to write
> src\app\[locale]\app\projects\new\actions.ts:839:  // twin_intent. Both fields coexist on the same row (defense-in-de
pth).
> src\app\[locale]\app\projects\new\actions.ts:840:  interested_in_twin: z.boolean().default(false),
  src\app\[locale]\app\projects\new\actions.ts:841:  // workspaceId is optional when draftProjectId is provided — the a
ction
  src\app\[locale]\app\projects\new\actions.ts:842:  // resolves it from the draft project row in that case. One of the
 two
  src\app\[locale]\app\projects\new\actions.ts:843:  // must be present for workspace resolution to succeed.
  src\app\[locale]\app\projects\new\actions.ts:844:  workspaceId: z.string().uuid().optional(),
  src\app\[locale]\app\projects\new\actions.ts:845:  // draftProjectId: the wizard's autosave-created draft project. Wh
en
  src\app\[locale]\app\projects\new\actions.ts:846:  // present, workspace is resolved from it. The draft row is delete
d after
  src\app\[locale]\app\projects\new\actions.ts:941:      meeting_preferred_at: data.meeting_preferred_at ?? null,
  src\app\[locale]\app\projects\new\actions.ts:942:      // Phase 4.x task_03: Digital Twin intent (3-radio, default 'u
ndecided').
  src\app\[locale]\app\projects\new\actions.ts:943:      // Persistence requires task_01 migration applied (Wave D D.1)
 — until
> src\app\[locale]\app\projects\new\actions.ts:944:      // then prod DB has no twin_intent column and this field is ig
nored.
> src\app\[locale]\app\projects\new\actions.ts:945:      twin_intent: data.twin_intent,
  src\app\[locale]\app\projects\new\actions.ts:946:      // Phase 5 Wave A task_03 sub_3a: new boolean twin intent fiel
d.
> src\app\[locale]\app\projects\new\actions.ts:947:      // Coexists with twin_intent (defense-in-depth). Wave B wizard
 sets this.
> src\app\[locale]\app\projects\new\actions.ts:948:      interested_in_twin: data.interested_in_twin,
  src\app\[locale]\app\projects\new\actions.ts:949:      workspace_id: resolvedWorkspaceId,
  src\app\[locale]\app\projects\new\actions.ts:950:      created_by: user.id,
  src\app\[locale]\app\projects\new\actions.ts:951:      status: "in_review",
  src\app\[locale]\app\projects\new\actions.ts:952:      submitted_at: new Date().toISOString(),
  src\app\[locale]\app\projects\new\actions.ts:953:      kind: "direct",
  src\app\[locale]\app\projects\new\actions.ts:954:      // project_type stays as 'direct_commission' for backward comp
at



codex
The data migration uses `projects p JOIN project_boards pb ON pb.project_id = p.id` and maps `p.id` into `briefing_documents.project_id`, so the corrected source preserves the parent-project intent. I’m checking schema constraints around board shape and FK behavior now, because those determine whether there are hidden NULL/deleted-user cases.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path 'supabase/migrations/*.sql' -Pattern 'CREATE TABLE project_boards|ALTER TABLE project_boards|project_boards.*project_id|CREATE.*project_boards|add_project_board_pdf|add_project_board_url|attached_pdfs|uploaded_by|added_by' -Context 2,8" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path 'supabase/migrations/*.sql' -Pattern 'CREATE TABLE projects|created_by uuid|REFERENCES profiles\\(id\\)|ON DELETE|twin_intent|workspace_members.*role|CHECK.*role|role IN' -Context 2,6" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/actions.ts' | ForEach-Object { "'$i++; if($i -ge 820 -and $i -le 970){ '"'{0,4}: {1}' -f "'$i, $_ }}' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"interested_in_twin|twin_intent\" src supabase/migrations --glob '"'!supabase/migrations/20260504053000_phase_5_interested_in_twin.sql'"' --glob '"'!src/app/[locale]/app/projects/new/actions.ts'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 414ms:
 820:     .refine(validateTldrawStore, {
 821:       message: "boardDocument is not a valid tldraw store snapshot",
 822:     })
 823:     .default({}),
 824:   // Phase 3.1 hotfix-3: structured attachment columns (Q-AA)
 825:   // Server validates shape/size/scheme (L-026 ??synced with client wizard state)
 826:   attachedPdfs: z.array(PdfAttachmentSchema).max(30).optional().default([]),
 827:   attachedUrls: z.array(UrlAttachmentSchema).max(50).optional().default([]),
 828:   // Phase 4.x task_03 ??Digital Twin intent. Defense-in-depth: client-supplied
 829:   // value, validated here and again by the projects.twin_intent CHECK constraint
 830:   // added in task_01 migration. Default 'undecided' matches the column default.
 831:   twin_intent: z
 832:     .enum(["undecided", "specific_in_mind", "no_twin"])
 833:     .optional()
 834:     .default("undecided"),
 835:   // Phase 5 Wave A task_03 sub_3a ??new boolean twin intent field. The Phase 5
 836:   // wizard (Wave B) will set this field only; legacy paths continue to write
 837:   // twin_intent. Both fields coexist on the same row (defense-in-depth).
 838:   interested_in_twin: z.boolean().default(false),
 839:   // workspaceId is optional when draftProjectId is provided ??the action
 840:   // resolves it from the draft project row in that case. One of the two
 841:   // must be present for workspace resolution to succeed.
 842:   workspaceId: z.string().uuid().optional(),
 843:   // draftProjectId: the wizard's autosave-created draft project. When
 844:   // present, workspace is resolved from it. The draft row is deleted after
 845:   // the real project INSERT succeeds.
 846:   draftProjectId: z.string().uuid().nullable().optional(),
 847: });
 848: 
 849: export type SubmitProjectInput = z.infer<typeof SubmitInputSchema>;
 850: 
 851: export type SubmitProjectResult =
 852:   | { ok: true; projectId: string; redirect: string }
 853:   | { ok: false; error: "unauthenticated" | "validation" | "db"; message?: string };
 854: 
 855: export async function submitProjectAction(
 856:   input: unknown
 857: ): Promise<SubmitProjectResult> {
 858:   // Parse + validate input
 859:   const parsed = SubmitInputSchema.safeParse(input);
 860:   if (!parsed.success) {
 861:     return { ok: false, error: "validation", message: parsed.error.message };
 862:   }
 863:   const data = parsed.data;
 864: 
 865:   // Auth check
 866:   const supabase = await createSupabaseServer();
 867:   const {
 868:     data: { user },
 869:     error: authError,
 870:   } = await supabase.auth.getUser();
 871:   if (authError || !user) return { ok: false, error: "unauthenticated" };
 872: 
 873:   // Resolve workspaceId. Wave C.5d sub_03a (Codex K-05 final review LOOP 1
 874:   // MED-C fix): the prior `created_at asc + limit 1` first-membership
 875:   // fallback could misroute a project to the user's oldest workspace
 876:   // instead of the workspace they had selected in the switcher. Replace
 877:   // with three explicit paths, all gated on a single membership lookup so
 878:   // every accepted workspace_id is one the caller actually belongs to:
 879:   //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
 880:   //   B. draft project row's workspace_id  (autosave path)
 881:   //   C. resolveActiveWorkspace cookie-based resolver  (final fallback)
 882:   // RLS already gates projects.INSERT to workspace members; this is
 883:   // defense-in-depth that returns a clean error path and prevents silent
 884:   // misrouting through the old fallback.
 885:   const { data: memRows } = await supabase
 886:     .from("workspace_members")
 887:     .select("workspace_id")
 888:     .eq("user_id", user.id);
 889:   const memberSet = new Set((memRows ?? []).map((r) => r.workspace_id));
 890: 
 891:   let resolvedWorkspaceId: string | null = null;
 892: 
 893:   if (data.workspaceId && memberSet.has(data.workspaceId)) {
 894:     resolvedWorkspaceId = data.workspaceId;
 895:   }
 896: 
 897:   if (!resolvedWorkspaceId && data.draftProjectId) {
 898:     const { data: draftRow } = await supabase
 899:       .from("projects")
 900:       .select("workspace_id")
 901:       .eq("id", data.draftProjectId)
 902:       .maybeSingle();
 903:     if (draftRow?.workspace_id && memberSet.has(draftRow.workspace_id)) {
 904:       resolvedWorkspaceId = draftRow.workspace_id;
 905:     }
 906:   }
 907: 
 908:   if (!resolvedWorkspaceId) {
 909:     const active = await resolveActiveWorkspace(user.id);
 910:     if (active) resolvedWorkspaceId = active.id;
 911:   }
 912: 
 913:   if (!resolvedWorkspaceId) {
 914:     return { ok: false, error: "db", message: "workspace not found for user" };
 915:   }
 916: 
 917:   // Phase 3.0 columns (budget_band, submitted_at, kind) are not in the
 918:   // generated database.types.ts yet ??use any cast for this INSERT only.
 919:   // Same pattern as task_05 used in page.tsx.
 920:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 columns not in generated types
 921:   const supabaseAny = supabase as any;
 922: 
 923:   // 1. INSERT projects with status='in_review' (L-015 auto-transition; INSERT
 924:   //    is allowed by projects_insert RLS policy for authenticated callers who
 925:   //    are workspace members. Direct UPDATE to status is forbidden by trigger
 926:   //    guard but INSERT with the target status is the allowed L-015 path.)
 927:   const { data: project, error: projErr } = await supabaseAny
 928:     .from("projects")
 929:     .insert({
 930:       // 'name' column does not exist on projects ??map to 'title' (existing column)
 931:       title: data.name,
 932:       // 'description' maps to 'brief' on the projects table
 933:       brief: data.description,
 934:       deliverable_types: data.deliverable_types,
 935:       budget_band: data.budget_band,
 936:       // delivery_date maps to target_delivery_at
 937:       target_delivery_at: data.delivery_date ?? null,
 938:       // Phase 3.1 hotfix-3 addendum: 誘명똿 ?щ쭩 ?쇱옄 (optional)
 939:       meeting_preferred_at: data.meeting_preferred_at ?? null,
 940:       // Phase 4.x task_03: Digital Twin intent (3-radio, default 'undecided').
 941:       // Persistence requires task_01 migration applied (Wave D D.1) ??until
 942:       // then prod DB has no twin_intent column and this field is ignored.
 943:       twin_intent: data.twin_intent,
 944:       // Phase 5 Wave A task_03 sub_3a: new boolean twin intent field.
 945:       // Coexists with twin_intent (defense-in-depth). Wave B wizard sets this.
 946:       interested_in_twin: data.interested_in_twin,
 947:       workspace_id: resolvedWorkspaceId,
 948:       created_by: user.id,
 949:       status: "in_review",
 950:       submitted_at: new Date().toISOString(),
 951:       kind: "direct",
 952:       // project_type stays as 'direct_commission' for backward compat
 953:       project_type: "direct_commission",
 954:       intake_mode: "brief",
 955:     })
 956:     .select("id")
 957:     .single() as { data: { id: string } | null; error: { message: string } | null };
 958: 
 959:   if (projErr || !project) {
 960:     console.error("[submitProjectAction] projects INSERT error:", projErr);
 961:     return {
 962:       ok: false,
 963:       error: "db",
 964:       message: projErr?.message ?? "project insert failed",
 965:     };
 966:   }
 967: 
 968:   // 2. INSERT project_status_history with actor_role='system'.
 969:   //    Option A: service-role client for this single statement only (bypasses
 970:   //    the psh_insert_deny RLS policy which blocks all authenticated users).

 succeeded in 1152ms:

  supabase\migrations\20260422120000_phase_2_0_baseline.sql:113:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:114:  -- Add creator as admin member
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:115:  insert into public.workspace_members (workspace_id, u
ser_id, role, joined_at)
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:116:  values (v_workspace_id, v_user_id, 'admin', now());
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:117:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:118:  -- Grant workspace_admin role
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:119:  insert into public.user_roles (user_id, role, workspa
ce_id)
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:120:  values (v_user_id, 'workspace_admin', v_workspace_id)
;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:121:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1284:    void_at timestamp with time zone,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1285:    is_mock boolean DEFAULT false NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1286:    created_by uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1287:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1288:    updated_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1289:    CONSTRAINT invoices_status_check CHECK ((status = 
ANY (ARRAY['draft'::text, 'issued'::text, 'paid'::text, 'void'::text])))
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1290:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1291:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1292:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1327:    summary_md text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1328:    summary_sent_at timestamp with time zone,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1329:    created_by uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1330:    cancelled_reason text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1331:    cancelled_at timestamp with time zone,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1332:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1333:    updated_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1334:    CONSTRAINT meetings_calendar_sync_status_check CHE
CK ((calendar_sync_status = ANY (ARRAY['pending'::text, 'synced'::text, 'fallback_ics'::text, 'failed'::text]))),
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1335:    CONSTRAINT meetings_status_check CHECK ((status = 
ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1405:    approved_by_email text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1406:    cover_frame_id uuid,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1407:    created_by uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1408:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1409:    updated_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1410:    CONSTRAINT preprod_boards_status_check CHECK ((sta
tus = ANY (ARRAY['draft'::text, 'shared'::text, 'approved'::text, 'archived'::text])))
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1411:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1412:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1413:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1577:    project_id uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1578:    title text,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1579:    created_by uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1580:    created_at timestamp with time zone DEFAULT now() 
NOT NULL
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1581:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1582:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1583:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1584:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1585:-- Name: projects; Type: TABLE; Schema: public; Owner:
 -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1591:    brand_id uuid,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1592:    project_type text DEFAULT 'direct_commission'::tex
t NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1593:    created_by uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1594:    title text NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1595:    brief text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1596:    deliverable_types text[] DEFAULT '{}'::text[] NOT 
NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1597:    estimated_budget_range text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1598:    target_delivery_at timestamp with time zone,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1599:    status text DEFAULT 'draft'::text NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1658:    og_image_path text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1659:    og_image_regenerated_at timestamp with time zone,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1660:    created_by uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1661:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1662:    updated_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1663:    CONSTRAINT showcases_cover_media_type_check CHECK 
((cover_media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text]))),
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1664:    CONSTRAINT showcases_slug_check CHECK ((slug ~ '^[
a-z0-9][a-z0-9-]*[a-z0-9]$'::text)),
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1665:    CONSTRAINT showcases_status_check CHECK ((status =
 ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1666:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1731:    topic text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1732:    is_archived boolean DEFAULT false NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1733:    created_by uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1734:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1735:    updated_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1736:    CONSTRAINT team_channels_name_check CHECK (((lengt
h(name) >= 1) AND (length(name) <= 50))),
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1737:    CONSTRAINT team_channels_slug_check CHECK ((slug ~
 '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text)),
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1738:    CONSTRAINT team_channels_topic_check CHECK ((lengt
h(topic) <= 200))
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1739:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1787:    workspace_id uuid,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1788:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = AN
Y (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1790:    CONSTRAINT ws_role_requires_ws CHECK ((((role ~~ '
workspace_%'::text) AND (workspace_id IS NOT NULL)) OR ((role !~~ 'workspace_%'::text) AND (workspace_id IS NULL))))
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1791:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1792:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1793:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1794:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1795:-- Name: workspace_invitations; Type: TABLE; Schema: p
ublic; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1796:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1806:    accepted_at timestamp with time zone,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1807:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1808:    CONSTRAINT workspace_invitations_role_check CHECK 
((role = ANY (ARRAY['admin'::text, 'member'::text])))
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1809:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1810:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1811:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1812:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1813:-- Name: workspace_members; Type: TABLE; Schema: publi
c; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1814:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1823:    joined_at timestamp with time zone,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1824:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((ro
le = ANY (ARRAY['admin'::text, 'member'::text])))
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1826:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1827:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1828:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1829:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1830:-- Name: workspaces; Type: TABLE; Schema: public; Owne
r: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1831:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3188:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3189:ALTER TABLE ONLY public.brands
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3190:    ADD CONSTRAINT brands_workspace_id_fkey FOREIGN KE
Y (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3191:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3192:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3193:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3194:-- Name: invoice_line_items invoice_line_items_invoice
_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3195:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3196:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3197:ALTER TABLE ONLY public.invoice_line_items
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3198:    ADD CONSTRAINT invoice_line_items_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3199:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3200:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3201:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3202:-- Name: invoices invoices_created_by_fkey; Type: FK C
ONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3203:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3204:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3212:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3213:ALTER TABLE ONLY public.invoices
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3214:    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KE
Y (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3215:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3216:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3217:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3218:-- Name: invoices invoices_supplier_id_fkey; Type: FK 
CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3219:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3220:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3228:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3229:ALTER TABLE ONLY public.invoices
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3230:    ADD CONSTRAINT invoices_workspace_id_fkey FOREIGN 
KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3231:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3232:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3233:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3234:-- Name: meeting_attendees meeting_attendees_meeting_i
d_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3235:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3236:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3237:ALTER TABLE ONLY public.meeting_attendees
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3238:    ADD CONSTRAINT meeting_attendees_meeting_id_fkey F
OREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3239:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3240:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3241:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3242:-- Name: meeting_attendees meeting_attendees_user_id_f
key; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3243:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3244:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3260:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3261:ALTER TABLE ONLY public.meetings
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3262:    ADD CONSTRAINT meetings_project_id_fkey FOREIGN KE
Y (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3263:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3264:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3265:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3266:-- Name: meetings meetings_workspace_id_fkey; Type: FK
 CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3267:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3268:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3269:ALTER TABLE ONLY public.meetings
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3270:    ADD CONSTRAINT meetings_workspace_id_fkey FOREIGN 
KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3271:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3272:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3273:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3274:-- Name: notification_events notification_events_proje
ct_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3275:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3276:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3277:ALTER TABLE ONLY public.notification_events
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3278:    ADD CONSTRAINT notification_events_project_id_fkey
 FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3279:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3280:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3281:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3282:-- Name: notification_events notification_events_user_
id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3283:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3284:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3285:ALTER TABLE ONLY public.notification_events
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3286:    ADD CONSTRAINT notification_events_user_id_fkey FO
REIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3287:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3288:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3289:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3290:-- Name: notification_events notification_events_works
pace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3291:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3292:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3293:ALTER TABLE ONLY public.notification_events
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3294:    ADD CONSTRAINT notification_events_workspace_id_fk
ey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3295:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3296:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3297:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3298:-- Name: notification_preferences notification_prefere
nces_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3299:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3300:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3301:ALTER TABLE ONLY public.notification_preferences
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3302:    ADD CONSTRAINT notification_preferences_user_id_fk
ey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3303:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3304:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3305:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3306:-- Name: notification_unsubscribe_tokens notification_
unsubscribe_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3307:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3308:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3309:ALTER TABLE ONLY public.notification_unsubscribe_token
s
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3310:    ADD CONSTRAINT notification_unsubscribe_tokens_use
r_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3311:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3312:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3313:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3314:-- Name: preprod_boards preprod_boards_cover_frame_fk;
 Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3315:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3316:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3317:ALTER TABLE ONLY public.preprod_boards
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3318:    ADD CONSTRAINT preprod_boards_cover_frame_fk FOREI
GN KEY (cover_frame_id) REFERENCES public.preprod_frames(id) ON DELETE SET NULL;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3319:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3320:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3321:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3322:-- Name: preprod_boards preprod_boards_created_by_fkey
; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3323:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3324:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3332:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3333:ALTER TABLE ONLY public.preprod_boards
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3334:    ADD CONSTRAINT preprod_boards_project_id_fkey FORE
IGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3335:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3336:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3337:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3338:-- Name: preprod_boards preprod_boards_workspace_id_fk
ey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3339:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3340:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3341:ALTER TABLE ONLY public.preprod_boards
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3342:    ADD CONSTRAINT preprod_boards_workspace_id_fkey FO
REIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3343:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3344:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3345:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3346:-- Name: preprod_frame_comments preprod_frame_comments
_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3347:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3348:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3356:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3357:ALTER TABLE ONLY public.preprod_frame_comments
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3358:    ADD CONSTRAINT preprod_frame_comments_board_id_fke
y FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3359:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3360:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3361:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3362:-- Name: preprod_frame_comments preprod_frame_comments
_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3363:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3364:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3365:ALTER TABLE ONLY public.preprod_frame_comments
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3366:    ADD CONSTRAINT preprod_frame_comments_frame_id_fke
y FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3367:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3368:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3369:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3370:-- Name: preprod_frame_comments preprod_frame_comments
_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3371:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3372:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3380:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3381:ALTER TABLE ONLY public.preprod_frame_reactions
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3382:    ADD CONSTRAINT preprod_frame_reactions_board_id_fk
ey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3383:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3384:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3385:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3386:-- Name: preprod_frame_reactions preprod_frame_reactio
ns_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3387:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3388:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3389:ALTER TABLE ONLY public.preprod_frame_reactions
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3390:    ADD CONSTRAINT preprod_frame_reactions_frame_id_fk
ey FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3391:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3392:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3393:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3394:-- Name: preprod_frames preprod_frames_board_id_fkey; 
Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3395:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3396:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3397:ALTER TABLE ONLY public.preprod_frames
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3398:    ADD CONSTRAINT preprod_frames_board_id_fkey FOREIG
N KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3399:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3400:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3401:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3402:-- Name: profiles profiles_id_fkey; Type: FK CONSTRAIN
T; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3403:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3404:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3405:ALTER TABLE ONLY public.profiles
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3406:    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) R
EFERENCES auth.users(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3407:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3408:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3409:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3410:-- Name: project_deliverables project_deliverables_pro
ject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3411:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3412:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3413:ALTER TABLE ONLY public.project_deliverables
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3414:    ADD CONSTRAINT project_deliverables_project_id_fke
y FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3415:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3416:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3417:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3418:-- Name: project_deliverables project_deliverables_rev
iewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3419:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3420:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3436:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3437:ALTER TABLE ONLY public.project_milestones
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3438:    ADD CONSTRAINT project_milestones_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3439:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3440:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3441:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3442:-- Name: project_references project_references_added_b
y_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3443:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3444:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3452:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3453:ALTER TABLE ONLY public.project_references
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3454:    ADD CONSTRAINT project_references_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3455:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3456:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3457:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3458:-- Name: project_threads project_threads_created_by_fk
ey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3459:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3460:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3468:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3469:ALTER TABLE ONLY public.project_threads
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3470:    ADD CONSTRAINT project_threads_project_id_fkey FOR
EIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3471:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3472:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3473:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3474:-- Name: projects projects_brand_id_fkey; Type: FK CON
STRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3475:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3476:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3477:ALTER TABLE ONLY public.projects
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3478:    ADD CONSTRAINT projects_brand_id_fkey FOREIGN KEY 
(brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3479:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3480:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3481:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3482:-- Name: projects projects_created_by_fkey; Type: FK C
ONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3483:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3484:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3492:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3493:ALTER TABLE ONLY public.projects
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3494:    ADD CONSTRAINT projects_workspace_id_fkey FOREIGN 
KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3495:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3496:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3497:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3498:-- Name: showcase_media showcase_media_showcase_id_fke
y; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3499:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3500:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3501:ALTER TABLE ONLY public.showcase_media
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3502:    ADD CONSTRAINT showcase_media_showcase_id_fkey FOR
EIGN KEY (showcase_id) REFERENCES public.showcases(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3503:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3504:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3505:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3506:-- Name: showcases showcases_badge_removal_approved_by
_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3507:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3508:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3532:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3533:ALTER TABLE ONLY public.showcases
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3534:    ADD CONSTRAINT showcases_project_id_fkey FOREIGN K
EY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3535:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3536:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3537:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3538:-- Name: team_channel_message_attachments team_channel
_message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3539:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3540:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3541:ALTER TABLE ONLY public.team_channel_message_attachmen
ts
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3542:    ADD CONSTRAINT team_channel_message_attachments_me
ssage_id_fkey FOREIGN KEY (message_id) REFERENCES public.team_channel_messages(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3543:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3544:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3545:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3546:-- Name: team_channel_messages team_channel_messages_a
uthor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3547:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3548:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3556:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3557:ALTER TABLE ONLY public.team_channel_messages
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3558:    ADD CONSTRAINT team_channel_messages_channel_id_fk
ey FOREIGN KEY (channel_id) REFERENCES public.team_channels(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3559:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3560:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3561:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3562:-- Name: team_channels team_channels_created_by_fkey; 
Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3563:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3564:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3572:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3573:ALTER TABLE ONLY public.team_channels
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3574:    ADD CONSTRAINT team_channels_workspace_id_fkey FOR
EIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3575:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3576:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3577:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3578:-- Name: thread_message_attachments thread_message_att
achments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3579:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3580:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3581:ALTER TABLE ONLY public.thread_message_attachments
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3582:    ADD CONSTRAINT thread_message_attachments_message_
id_fkey FOREIGN KEY (message_id) REFERENCES public.thread_messages(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3583:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3584:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3585:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3586:-- Name: thread_messages thread_messages_author_id_fke
y; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3587:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3588:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3596:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3597:ALTER TABLE ONLY public.thread_messages
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3598:    ADD CONSTRAINT thread_messages_parent_message_id_f
key FOREIGN KEY (parent_message_id) REFERENCES public.thread_messages(id) ON DELETE SET NULL;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3599:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3600:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3601:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3602:-- Name: thread_messages thread_messages_thread_id_fke
y; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3603:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3604:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3605:ALTER TABLE ONLY public.thread_messages
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3606:    ADD CONSTRAINT thread_messages_thread_id_fkey FORE
IGN KEY (thread_id) REFERENCES public.project_threads(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3607:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3608:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3609:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3610:-- Name: user_roles user_roles_user_id_fkey; Type: FK 
CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3611:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3612:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3613:ALTER TABLE ONLY public.user_roles
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3614:    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY
 (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3615:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3616:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3617:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3618:-- Name: user_roles user_roles_workspace_id_fkey; Type
: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3619:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3620:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3621:ALTER TABLE ONLY public.user_roles
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3622:    ADD CONSTRAINT user_roles_workspace_id_fkey FOREIG
N KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3623:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3624:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3625:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3626:-- Name: workspace_invitations workspace_invitations_i
nvited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3627:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3628:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3636:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3637:ALTER TABLE ONLY public.workspace_invitations
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3638:    ADD CONSTRAINT workspace_invitations_workspace_id_
fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3639:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3640:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3641:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3642:-- Name: workspace_members workspace_members_invited_b
y_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3643:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3644:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3652:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3653:ALTER TABLE ONLY public.workspace_members
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3654:    ADD CONSTRAINT workspace_members_user_id_fkey FORE
IGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3655:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3656:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3657:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3658:-- Name: workspace_members workspace_members_workspace
_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3659:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3660:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3661:ALTER TABLE ONLY public.workspace_members
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3662:    ADD CONSTRAINT workspace_members_workspace_id_fkey
 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3663:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3664:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3665:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3666:-- Name: objects objects_bucketId_fkey; Type: FK CONST
RAINT; Schema: storage; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3667:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3668:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3692:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3693:ALTER TABLE ONLY storage.s3_multipart_uploads_parts
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3694:    ADD CONSTRAINT s3_multipart_uploads_parts_upload_i
d_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3695:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3696:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3697:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3698:-- Name: vector_indexes vector_indexes_bucket_id_fkey;
 Type: FK CONSTRAINT; Schema: storage; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3699:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3700:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4438:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4439:
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public
.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace
_id IS NULL)));
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4441:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4442:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4443:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4444:-- Name: user_roles user_roles_self_insert_ws_admin; T
ype: POLICY; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4445:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4446:
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON publi
c.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (
workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4448:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4449:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4450:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4451:-- Name: user_roles user_roles_yagi_admin; Type: POLIC
Y; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4452:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4453:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4519:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4520:
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.work
space_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXI
STS ( SELECT 1
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4522:   FROM public.workspace_members m
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_
id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4524:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4525:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4526:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:4527:-- Name: workspaces ws_read_members; Type: POLICY; Sch
ema: public; Owner: -
  supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:39:  p_scheduled_at timestamptz,
  supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:40:  p_duration_minutes integer,
> supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:41:  p_created_by uuid,
  supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:42:  p_attendees jsonb,
  supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:43:  p_description text DEFAULT NULL
  supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:44:) RETURNS uuid
  supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:45:LANGUAGE plpgsql
  supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:46:SECURITY INVOKER
  supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:47:AS $$
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:25:--       persona retirement path.
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:26:--     - Issue 3 (RLS): creators_insert_self /
 studios_insert_self gained
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:27:--       role consistency EXISTS check. Preven
ts user with role='studio' from
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:28:--       inserting creators row (or vice versa
). Enforces SPEC §1 invariant
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:29:--       "One user = one role at a time" at DB
 level.
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:30:--     - Issue 1 (notification scope): challen
ge_updates_enabled DEFAULT TRUE
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:31:--       confirmed by yagi as covering BOTH tr
ansactional (joined challenge
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:32:--       progress) AND marketing (new challeng
e announcements). Korean
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:33:--       정보통신망법 §50 marketing-info opt-in comp
liance MUST be addressed
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:65:-- New columns for Phase 2.5 identity model.
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:66:ALTER TABLE public.profiles
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR 
role IN ('creator','studio','observer')),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:68:  ADD COLUMN instagram_handle text,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:69:  ADD COLUMN role_switched_at timestamptz,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:70:  ADD COLUMN handle_changed_at timestamptz;
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:71:
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:72:-- Enforce 200-char bio cap per SPEC v2 §3 G1 
Task 1. Column pre-exists.
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:73:ALTER TABLE public.profiles
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:83:-- profiles.display_name (latter = user's real
 name; former = creator handle).
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:84:CREATE TABLE public.creators (
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:85:  id uuid PRIMARY KEY REFERENCES public.profil
es(id) ON DELETE CASCADE,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:86:  display_name text NOT NULL CHECK (char_lengt
h(display_name) BETWEEN 1 AND 80),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:87:  created_at timestamptz NOT NULL DEFAULT now(
),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:88:  updated_at timestamptz NOT NULL DEFAULT now(
)
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:89:);
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:90:
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:91:COMMENT ON TABLE public.creators IS 'Phase 2.5
 — AI creator persona (role=creator). 1:1 with profiles.';
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:93:-- Studios: B2B role with distinct studio bran
d name + contact.
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:94:CREATE TABLE public.studios (
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:95:  id uuid PRIMARY KEY REFERENCES public.profil
es(id) ON DELETE CASCADE,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:96:  studio_name text NOT NULL CHECK (char_length
(studio_name) BETWEEN 1 AND 120),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:97:  contact_email citext,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:98:  member_count text CHECK (member_count IS NUL
L OR member_count IN ('1-5','6-10','11+')),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:99:  created_at timestamptz NOT NULL DEFAULT now(
),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:100:  updated_at timestamptz NOT NULL DEFAULT now
()
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:101:);
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:129:  judging_config jsonb NOT NULL DEFAULT '{}':
:jsonb,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:130:  reminder_sent_at timestamptz,
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:131:  created_by uuid NOT NULL REFERENCES auth.us
ers(id) ON DELETE RESTRICT,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:132:  created_at timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:133:  updated_at timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:134:  CHECK (
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:135:    -- If open_at or close_at set, ordering i
s enforced.
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:136:    open_at IS NULL OR close_at IS NULL OR op
en_at < close_at
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:137:  )
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:147:CREATE TABLE public.challenge_submissions (
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:148:  id uuid PRIMARY KEY DEFAULT gen_random_uuid
(),
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:149:  challenge_id uuid NOT NULL REFERENCES publi
c.challenges(id) ON DELETE CASCADE,
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:150:  submitter_id uuid NOT NULL REFERENCES publi
c.profiles(id) ON DELETE CASCADE,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:151:  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:152:  status text NOT NULL DEFAULT 'created'
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:153:    CHECK (status IN ('created','processing',
'ready','rejected')),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:154:  created_at timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:155:  updated_at timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:156:  UNIQUE (challenge_id, submitter_id)
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:163:CREATE TABLE public.challenge_votes (
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:164:  id uuid PRIMARY KEY DEFAULT gen_random_uuid
(),
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:165:  challenge_id uuid NOT NULL REFERENCES publi
c.challenges(id) ON DELETE CASCADE,
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:166:  submission_id uuid NOT NULL REFERENCES publ
ic.challenge_submissions(id) ON DELETE CASCADE,
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:167:  voter_id uuid NOT NULL REFERENCES public.pr
ofiles(id) ON DELETE CASCADE,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:168:  created_at timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:169:  UNIQUE (challenge_id, voter_id)
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:170:);
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:171:
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:172:CREATE INDEX challenge_votes_submission_idx O
N public.challenge_votes (submission_id);
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:173:
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:177:CREATE TABLE public.challenge_judgments (
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:178:  id uuid PRIMARY KEY DEFAULT gen_random_uuid
(),
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:179:  challenge_id uuid NOT NULL REFERENCES publi
c.challenges(id) ON DELETE CASCADE,
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:180:  submission_id uuid NOT NULL REFERENCES publ
ic.challenge_submissions(id) ON DELETE CASCADE,
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:181:  admin_id uuid NOT NULL REFERENCES auth.user
s(id) ON DELETE RESTRICT,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:182:  score numeric(5,2),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:183:  notes text,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:184:  created_at timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:185:  UNIQUE (submission_id, admin_id)
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:186:);
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:187:
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:192:CREATE TABLE public.showcase_challenge_winner
s (
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:193:  submission_id uuid PRIMARY KEY
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:194:    REFERENCES public.challenge_submissions(i
d) ON DELETE CASCADE,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:195:  challenge_id uuid NOT NULL
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:196:    REFERENCES public.challenges(id) ON DELET
E CASCADE,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:197:  showcase_id uuid
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:198:    REFERENCES public.showcases(id) ON DELETE
 SET NULL,
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:199:  rank int NOT NULL DEFAULT 1 CHECK (rank >= 
1),
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:200:  announced_at timestamptz NOT NULL DEFAULT n
ow(),
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:201:  announced_by uuid NOT NULL REFERENCES auth.
users(id) ON DELETE RESTRICT
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:202:);
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:203:
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:204:CREATE INDEX showcase_challenge_winners_chall
enge_idx
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:205:  ON public.showcase_challenge_winners (chall
enge_id, rank);
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:206:
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:207:
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:297:    AND EXISTS (
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:298:      SELECT 1 FROM public.profiles p
> supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:299:      WHERE p.id = auth.uid() AND p.role IN (
'creator','studio')
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:300:    )
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:301:    AND EXISTS (
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:302:      SELECT 1 FROM public.challenges c
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:303:      WHERE c.id = challenge_id AND c.state =
 'open'
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:304:    )
  supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:305:  );
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:16:--   H4 — role consistency only fired on INSERT; UPD
ATE on stale creators/
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:17:--        studios rows survived role flips; no mutua
l exclusion. Section 3
> supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:18:--        tightens UPDATE policies with role EXISTS 
+ adds dual-role INSERT
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:19:--        triggers. Stale rows preserved as read-onl
y historical record
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:20:--        (was: hard-delete; yagi Q2 pre-apply flip 
— winner attribution
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:21:--        and submission history worth more than sch
ema tidiness). Read
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:22:--        queries in G3/G6 must join profiles.role t
o surface only active
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:23:--        personas. Cleanup function retained as no-
op stub for future
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:24:--        re-introduction if policy decision reverse
s.
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:107:  FOREIGN KEY (challenge_id, submission_id)
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:108:  REFERENCES public.challenge_submissions (challeng
e_id, id)
> supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:109:  ON DELETE CASCADE;
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:110:
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:111:-- Composite FK: challenge_judgments.
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:112:ALTER TABLE public.challenge_judgments
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:113:  ADD CONSTRAINT challenge_judgments_submission_cha
llenge_consistency_fkey
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:114:  FOREIGN KEY (challenge_id, submission_id)
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:115:  REFERENCES public.challenge_submissions (challeng
e_id, id)
> supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:116:  ON DELETE CASCADE;
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:117:
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:118:-- Composite FK: showcase_challenge_winners.
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:119:ALTER TABLE public.showcase_challenge_winners
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:120:  ADD CONSTRAINT showcase_challenge_winners_submiss
ion_challenge_consistency_fkey
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:121:  FOREIGN KEY (challenge_id, submission_id)
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:122:  REFERENCES public.challenge_submissions (challeng
e_id, id)
> supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:123:  ON DELETE CASCADE;
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:124:
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:125:
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:126:-- ================================================
===========================
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:127:-- 3. H4 — creators/studios role exclusivity + role
-flip cleanup
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:128:-- ================================================
===========================
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:129:
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:165:  );
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:166:
> supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:167:-- 3b. Dual-role INSERT block triggers (defense aga
inst race after RLS).
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:168:CREATE OR REPLACE FUNCTION public.tg_creators_block
_dual_role()
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:169:RETURNS trigger
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:170:LANGUAGE plpgsql
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:171:SECURITY INVOKER
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:172:SET search_path = public, pg_temp
  supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:173:AS $$
  supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:24:CREATE TABLE IF NOT EXISTS public.handle_histor
y (
  supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:25:  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
,
> supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:26:  user_id uuid NOT NULL REFERENCES public.profi
les(id) ON DELETE CASCADE,
  supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:27:  old_handle citext NOT NULL,
  supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:28:  new_handle citext NOT NULL,
  supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:29:  changed_at timestamptz NOT NULL DEFAULT now()
  supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:30:);
  supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:31:
  supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:32:-- Anti-squatting: once a handle appears as old
_handle, no one (not even the
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAIN
T IF EXISTS profiles_role_check;
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT
 profiles_role_check
> supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator
', 'studio', 'observer', 'client'));
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:31:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:32:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:33:-- =======================================
======================================
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:34:-- 2. clients table — company info for the
 'client' persona (1:1 with profiles)
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:35:-- =======================================
======================================
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:36:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:37:CREATE TABLE IF NOT EXISTS public.clients 
(
> supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:38:  id uuid PRIMARY KEY REFERENCES public.pr
ofiles(id) ON DELETE CASCADE,
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:39:  company_name text NOT NULL CHECK (char_l
ength(company_name) BETWEEN 1 AND 120),
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:40:  company_type text NOT NULL CHECK (compan
y_type IN (
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:41:    'label', 'agency', 'studio', 'independ
ent', 'other'
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:42:  )),
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:43:  contact_name text NOT NULL CHECK (char_l
ength(contact_name) BETWEEN 1 AND 60),
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:44:  contact_email citext NOT NULL,
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:71:CREATE TABLE IF NOT EXISTS public.commissi
on_intakes (
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:72:  id uuid PRIMARY KEY DEFAULT gen_random_u
uid(),
> supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:73:  client_id uuid NOT NULL REFERENCES publi
c.clients(id) ON DELETE CASCADE,
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:74:  title text NOT NULL CHECK (char_length(t
itle) BETWEEN 1 AND 200),
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:75:  category text NOT NULL CHECK (category I
N (
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:76:    'music_video', 'commercial', 'teaser',
 'lyric_video', 'performance', 'social', 'other'
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:77:  )),
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:78:  budget_range text NOT NULL CHECK (budget
_range IN (
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:79:    'under_5m', '5m_15m', '15m_30m', '30m_
50m', '50m_100m', '100m_plus', 'negotiable'
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:89:  admin_response_md text CHECK (admin_resp
onse_md IS NULL OR char_length(admin_response_md) BETWEEN 1 AND 20000),
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:90:  admin_responded_at timestamptz,
> supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:91:  admin_responded_by uuid REFERENCES publi
c.profiles(id) ON DELETE SET NULL,
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:92:  created_at timestamptz NOT NULL DEFAULT 
now(),
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:93:  updated_at timestamptz NOT NULL DEFAULT 
now()
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:94:);
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:95:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:96:COMMENT ON TABLE public.commission_intakes
 IS
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:97:  'Phase 2.7 — AI VFX commission intake fo
rm submissions. Manual-response MVP: '
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:117:ALTER TABLE public.challenges
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:118:  ADD COLUMN IF NOT EXISTS sponsor_client
_id uuid
> supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:119:    REFERENCES public.clients(id) ON DELE
TE SET NULL;
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:120:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:121:COMMENT ON COLUMN public.challenges.spons
or_client_id IS
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:122:  'Phase 2.7 — when non-null, surface the
 client''s company_name as challenge sponsor. '
> supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:123:  'ON DELETE SET NULL preserves the chall
enge if the client account is removed.';
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:124:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:125:CREATE INDEX IF NOT EXISTS challenges_spo
nsor_idx
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:126:  ON public.challenges(sponsor_client_id)
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:127:  WHERE sponsor_client_id IS NOT NULL;
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:128:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:129:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:255:BEGIN
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:256:  -- Caller resolution. NULL caller (serv
ice_role / direct DB session) bypasses
> supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:257:  -- both checks below — those paths are 
trusted (they require service-role key
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:258:  -- or direct DB access, both of which r
epresent a total compromise anyway).
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:259:  IF v_caller IS NULL THEN
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:260:    RETURN NEW;
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:261:  END IF;
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:262:
  supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_ca
ller);
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:39:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:40:CREATE TABLE IF NOT EXISTS public.project_briefs (
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:41:  project_id    uuid PRIMARY KEY REFERENCES public.pr
ojects(id) ON DELETE CASCADE,
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:42:  content_json  jsonb NOT NULL DEFAULT '{"type":"doc"
,"content":[]}'::jsonb
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:43:                  CHECK (octet_length(content_json::t
ext) <= 2097152),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:44:  -- 2 MiB hard cap (K05-G_B_1-03 fix). Mirrors the s
erver-action 2 MiB
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:45:  -- guard in src/app/[locale]/app/projects/[id]/brie
f/actions.ts; this is
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:46:  -- the database-level defense-in-depth for direct P
ostgREST writes.
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:47:  status        text NOT NULL DEFAULT 'editing'
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:52:                  CHECK (tiptap_schema_version >= 1),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:53:  updated_at    timestamptz NOT NULL DEFAULT now(),
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:54:  updated_by    uuid REFERENCES auth.users(id) ON DEL
ETE SET NULL
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:55:);
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:56:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:57:COMMENT ON TABLE public.project_briefs IS
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:58:  'Phase 2.8 — brief board content (TipTap ProseMirro
r JSON). 1:1 with projects.id. '
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:59:  'status: editing (default) or locked (production fr
ozen, yagi_admin-only flip).';
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:60:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:79:CREATE TABLE IF NOT EXISTS public.project_brief_versi
ons (
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:80:  id            uuid PRIMARY KEY DEFAULT gen_random_u
uid(),
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:81:  project_id    uuid NOT NULL REFERENCES public.proje
cts(id) ON DELETE CASCADE,
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:82:  version_n     int NOT NULL CHECK (version_n >= 1),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:83:  content_json  jsonb NOT NULL
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:84:                  CHECK (octet_length(content_json::t
ext) <= 2097152),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:85:  -- Same 2 MiB cap as project_briefs.content_json (K
05-G_B_1-03 fix).
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:86:  label         text CHECK (label IS NULL OR char_len
gth(label) BETWEEN 1 AND 200),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:87:  created_at    timestamptz NOT NULL DEFAULT now(),
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:88:  created_by    uuid REFERENCES auth.users(id) ON DEL
ETE SET NULL,
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:89:  UNIQUE (project_id, version_n)
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:90:);
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:91:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:92:COMMENT ON TABLE public.project_brief_versions IS
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:93:  'Phase 2.8 — append-only snapshot history of projec
t_briefs.content_json. '
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:94:  'No UPDATE/DELETE — preserved for audit and restore
.';
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:113:CREATE TABLE IF NOT EXISTS public.project_brief_asse
ts (
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:114:  id            uuid PRIMARY KEY DEFAULT gen_random_
uuid(),
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:115:  project_id    uuid NOT NULL REFERENCES public.proj
ects(id) ON DELETE CASCADE,
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:116:  storage_key   text NOT NULL CHECK (char_length(sto
rage_key) BETWEEN 1 AND 500),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:117:  mime_type     text NOT NULL CHECK (char_length(mim
e_type) BETWEEN 1 AND 200),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:118:  byte_size     bigint NOT NULL CHECK (byte_size > 0
 AND byte_size <= 209715200),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:119:  original_name text CHECK (original_name IS NULL OR
 char_length(original_name) <= 500),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:120:  uploaded_at   timestamptz NOT NULL DEFAULT now(),
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:121:  uploaded_by   uuid REFERENCES auth.users(id) ON DE
LETE SET NULL
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:122:);
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:123:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:124:COMMENT ON TABLE public.project_brief_assets IS
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:125:  'Phase 2.8 — R2-uploaded asset metadata referenced
 from project_briefs.content_json. '
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:126:  'byte_size hard cap 200MB (videos use embed blocks
 instead).';
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:127:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:175:--   - status flip ('editing' ↔ 'locked'): yagi_admi
n only — enforced by
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:176:--     trigger (§6), not RLS WITH CHECK (RLS cannot 
reach OLD/NEW columns).
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:177:--   - DELETE: cascade-only via projects ON DELETE C
ASCADE; no policy.
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:178:--
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:179:-- All policies use (select auth.uid()) for the opti
mizer subquery cache
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:180:-- pattern (Phase 2.7+ convention).
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:181:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:182:-- ----- project_briefs -----
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:183:
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:4:-- Wires the commission intake queue to the B
rief Board project hub.
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:5:-- Adds:
> supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:6:--   1. commission_intakes.converted_to_proje
ct_id (FK projects.id, ON DELETE
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:7:--      SET NULL) + index.
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:8:--   2. New legal state value 'converted'.
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:9:--   3. Trigger updated to permit submitted→c
onverted AND admin_responded→
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:10:--      converted, and to block non-admin se
lf-mutation of the new column.
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:11:--   4. SECURITY DEFINER RPC convert_commiss
ion_to_project(uuid):
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:12:--        - yagi_admin only
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:27:ALTER TABLE public.commission_intakes
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:28:  ADD COLUMN IF NOT EXISTS converted_to_proj
ect_id uuid
> supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:29:    REFERENCES public.projects(id) ON DELETE
 SET NULL;
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:30:
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:31:COMMENT ON COLUMN public.commission_intakes.
converted_to_project_id IS
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:32:  'Phase 2.8.1 — populated by convert_commis
sion_to_project(). Points at '
> supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:33:  'the Workshop project that absorbed this i
ntake. ON DELETE SET NULL so '
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:34:  'project deletion does not cascade through
 the intake history.';
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:35:
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:36:CREATE INDEX IF NOT EXISTS commission_intake
s_converted_project_idx
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:37:  ON public.commission_intakes(converted_to_
project_id)
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:38:  WHERE converted_to_project_id IS NOT NULL;
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:39:
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:136:  id               uuid        PRIMARY KEY DE
FAULT gen_random_uuid(),
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:137:  project_id       uuid        NOT NULL
> supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:138:                                 REFERENCES p
ublic.projects(id) ON DELETE CASCADE,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:139:  from_status      text        NULL,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:140:  to_status        text        NOT NULL,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:141:  actor_id         uuid        NULL
> supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:142:                                 REFERENCES a
uth.users(id) ON DELETE SET NULL,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:143:  actor_role       text        NOT NULL
> supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:144:                                 CHECK (actor
_role IN (
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:145:                                   'client', 
'yagi_admin', 'workspace_admin', 'system'
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:146:                                 )),
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:147:  comment          text        NULL,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:148:  transitioned_at  timestamptz NOT NULL DEFAU
LT now()
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:149:);
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:150:
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:256:--   delivered   → cancelled          ✓
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:257:--
> supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_adm
in'):
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:259:--   in_review   → in_progress        ✓
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:260:--   in_revision → in_progress        ✓
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:261:--   in_progress → delivered          ✓
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:262:--   draft       → cancelled          ✓
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:263:--   submitted   → cancelled          ✓
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:264:--   in_review   → cancelled          ✓
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:305:
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:306:    -- ---- admin transitions (yagi_admin OR 
workspace_admin) ----
> supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspa
ce_admin') THEN
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:308:      CASE
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:309:        WHEN from_status = 'in_review'    AND
 to_status = 'in_progress' THEN true
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:310:        WHEN from_status = 'in_revision'  AND
 to_status = 'in_progress' THEN true
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:311:        WHEN from_status = 'in_progress'  AND
 to_status = 'delivered'   THEN true
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:312:        WHEN from_status = 'approved'     AND
 to_status = 'archived'    THEN true
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:313:        -- NOTE: admin may NOT set delivered→
approved (that is client-only above)
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WIT
H CHECK was (is_ws_admin OR is_yagi_admin)
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:5:-- since Phase 2.0 baseline. A regular
 workspace member (client with
> supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:6:-- workspace_members.role != 'admin') 
cannot INSERT projects via the user-scoped
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:7:-- authenticated client. This blocks a
ll project submissions from non-admin
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:8:-- workspace members — the primary use
r class for project submission.
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:9:--
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:10:-- Root cause: Phase 2.0 baseline wro
te the policy for the admin-only project
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:11:-- creation path (commission intake).
 Phase 3.0 submitProjectAction added a
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:12:-- client-facing path using the user-
scoped client without catching that the
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:13:-- INSERT policy would reject non-adm
in clients.
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:14:--
> supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:15:-- In prod today (2026-04-28) workspa
ce_members only has role='admin' rows
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:16:-- (2 rows, both Yagi internal), so t
he bug was masked during all Phase 2.x
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:17:-- development. A real client (role='
member' or 'viewer') would hit RLS
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:18:-- rejection on every project submit.
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:19:--
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:20:-- Fix: extend WITH CHECK to is_ws_me
mber (any workspace member), matching
  supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:21:-- the read policy (projects_read use
s is_ws_member). The trigger guard
  supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:15:--   4. cron             — every 6h, hard-
DELETE rows with deleted_at < now()-3d
  supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:16:--                         AND no invoice 
rows (FK invoices_project_id_fkey is
> supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:17:--                         ON DELETE RESTR
ICT — a project with an invoice must
  supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:18:--                         be cleared by y
agi manually via admin trash)
  supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:19:--
  supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:20:-- Idempotency:
  supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:21:--   ADD COLUMN IF NOT EXISTS, DROP POLICY
 IF EXISTS + CREATE POLICY,
  supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:22:--   cron.unschedule wrapped in EXISTS che
ck, then cron.schedule.
  supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:23:--
  supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:16:--   ws_admin from producing a row with delete
d_at IS NOT NULL.
  supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:17:--
> supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:18:-- Finding 2 — save_brief_version did not gate
 on deleted_at
  supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:19:--   The 2.8.1 RPC predates the 2.8.2 soft-del
ete column. SECURITY
  supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:20:--   DEFINER bypasses RLS and the function bod
y authorizes only on
  supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without chec
king projects.deleted_at.
  supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:22:--   A non-yagi workspace_member can still sna
pshot the brief of a
  supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:23:--   trashed project through this RPC, mutatin
g project_briefs and
  supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:24:--   project_brief_versions. Wrap with an earl
y `deleted_at IS NULL`
  supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:51:
  supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:52:ALTER TABLE public.meetings
> supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:53:  ADD COLUMN IF NOT EXISTS assigned_admin_id uu
id REFERENCES public.profiles(id) ON DELETE SET NULL;
  supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:54:
  supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:55:ALTER TABLE public.meetings
  supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:56:  ADD COLUMN IF NOT EXISTS ics_uid text NOT NUL
L DEFAULT gen_random_uuid()::text;
  supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:57:
  supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:58:-- 3. Status enum extension -------------------
-------------------------
  supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:59:
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:37:CREATE TABLE IF NOT EXISTS public.support_threads 
(
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:38:  id              uuid PRIMARY KEY DEFAULT gen_ran
dom_uuid(),
> supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:39:  workspace_id    uuid NOT NULL REFERENCES public.
workspaces(id) ON DELETE CASCADE,
> supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:40:  client_id       uuid NOT NULL REFERENCES public.
profiles(id) ON DELETE CASCADE,
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:41:  status          text NOT NULL DEFAULT 'open',
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:42:  last_message_at timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:43:  created_at      timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:44:  updated_at      timestamptz NOT NULL DEFAULT now
(),
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:45:  CONSTRAINT support_threads_status_check CHECK (s
tatus IN ('open', 'closed')),
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:46:  CONSTRAINT support_threads_unique_per_client UNI
QUE (workspace_id, client_id)
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:59:CREATE TABLE IF NOT EXISTS public.support_messages
 (
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:60:  id          uuid PRIMARY KEY DEFAULT gen_random_
uuid(),
> supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:61:  thread_id   uuid NOT NULL REFERENCES public.supp
ort_threads(id) ON DELETE CASCADE,
> supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:62:  author_id   uuid NOT NULL REFERENCES public.prof
iles(id) ON DELETE CASCADE,
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:63:  body        text,
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:64:  image_url   text,
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:65:  created_at  timestamptz NOT NULL DEFAULT now(),
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:66:  CONSTRAINT support_messages_body_or_image CHECK 
(
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:67:    (body IS NOT NULL AND char_length(body) BETWEE
N 1 AND 4000)
  supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:68:    OR image_url IS NOT NULL
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:8:CREATE TABLE IF NOT EXISTS project_boards (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:9:  id              uuid PRIMARY KEY DEFAULT gen_rando
m_uuid(),
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:10:  project_id      uuid NOT NULL UNIQUE REFERENCES p
rojects(id) ON DELETE CASCADE,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:11:  document        jsonb NOT NULL DEFAULT '{}'::json
b,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:12:  schema_version  int  NOT NULL DEFAULT 1,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:13:  asset_index     jsonb NOT NULL DEFAULT '[]'::json
b,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:14:  source          text NOT NULL CHECK (source IN ('
wizard_seed', 'admin_init', 'migrated')),
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:15:  is_locked       boolean NOT NULL DEFAULT false,
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:16:  locked_by       uuid REFERENCES profiles(id),
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:17:  locked_at       timestamptz,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:18:  created_at      timestamptz NOT NULL DEFAULT now(
),
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:19:  updated_at      timestamptz NOT NULL DEFAULT now(
)
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:20:);
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:21:
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:22:-- ================================================
============
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:25:CREATE TABLE IF NOT EXISTS project_board_versions (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:26:  id          uuid PRIMARY KEY DEFAULT gen_random_u
uid(),
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:27:  board_id    uuid NOT NULL REFERENCES project_boar
ds(id) ON DELETE CASCADE,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:28:  version     int  NOT NULL,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:29:  document    jsonb NOT NULL,
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:30:  created_by  uuid REFERENCES profiles(id),
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:31:  created_at  timestamptz NOT NULL DEFAULT now(),
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:32:  label       text,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:33:  UNIQUE (board_id, version)
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:34:);
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:35:
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:36:CREATE INDEX IF NOT EXISTS idx_project_board_versio
ns_board_version
> supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:1:-- Phase 4.x -- task_01 -- workspace.k
ind + projects.twin_intent + projects.kind enum + project_licenses
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:2:
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:3:-- ===================================
=========================
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:4:-- 1. workspaces.kind
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:5:-- ===================================
=========================
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:6:ALTER TABLE workspaces
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:7:  ADD COLUMN kind text NOT NULL DEFAUL
T 'brand'
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:15:
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:16:-- ==================================
==========================
> supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:17:-- 2. projects.twin_intent
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:18:-- ==================================
==========================
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:19:ALTER TABLE projects
> supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:20:  ADD COLUMN twin_intent text NOT NUL
L DEFAULT 'undecided'
> supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:21:    CHECK (twin_intent IN ('undecided
', 'specific_in_mind', 'no_twin'));
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:22:
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:23:-- ==================================
==========================
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:24:-- 3. projects.kind enum expansion
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:25:-- ==================================
==========================
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:26:ALTER TABLE projects
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:27:  DROP CONSTRAINT IF EXISTS projects_
kind_check;
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:44:CREATE TABLE project_licenses (
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:45:  id uuid PRIMARY KEY DEFAULT gen_ran
dom_uuid(),
> supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:46:  project_id uuid NOT NULL REFERENCES
 projects(id) ON DELETE CASCADE,
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:47:  campaign_name text NOT NULL,
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:48:  region text NOT NULL DEFAULT 'KR'
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:49:    CHECK (region IN ('KR', 'JP', 'US
', 'EU', 'ASIA', 'GLOBAL')),
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:50:  start_date date NOT NULL,
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:51:  end_date date,  -- NULL allowed (pe
rpetual; explicit end is the default)
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:52:  fee_amount_krw bigint NOT NULL DEFA
ULT 0,
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:58:  created_at timestamptz NOT NULL DEF
AULT now(),
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:59:  updated_at timestamptz NOT NULL DEF
AULT now(),
> supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:60:  created_by uuid NOT NULL REFERENCES
 profiles(id)
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:61:);
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:62:
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:63:CREATE INDEX idx_project_licenses_pro
ject ON project_licenses(project_id);
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:64:CREATE INDEX idx_project_licenses_sta
tus ON project_licenses(status);
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:65:
  supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:66:-- RLS
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:5:CREATE TABLE briefing_documents (
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:6:  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
> supabase\migrations\20260504052541_phase_5_briefing_documents.sql:7:  project_id uuid NOT NULL REFERENCES projects(id
) ON DELETE CASCADE,
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:8:  -- 분류: 기획서 vs 레퍼런스
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:9:  kind text NOT NULL CHECK (kind IN ('brief', 're
ference')),
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:10:  -- 자료 source
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:11:  source_type text NOT NULL CHECK (source_type I
N ('upload', 'url')),
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:12:  -- upload (PDF, image 등)
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:13:  storage_key text,
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:25:  -- meta
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:26:  created_at timestamptz NOT NULL DEFAULT now(),
> supabase\migrations\20260504052541_phase_5_briefing_documents.sql:27:  created_by uuid NOT NULL REFERENCES profiles(i
d),
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:28:  -- source_type 별 required field 강제
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:29:  CONSTRAINT briefing_documents_source_check CHE
CK (
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:30:    (source_type = 'upload' AND storage_key IS N
OT NULL AND filename IS NOT NULL) OR
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:31:    (source_type = 'url' AND url IS NOT NULL)
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:32:  )
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:33:);
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:63:        OR p.workspace_id IN (
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:64:          SELECT workspace_id FROM workspace_mem
bers
> supabase\migrations\20260504052541_phase_5_briefing_documents.sql:65:          WHERE user_id = auth.uid() AND role IN
 ('owner', 'admin')
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:66:        )
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:67:    )
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:68:    OR EXISTS (
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:69:      SELECT 1 FROM profiles
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:70:      WHERE id = auth.uid() AND role = 'yagi_adm
in'
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:71:    )
  supabase\migrations\20260504053000_phase_5_interested_in_twin.sql:1:-- Phase 5 Wave A task_03 sub_3a — adds intereste
d_in_twin boolean column to
> supabase\migrations\20260504053000_phase_5_interested_in_twin.sql:2:-- projects. twin_intent enum kept (deprecated, c
omment-flagged) for legacy
  supabase\migrations\20260504053000_phase_5_interested_in_twin.sql:3:-- data preservation.
  supabase\migrations\20260504053000_phase_5_interested_in_twin.sql:4:
  supabase\migrations\20260504053000_phase_5_interested_in_twin.sql:5:ALTER TABLE projects
  supabase\migrations\20260504053000_phase_5_interested_in_twin.sql:6:  ADD COLUMN interested_in_twin boolean NOT NULL 
DEFAULT false;
  supabase\migrations\20260504053000_phase_5_interested_in_twin.sql:7:
> supabase\migrations\20260504053000_phase_5_interested_in_twin.sql:8:COMMENT ON COLUMN projects.twin_intent IS 'DEPREC
ATED Phase 5 — use interested_in_twin instead. Kept for legacy data preservation.';



 succeeded in 1423ms:

  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1547:    id uuid DEFAULT gen_random_uuid() NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1548:    project_id uuid NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1549:    added_by uuid NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1550:    storage_path text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1551:    external_url text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1552:    og_title text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1553:    og_description text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1554:    og_image_url text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1555:    caption text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1556:    tags text[] DEFAULT '{}'::text[],
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1557:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3440:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3441:--
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3442:-- Name: project_references project_references_added_b
y_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3443:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3444:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3445:ALTER TABLE ONLY public.project_references
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3446:    ADD CONSTRAINT project_references_added_by_fkey FO
REIGN KEY (added_by) REFERENCES public.profiles(id);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3447:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3448:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3449:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3450:-- Name: project_references project_references_project
_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3451:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3452:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3453:ALTER TABLE ONLY public.project_references
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3454:    ADD CONSTRAINT project_references_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:119:  original_name text CHECK (original_name IS NULL OR
 char_length(original_name) <= 500),
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:120:  uploaded_at   timestamptz NOT NULL DEFAULT now(),
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:121:  uploaded_by   uuid REFERENCES auth.users(id) ON DE
LETE SET NULL
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:122:);
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:123:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:124:COMMENT ON TABLE public.project_brief_assets IS
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:125:  'Phase 2.8 — R2-uploaded asset metadata referenced
 from project_briefs.content_json. '
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:126:  'byte_size hard cap 200MB (videos use embed blocks
 instead).';
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:127:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:128:ALTER TABLE public.project_brief_assets ENABLE ROW L
EVEL SECURITY;
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:129:ALTER TABLE public.project_brief_assets FORCE ROW LE
VEL SECURITY;
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:316:  TO authenticated
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:317:  WITH CHECK (
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:318:    uploaded_by = (select auth.uid())
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:319:    AND EXISTS (
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:320:      SELECT 1 FROM public.projects p
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:321:      WHERE p.id = project_brief_assets.project_id
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:322:        AND (
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:323:          public.is_ws_member((select auth.uid()), p
.workspace_id)
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()
))
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:325:        )
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:326:    )
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:334:  TO authenticated
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:335:  USING (
> supabase\migrations\20260426000000_phase_2_8_brief_board.sql:336:    uploaded_by = (select auth.uid())
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:338:  );
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:339:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:340:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:341:-- ----- embed_cache -----
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:342:
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:343:DROP POLICY IF EXISTS embed_cache_select ON public.e
mbed_cache;
  supabase\migrations\20260426000000_phase_2_8_brief_board.sql:344:CREATE POLICY embed_cache_select
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:221:  LOOP
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:222:    INSERT INTO public.project_references (
> supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:223:      project_id, added_by, external_url, m
edia_type
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:224:    ) VALUES (
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:225:      v_project_id, v_caller, v_ref_url, 'i
mage'
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:226:    );
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:227:    v_ref_count := v_ref_count + 1;
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:228:  END LOOP;
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:229:
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:230:  -- 4. Flip intake state. Trigger permits 
admin_responded→converted and
  supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:231:  --    submitted→converted; the column-gua
rd branch is bypassed for
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:164:-- SECTION C: ALTER project_references (table
 already exists from baseline)
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:165:-- ==========================================
===================================
> supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:166:-- The baseline table has: id, project_id, ad
ded_by, storage_path, external_url,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:167:-- og_title, og_description, og_image_url, ca
ption, tags, created_at, media_type,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:168:-- duration_seconds, page_count, thumbnail_pa
th, embed_provider.
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:169:--
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:170:-- Phase 3.0 adds: kind, url (alias intent vi
a new column), note, title,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:171:-- thumbnail_url, sort_order.
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:172:-- We DO NOT drop existing columns — additive
 only. Old columns (og_*, tags,
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:173:-- storage_path, embed_provider, page_count) 
remain for backward compat with
  supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:174:-- existing 1 project row's reference data.
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:6:-- Table: project_boards
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:7:-- =================================================
===========
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:8:CREATE TABLE IF NOT EXISTS project_boards (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:9:  id              uuid PRIMARY KEY DEFAULT gen_rando
m_uuid(),
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:10:  project_id      uuid NOT NULL UNIQUE REFERENCES p
rojects(id) ON DELETE CASCADE,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:11:  document        jsonb NOT NULL DEFAULT '{}'::json
b,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:12:  schema_version  int  NOT NULL DEFAULT 1,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:13:  asset_index     jsonb NOT NULL DEFAULT '[]'::json
b,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:14:  source          text NOT NULL CHECK (source IN ('
wizard_seed', 'admin_init', 'migrated')),
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:15:  is_locked       boolean NOT NULL DEFAULT false,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:16:  locked_by       uuid REFERENCES profiles(id),
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:40:-- RLS: project_boards
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:41:-- ================================================
============
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:42:ALTER TABLE project_boards ENABLE ROW LEVEL SECURIT
Y;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:43:
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON proje
ct_boards
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:45:  FOR SELECT
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:46:  USING (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:48:    OR project_id IN (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:49:      SELECT p.id FROM projects p
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:50:      WHERE p.workspace_id IN (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:51:        SELECT workspace_id FROM workspace_members 
WHERE user_id = auth.uid()
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:52:      )
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:54:  );
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:55:
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON proj
ect_boards
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:57:  FOR INSERT
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:58:  WITH CHECK (false);
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:59:
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON proje
ct_boards
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:61:  FOR UPDATE
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:62:  USING (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:64:    OR (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:65:      is_locked = false
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:66:      AND project_id IN (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:67:        SELECT p.id FROM projects p
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:68:        WHERE p.workspace_id IN (
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:138:  END IF;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:139:
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:140:  INSERT INTO project_boards (project_id, document
, source)
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:141:  VALUES (p_project_id, p_initial_document, 'wizar
d_seed')
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:142:  ON CONFLICT (project_id) DO UPDATE
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:143:    SET document   = EXCLUDED.document,
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:144:        source     = 'wizard_seed',
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:145:        updated_at = now()
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:146:  RETURNING id INTO v_board_id;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:147:
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:148:  RETURN v_board_id;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:168:  END IF;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:169:
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:170:  INSERT INTO project_boards (project_id, document
, source)
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:171:  VALUES (p_project_id, '{}'::jsonb, 'admin_init')
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:172:  ON CONFLICT (project_id) DO UPDATE
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:173:    SET updated_at = now()
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:174:  RETURNING id INTO v_board_id;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:175:
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:176:  RETURN v_board_id;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:177:END;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:178:$$;
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:212:-- One-time back-fill: every existing project gets
 a board row
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:213:-- ===============================================
=============
> supabase\migrations\20260429113853_phase_3_1_project_board.sql:214:INSERT INTO project_boards (project_id, document, 
source)
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:215:SELECT id, '{}'::jsonb, 'migrated'
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:216:FROM projects
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:217:WHERE id NOT IN (SELECT project_id FROM project_bo
ards)
  supabase\migrations\20260429113853_phase_3_1_project_board.sql:218:ON CONFLICT (project_id) DO NOTHING;
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:48:  END IF;
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:49:
> supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:50:  INSERT INTO project_boards (project_id, docume
nt, asset_index, source)
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:51:  VALUES (p_project_id, p_initial_document, COAL
ESCE(p_initial_asset_index, '[]'::jsonb), 'wizard_seed')
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:52:  ON CONFLICT (project_id) DO UPDATE
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:53:    SET document     = EXCLUDED.document,
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:54:        asset_index  = EXCLUDED.asset_index,
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:55:        source       = 'wizard_seed',
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:56:        updated_at   = now()
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:57:  RETURNING id INTO v_board_id;
  supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:58:
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:1:-- Phase 3.1 hotfix-3: attached_pdfs + attach
ed_urls columns + 4 attachment RPCs + extend seed RPC
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:2:-- Execution: additive only -- ALTER TABLE AD
D COLUMN IF NOT EXISTS with safe defaults
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:3:-- Recorded version: to be confirmed via L-02
1 after MCP apply_migration
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:4:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:5:-- ==========================================
==================
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:6:-- Schema changes: add attachment columns to 
project_boards
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:7:-- ==========================================
==================
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:8:ALTER TABLE project_boards
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:9:  ADD COLUMN IF NOT EXISTS attached_pdfs json
b NOT NULL DEFAULT '[]'::jsonb,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:10:  ADD COLUMN IF NOT EXISTS attached_urls jso
nb NOT NULL DEFAULT '[]'::jsonb;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:11:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:12:-- =========================================
===================
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:13:-- RPC: add_project_board_pdf
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:14:-- Appends a PDF attachment entry to project
_boards.attached_pdfs.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:15:-- Validates: caller ownership OR yagi_admin
, lock state, count cap (30),
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:16:-- size cap (20MB), filename length (200), s
torage_key prefix.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:17:-- SECURITY DEFINER, search_path locked to p
ublic, pg_temp.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:18:-- Does NOT update asset_index (that is serv
er action layer responsibility).
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:19:-- =========================================
===================
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:20:CREATE OR REPLACE FUNCTION add_project_board
_pdf(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:21:  p_board_id    uuid,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:22:  p_storage_key text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:23:  p_filename    text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:24:  p_size_bytes  bigint
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:25:) RETURNS uuid
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:26:LANGUAGE plpgsql
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:27:SECURITY DEFINER
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:28:SET search_path = public, pg_temp
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:43:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:44:  IF NOT FOUND THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:45:    RAISE EXCEPTION 'add_project_board_pdf: 
board not found';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:46:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:47:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:48:  -- Role check: owner OR yagi_admin
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:49:  v_is_admin := is_yagi_admin(v_caller_id);
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:50:  IF NOT v_is_admin AND NOT EXISTS (
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:51:    SELECT 1 FROM projects p
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:52:    WHERE p.id = v_project_id AND p.owner_id
 = v_caller_id
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:53:  ) THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:54:    RAISE EXCEPTION 'add_project_board_pdf: 
unauthorized';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:55:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:56:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:57:  -- Lock check: block non-admin mutations o
n locked board
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:58:  IF v_is_locked AND NOT v_is_admin THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:59:    RAISE EXCEPTION 'add_project_board_pdf: 
board is locked';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:60:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:61:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:62:  -- Count cap: max 30 PDFs
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:63:  SELECT jsonb_array_length(attached_pdfs) I
NTO v_pdf_count
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:64:  FROM project_boards WHERE id = p_board_id;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:65:  IF v_pdf_count >= 30 THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:66:    RAISE EXCEPTION 'add_project_board_pdf: 
PDF count limit reached (max 30)';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:67:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:68:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:69:  -- Size cap: max 20MB
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:70:  IF p_size_bytes > 20 * 1024 * 1024 THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:71:    RAISE EXCEPTION 'add_project_board_pdf: 
file too large (max 20MB)';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:72:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:73:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:74:  -- Filename length
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:75:  IF p_filename IS NULL OR length(p_filename
) = 0 OR length(p_filename) > 200 THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:76:    RAISE EXCEPTION 'add_project_board_pdf: 
filename must be 1-200 chars';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:77:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:78:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:79:  -- Storage key prefix validation: no path 
traversal, no absolute path, must start with known prefix
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:80:  IF p_storage_key IS NULL
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:81:    OR p_storage_key LIKE '%..%'
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:82:    OR left(p_storage_key, 1) = '/'
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:83:    OR (p_storage_key NOT LIKE 'project-wiza
rd/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: 
invalid storage_key (must start with project-wizard/ or project-board/)';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:85:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:86:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:87:  -- Append entry using jsonb_build_object (
no string concatenation)
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:88:  UPDATE project_boards
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:89:  SET
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:90:    attached_pdfs = attached_pdfs || jsonb_b
uild_array(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:91:      jsonb_build_object(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:92:        'id',          v_new_id::text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:93:        'storage_key', p_storage_key,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:94:        'filename',    p_filename,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:95:        'size_bytes',  p_size_bytes,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:96:        'uploaded_at', now()::text,
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:97:        'uploaded_by', v_caller_id::text
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:98:      )
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:99:    ),
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:100:    updated_at = now()
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:101:  WHERE id = p_board_id;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:102:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:103:  RETURN v_new_id;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:104:END;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:105:$$;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:106:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:107:-- ========================================
====================
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:108:-- RPC: add_project_board_url
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:109:-- Appends a URL attachment entry to projec
t_boards.attached_urls.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:110:-- Validates: caller ownership OR yagi_admi
n, lock state, count cap (50),
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:111:-- URL scheme (http/https only), URL length
 (2000), note length (500),
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:112:-- provider enum (youtube/vimeo/generic).
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:113:-- SECURITY DEFINER, search_path locked to 
public, pg_temp.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:114:-- ========================================
====================
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:115:CREATE OR REPLACE FUNCTION add_project_boar
d_url(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:116:  p_board_id      uuid,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:117:  p_url           text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:118:  p_title         text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:119:  p_thumbnail_url text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:120:  p_provider      text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:121:  p_note          text
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:122:) RETURNS uuid
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:123:LANGUAGE plpgsql
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:139:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:140:  IF NOT FOUND THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:141:    RAISE EXCEPTION 'add_project_board_url:
 board not found';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:142:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:143:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:144:  v_is_admin := is_yagi_admin(v_caller_id);
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:145:  IF NOT v_is_admin AND NOT EXISTS (
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:146:    SELECT 1 FROM projects p
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:147:    WHERE p.id = v_project_id AND p.owner_i
d = v_caller_id
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:148:  ) THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:149:    RAISE EXCEPTION 'add_project_board_url:
 unauthorized';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:150:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:151:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:152:  IF v_is_locked AND NOT v_is_admin THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:153:    RAISE EXCEPTION 'add_project_board_url:
 board is locked';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:154:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:155:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:156:  SELECT jsonb_array_length(attached_urls) 
INTO v_url_count
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:157:  FROM project_boards WHERE id = p_board_id
;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:158:  IF v_url_count >= 50 THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:159:    RAISE EXCEPTION 'add_project_board_url:
 URL count limit reached (max 50)';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:160:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:161:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:162:  -- URL validation: http/https only, max 2
000 chars
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:163:  -- Explicitly rejects javascript:, data:,
 file:, chrome:, etc.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:164:  IF p_url IS NULL
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:165:    OR length(p_url) > 2000
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:166:    OR (p_url NOT LIKE 'http://%' AND p_url
 NOT LIKE 'https://%') THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:167:    RAISE EXCEPTION 'add_project_board_url:
 invalid URL (must be http:// or https://, max 2000 chars)';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:168:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:169:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:170:  -- Note length
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:171:  IF p_note IS NOT NULL AND length(p_note) 
> 500 THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:172:    RAISE EXCEPTION 'add_project_board_url:
 note too long (max 500 chars)';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:173:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:174:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:175:  -- Provider enum validation
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:176:  IF p_provider IS NULL OR p_provider NOT I
N ('youtube', 'vimeo', 'generic') THEN
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:177:    RAISE EXCEPTION 'add_project_board_url:
 provider must be youtube, vimeo, or generic';
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:178:  END IF;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:179:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:180:  UPDATE project_boards
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:181:  SET
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:182:    attached_urls = attached_urls || jsonb_
build_array(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:183:      jsonb_build_object(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:184:        'id',            v_new_id::text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:185:        'url',           p_url,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:189:        'note',          p_note,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:190:        'added_at',      now()::text,
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:191:        'added_by',      v_caller_id::text
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:192:      )
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:193:    ),
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:194:    updated_at = now()
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:195:  WHERE id = p_board_id;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:196:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:197:  RETURN v_new_id;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:198:END;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:199:$$;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:201:-- ========================================
====================
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:202:-- RPC: remove_project_board_attachment
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:203:-- Removes an attachment by id from attache
d_pdfs or attached_urls.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:204:-- kind must be 'pdf' or 'url'.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:205:-- Validates: caller ownership OR yagi_admi
n, lock state.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:206:-- Normalizes null back to empty array if a
ll items removed.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:207:-- ========================================
====================
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:208:CREATE OR REPLACE FUNCTION remove_project_b
oard_attachment(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:209:  p_board_id      uuid,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:210:  p_kind          text,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:211:  p_attachment_id uuid
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:249:    UPDATE project_boards
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:250:    SET
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:251:      attached_pdfs = COALESCE(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:252:        (
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:253:          SELECT jsonb_agg(elem)
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:254:          FROM jsonb_array_elements(attache
d_pdfs) elem
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:255:          WHERE (elem->>'id') <> p_attachme
nt_id::text
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:256:        ),
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:257:        '[]'::jsonb
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:258:      ),
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:259:      updated_at = now()
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:260:    WHERE id = p_board_id;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:261:  ELSE
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:262:    UPDATE project_boards
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:344:-- ========================================
====================
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:345:-- RPC: seed_project_board_from_wizard (EXT
END signature)
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:346:-- Adds p_initial_attached_pdfs, p_initial_
attached_urls, p_initial_asset_index
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:347:-- with DEFAULT empty array for backward co
mpatibility with Phase 3.1 callers.
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:348:-- Existing logic preserved (project must b
e in_review, UPSERT on project_id).
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:349:-- ========================================
====================
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:350:CREATE OR REPLACE FUNCTION seed_project_boa
rd_from_wizard(
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:351:  p_project_id           uuid,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:352:  p_initial_document     jsonb,
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:353:  p_initial_attached_pdfs jsonb DEFAULT '[]
'::jsonb,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:354:  p_initial_attached_urls jsonb DEFAULT '[]
'::jsonb,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:355:  p_initial_asset_index   jsonb DEFAULT '[]
'::jsonb
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:356:)
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:357:RETURNS uuid
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:358:LANGUAGE plpgsql
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:359:SECURITY DEFINER
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:360:SET search_path = public, pg_temp
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:361:AS $$
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:380:    project_id,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:381:    document,
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:382:    attached_pdfs,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:383:    attached_urls,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:384:    asset_index,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:385:    source
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:386:  )
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:387:  VALUES (
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:388:    p_project_id,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:389:    p_initial_document,
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:390:    p_initial_attached_pdfs,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:391:    p_initial_attached_urls,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:392:    p_initial_asset_index,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:393:    'wizard_seed'
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:394:  )
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:395:  ON CONFLICT (project_id) DO UPDATE
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:396:    SET document      = EXCLUDED.document,
> supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:397:        attached_pdfs = EXCLUDED.attached_p
dfs,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:398:        attached_urls = EXCLUDED.attached_u
rls,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:399:        asset_index   = EXCLUDED.asset_inde
x,
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:400:        source        = 'wizard_seed',
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:401:        updated_at    = now()
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:402:  RETURNING id INTO v_board_id;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:403:
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:404:  RETURN v_board_id;
  supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:405:END;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:3:--            AND add auth gate to seed_
project_board_from_wizard 5-arg overload
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:4:-- HIGH-A #2: Restrict project_boards_up
date_client policy to exclude
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:5:--            attached_pdfs, attached_ur
ls, asset_index (attachment writes via RPC only)
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:6:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:7:-- =====================================
=======================
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:8:-- FIX HIGH-A #1a: add_project_board_pdf
 — owner_id -> created_by
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:9:-- =====================================
=======================
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION add_project_
board_pdf(
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:11:  p_board_id    uuid,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:12:  p_storage_key text,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:13:  p_filename    text,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:14:  p_size_bytes  bigint
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:15:) RETURNS uuid
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:16:LANGUAGE plpgsql
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:17:SECURITY DEFINER
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:18:SET search_path = public, pg_temp
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:27:BEGIN
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:28:  IF v_caller_id IS NULL THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'add_project_board_
pdf: unauthenticated';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:30:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:31:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:32:  SELECT pb.project_id, pb.is_locked
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:33:  INTO v_project_id, v_is_locked
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:34:  FROM project_boards pb
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:35:  WHERE pb.id = p_board_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:36:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:37:  IF NOT FOUND THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:38:    RAISE EXCEPTION 'add_project_board_
pdf: board not found';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:39:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:40:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:41:  v_is_admin := is_yagi_admin(v_caller_
id);
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:42:  IF NOT v_is_admin AND NOT EXISTS (
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:43:    SELECT 1 FROM projects p
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:44:    WHERE p.id = v_project_id AND p.cre
ated_by = v_caller_id
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:45:  ) THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:46:    RAISE EXCEPTION 'add_project_board_
pdf: unauthorized';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:47:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:48:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:49:  IF v_is_locked AND NOT v_is_admin THE
N
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:50:    RAISE EXCEPTION 'add_project_board_
pdf: board is locked';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:51:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:52:
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:53:  SELECT jsonb_array_length(attached_pd
fs) INTO v_pdf_count
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:54:  FROM project_boards WHERE id = p_boar
d_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:55:  IF v_pdf_count >= 30 THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:56:    RAISE EXCEPTION 'add_project_board_
pdf: PDF count limit reached (max 30)';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:57:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:58:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:59:  IF p_size_bytes > 20 * 1024 * 1024 TH
EN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:60:    RAISE EXCEPTION 'add_project_board_
pdf: file too large (max 20MB)';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:61:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:62:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:63:  IF p_filename IS NULL OR length(p_fil
ename) = 0 OR length(p_filename) > 200 THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:64:    RAISE EXCEPTION 'add_project_board_
pdf: filename must be 1-200 chars';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:65:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:66:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:67:  IF p_storage_key IS NULL OR p_storage
_key LIKE '%..%' OR left(p_storage_key, 1) = '/'
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:68:    OR (p_storage_key NOT LIKE 'project
-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:69:    RAISE EXCEPTION 'add_project_board_
pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:70:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:71:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:72:  UPDATE project_boards
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:73:  SET attached_pdfs = attached_pdfs || 
jsonb_build_array(jsonb_build_object(
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:74:    'id', v_new_id::text,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:75:    'storage_key', p_storage_key,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:76:    'filename', p_filename,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:77:    'size_bytes', p_size_bytes,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:78:    'uploaded_at', now()::text,
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:79:    'uploaded_by', v_caller_id::text
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:80:  )), updated_at = now()
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:81:  WHERE id = p_board_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:82:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:83:  RETURN v_new_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:84:END;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:85:$$;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:86:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:87:-- ====================================
========================
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:88:-- FIX HIGH-A #1b: add_project_board_ur
l — owner_id -> created_by
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:89:-- (jsonb fix in subsequent migration 2
0260429151910)
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:90:-- ====================================
========================
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:91:CREATE OR REPLACE FUNCTION add_project_
board_url(
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:92:  p_board_id      uuid,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:93:  p_url           text,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:94:  p_title         text,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:95:  p_thumbnail_url text,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:96:  p_provider      text,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:97:  p_note          text
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:98:) RETURNS uuid
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:99:LANGUAGE plpgsql
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:110:BEGIN
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:111:  IF v_caller_id IS NULL THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:112:    RAISE EXCEPTION 'add_project_board
_url: unauthenticated';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:113:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:114:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:115:  SELECT pb.project_id, pb.is_locked
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:116:  INTO v_project_id, v_is_locked
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:117:  FROM project_boards pb
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:118:  WHERE pb.id = p_board_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:119:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:120:  IF NOT FOUND THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:121:    RAISE EXCEPTION 'add_project_board
_url: board not found';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:122:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:123:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:124:  v_is_admin := is_yagi_admin(v_caller
_id);
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:125:  IF NOT v_is_admin AND NOT EXISTS (
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:126:    SELECT 1 FROM projects p
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:127:    WHERE p.id = v_project_id AND p.cr
eated_by = v_caller_id
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:128:  ) THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:129:    RAISE EXCEPTION 'add_project_board
_url: unauthorized';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:130:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:131:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:132:  IF v_is_locked AND NOT v_is_admin TH
EN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:133:    RAISE EXCEPTION 'add_project_board
_url: board is locked';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:134:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:135:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:136:  SELECT jsonb_array_length(attached_u
rls) INTO v_url_count
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:137:  FROM project_boards WHERE id = p_boa
rd_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:138:  IF v_url_count >= 50 THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:139:    RAISE EXCEPTION 'add_project_board
_url: URL count limit reached (max 50)';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:140:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:141:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:142:  IF p_url IS NULL OR length(p_url) = 
0 OR length(p_url) > 2000 THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:143:    RAISE EXCEPTION 'add_project_board
_url: url must be 1-2000 chars';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:144:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:145:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:146:  IF p_url NOT LIKE 'http://%' AND p_u
rl NOT LIKE 'https://%' THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:147:    RAISE EXCEPTION 'add_project_board
_url: only http/https URLs allowed';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:148:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:149:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:150:  IF p_note IS NOT NULL AND length(p_n
ote) > 500 THEN
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:151:    RAISE EXCEPTION 'add_project_board
_url: note too long (max 500 chars)';
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:152:  END IF;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:153:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:154:  UPDATE project_boards
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:155:  SET attached_urls = attached_urls ||
 jsonb_build_array(jsonb_build_object(
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:156:    'id',            v_new_id::text,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:157:    'url',           p_url,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:158:    'title',         to_jsonb(p_title)
,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:159:    'thumbnail_url', to_jsonb(p_thumbn
ail_url),
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:161:    'note',          to_jsonb(p_note),
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:162:    'added_at',      now()::text,
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:163:    'added_by',      v_caller_id::text
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:164:  )), updated_at = now()
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:165:  WHERE id = p_board_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:166:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:167:  RETURN v_new_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:168:END;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:169:$$;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:170:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:171:-- ===================================
=========================
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:214:  IF p_kind = 'pdf' THEN
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:215:    UPDATE project_boards
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:216:    SET attached_pdfs = (
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:217:      SELECT COALESCE(jsonb_agg(elem),
 '[]'::jsonb)
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:218:      FROM jsonb_array_elements(attach
ed_pdfs) elem
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:219:      WHERE (elem->>'id') != p_attachm
ent_id::text
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:220:    ), updated_at = now()
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:221:    WHERE id = p_board_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:222:  ELSIF p_kind = 'url' THEN
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:223:    UPDATE project_boards
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:224:    SET attached_urls = (
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:225:      SELECT COALESCE(jsonb_agg(elem),
 '[]'::jsonb)
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:226:      FROM jsonb_array_elements(attach
ed_urls) elem
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:306:  p_project_id            uuid,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:307:  p_initial_document      jsonb,
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:308:  p_initial_attached_pdfs jsonb DEFAUL
T '[]'::jsonb,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:309:  p_initial_attached_urls jsonb DEFAUL
T '[]'::jsonb,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:310:  p_initial_asset_index   jsonb DEFAUL
T '[]'::jsonb
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:311:)
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:312:RETURNS uuid
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:313:LANGUAGE plpgsql
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:314:SECURITY DEFINER
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:315:SET search_path = public, pg_temp
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:316:AS $$
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:341:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:342:  INSERT INTO project_boards (
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:343:    project_id, document, attached_pdf
s, attached_urls, asset_index, source
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:344:  )
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:345:  VALUES (
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:346:    p_project_id, p_initial_document, 
p_initial_attached_pdfs,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:347:    p_initial_attached_urls, p_initial
_asset_index, 'wizard_seed'
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:348:  )
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:349:  ON CONFLICT (project_id) DO UPDATE
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:350:    SET document      = EXCLUDED.docum
ent,
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:351:        attached_pdfs = EXCLUDED.attac
hed_pdfs,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:352:        attached_urls = EXCLUDED.attac
hed_urls,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:353:        asset_index   = EXCLUDED.asset
_index,
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:354:        source        = 'wizard_seed',
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:355:        updated_at    = now()
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:356:  RETURNING id INTO v_board_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:357:
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:358:  RETURN v_board_id;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:359:END;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:366:DROP POLICY IF EXISTS project_boards_u
pdate_client ON project_boards;
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:367:
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_cl
ient ON project_boards
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:369:  FOR UPDATE
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:370:  USING (
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:371:    is_yagi_admin(auth.uid())
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:372:    OR (
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:373:      is_locked = false
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:374:      AND project_id IN (
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:375:        SELECT p.id FROM projects p
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:376:        WHERE p.workspace_id IN (
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:397:  );
  supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:398:
> supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached
_urls, asset_index) ON project_boards FROM authenticated;
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:1:-- Phase 3.1 hotfix-3 K-05 Loop 
1 fix — add_project_board_url jsonb correction
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:2:-- Use to_jsonb() for nullable t
ext fields (title, thumbnail_url, note)
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:3:-- COALESCE with ::jsonb cast wa
s broken for non-null string values.
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:4:CREATE OR REPLACE FUNCTION add_p
roject_board_url(
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:5:  p_board_id      uuid,
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:6:  p_url           text,
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:7:  p_title         text,
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:8:  p_thumbnail_url text,
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:9:  p_provider      text,
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:10:  p_note          text
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:11:) RETURNS uuid
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:12:LANGUAGE plpgsql
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:23:BEGIN
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:24:  IF v_caller_id IS NULL THEN
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:25:    RAISE EXCEPTION 'add_projec
t_board_url: unauthenticated';
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:26:  END IF;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:27:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:28:  SELECT pb.project_id, pb.is_l
ocked
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:29:  INTO v_project_id, v_is_locke
d
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:30:  FROM project_boards pb
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:31:  WHERE pb.id = p_board_id;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:32:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:33:  IF NOT FOUND THEN
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:34:    RAISE EXCEPTION 'add_projec
t_board_url: board not found';
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:35:  END IF;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:36:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:37:  v_is_admin := is_yagi_admin(v
_caller_id);
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:38:  IF NOT v_is_admin AND NOT EXI
STS (
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:39:    SELECT 1 FROM projects p
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:40:    WHERE p.id = v_project_id A
ND p.created_by = v_caller_id
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:41:  ) THEN
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:42:    RAISE EXCEPTION 'add_projec
t_board_url: unauthorized';
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:43:  END IF;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:44:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:45:  IF v_is_locked AND NOT v_is_a
dmin THEN
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:46:    RAISE EXCEPTION 'add_projec
t_board_url: board is locked';
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:47:  END IF;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:48:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:49:  SELECT jsonb_array_length(att
ached_urls) INTO v_url_count
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:50:  FROM project_boards WHERE id 
= p_board_id;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:51:  IF v_url_count >= 50 THEN
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:52:    RAISE EXCEPTION 'add_projec
t_board_url: URL count limit reached (max 50)';
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:53:  END IF;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:54:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:55:  IF p_url IS NULL OR length(p_
url) = 0 OR length(p_url) > 2000 THEN
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:56:    RAISE EXCEPTION 'add_projec
t_board_url: url must be 1-2000 chars';
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:57:  END IF;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:58:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:59:  IF p_url NOT LIKE 'http://%' 
AND p_url NOT LIKE 'https://%' THEN
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:60:    RAISE EXCEPTION 'add_projec
t_board_url: only http/https URLs allowed';
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:61:  END IF;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:62:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:63:  IF p_note IS NOT NULL AND len
gth(p_note) > 500 THEN
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:64:    RAISE EXCEPTION 'add_projec
t_board_url: note too long (max 500 chars)';
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:65:  END IF;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:66:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:67:  UPDATE project_boards
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:68:  SET attached_urls = attached_
urls || jsonb_build_array(jsonb_build_object(
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:69:    'id',            v_new_id::
text,
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:70:    'url',           p_url,
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:71:    'title',         to_jsonb(p
_title),
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:72:    'thumbnail_url', to_jsonb(p
_thumbnail_url),
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:74:    'note',          to_jsonb(p
_note),
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:75:    'added_at',      now()::tex
t,
> supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:76:    'added_by',      v_caller_i
d::text
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:77:  )), updated_at = now()
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:78:  WHERE id = p_board_id;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:79:
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:80:  RETURN v_new_id;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:81:END;
  supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:82:$$;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:1:-- Wave C.5d sub_03f_1
 + sub_03f_5 F2 — allow `board-assets/` prefix on
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:2:-- add_project_board_p
df with caller-bound prefix checks.
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:3:--
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:4:-- Background: getBoar
dAssetPutUrlAction (Phase 3.0) generates a
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:5:-- server-side R2 uplo
ad key shaped like `board-assets/<user>/<uuid>.<ext>`
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:6:-- and presigns a PUT 
URL against that key. The earlier
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:7:-- add_project_board_p
df RPC validation only accepted `project-wizard/%`
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:8:-- and `project-board/
%` prefixes, which forced the wizard client to
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:9:-- prepend a literal "
project-wizard" segment in front of the real key
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:10:-- before persisting 
it through the RPC. The persisted key
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:11:-- (`project-wizard/b
oard-assets/<user>/<uuid>.<ext>`) did not exist in
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:12:-- R2 and broke PDF r
etrieval from both the project board and the admin
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:13:-- asset-list panel.
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:14:--
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:15:-- This migration:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:26:--
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:27:-- Production audit a
t sub_03f_1 apply time: 0 broken-prefix entries
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:28:-- persisted in attac
hed_pdfs, so no backfill is required.
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:29:
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:30:CREATE OR REPLACE FUN
CTION add_project_board_pdf(
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:31:  p_board_id    uuid,
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:32:  p_storage_key text,
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:33:  p_filename    text,
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:34:  p_size_bytes  bigin
t
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:35:) RETURNS uuid
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:36:LANGUAGE plpgsql
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:37:SECURITY DEFINER
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:38:SET search_path = pub
lic, pg_temp
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:47:BEGIN
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:48:  IF v_caller_id IS N
ULL THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:49:    RAISE EXCEPTION '
add_project_board_pdf: unauthenticated';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:50:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:51:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:52:  SELECT pb.project_i
d, pb.is_locked
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:53:  INTO v_project_id, 
v_is_locked
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:54:  FROM project_boards
 pb
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:55:  WHERE pb.id = p_boa
rd_id;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:56:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:57:  IF NOT FOUND THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:58:    RAISE EXCEPTION '
add_project_board_pdf: board not found';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:59:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:60:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:  v_is_admin := is_ya
gi_admin(v_caller_id);
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:62:  IF NOT v_is_admin A
ND NOT EXISTS (
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:63:    SELECT 1 FROM pro
jects p
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:64:    WHERE p.id = v_pr
oject_id AND p.created_by = v_caller_id
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:65:  ) THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:66:    RAISE EXCEPTION '
add_project_board_pdf: unauthorized';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:67:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:68:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:69:  IF v_is_locked AND 
NOT v_is_admin THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:70:    RAISE EXCEPTION '
add_project_board_pdf: board is locked';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:71:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:72:
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:73:  SELECT jsonb_array_
length(attached_pdfs) INTO v_pdf_count
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:74:  FROM project_boards
 WHERE id = p_board_id;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:75:  IF v_pdf_count >= 3
0 THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:76:    RAISE EXCEPTION '
add_project_board_pdf: PDF count limit reached (max 30)';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:77:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:78:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:79:  IF p_size_bytes > 2
0 * 1024 * 1024 THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:80:    RAISE EXCEPTION '
add_project_board_pdf: file too large (max 20MB)';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:81:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:82:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:83:  IF p_filename IS NU
LL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:84:    RAISE EXCEPTION '
add_project_board_pdf: filename must be 1-200 chars';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:85:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:86:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:87:  IF p_storage_key IS
 NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:88:    RAISE EXCEPTION '
add_project_board_pdf: invalid storage_key (null/traversal/leading slash)';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:89:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:90:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:91:  -- sub_03f_5 F2: ev
ery accepted prefix is caller-bound. The role-bound
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:92:  -- prefixes use aut
h.uid() to prevent persisting another authenticated
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:93:  -- user's R2 key; t
he project-board prefix is bound to p_board_id so it
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:94:  -- cannot be cross-
board persisted. Anything else is rejected.
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:95:  IF NOT (
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:96:    p_storage_key LIK
E 'board-assets/' || v_caller_id::text || '/%'
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:98:    OR p_storage_key 
LIKE 'project-board/' || p_board_id::text || '/%'
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:99:  ) THEN
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:100:    RAISE EXCEPTION 
'add_project_board_pdf: storage_key prefix must be caller-bound (board-assets/<caller>/, project-wizard/<caller>/, or p
roject-board/<p_board_id>/)';
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:101:  END IF;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:102:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:103:  UPDATE project_boa
rds
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:104:  SET attached_pdfs 
= attached_pdfs || jsonb_build_array(jsonb_build_object(
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:105:    'id', v_new_id::
text,
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:106:    'storage_key', p
_storage_key,
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:107:    'filename', p_fi
lename,
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:108:    'size_bytes', p_
size_bytes,
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:109:    'uploaded_at', n
ow()::text,
> supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:110:    'uploaded_by', v
_caller_id::text
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:111:  )), updated_at = n
ow()
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:112:  WHERE id = p_board
_id;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:113:
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:114:  RETURN v_new_id;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:115:END;
  supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:116:$$;
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:2:--
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:3:-- Phase 3.1 hotfix-3 (migra
tion 20260429151821) tried to seal the three
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:4:-- server-managed columns on
 project_boards (attached_pdfs, attached_urls,
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-
level REVOKE UPDATE. That is a no-op while the
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:6:-- role still holds table-le
vel UPDATE: Postgres column privileges
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:7:-- evaluate as max(table-gra
nt, column-grant). The default Supabase
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:8:-- bootstrap grants table-le
vel UPDATE to `authenticated` on every public
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:9:-- table, so PostgREST clien
ts have been able to UPDATE attached_pdfs /
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:10:-- attached_urls / asset_in
dex directly, bypassing
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:11:-- add_project_board_pdf / 
add_project_board_url RPC validation
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:12:-- (count cap, URL scheme a
llowlist, lock state) and the asset_index
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:13:-- trust boundary (server-r
ecomputed from document + attached_*).
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:14:--
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:15:-- Codex generic K-05 revie
w (Phase 4.x branch, 2026-05-03) flagged this
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:16:-- as P1.
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:17:--
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:18:-- Lockdown:
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON pr
oject_boards FROM authenticated  (table-level)
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:24:-- tldraw store snapshot) a
nd `updated_at` (timestamp the user can
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:25:-- trigger via document edi
ts). All other columns flow through:
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:26:--   - add_project_board_pd
f       (SECURITY DEFINER RPC)
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:27:--   - add_project_board_ur
l       (SECURITY DEFINER RPC)
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:28:--   - toggle_project_board
_lock   (SECURITY DEFINER RPC)
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:29:--   - service-role client 
inside board-actions.ts (asset_index updates
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:30:--     in saveBoardDocument
Action, restoreVersionAction, and the
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:31:--     recomputeAndUpdateAs
setIndex helper)
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:32:--
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:33:-- The companion source-cod
e refactor in
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:34:-- src/app/[locale]/app/pro
jects/[id]/board-actions.ts is shipped in the
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:35:-- same Wave C.5d sub_03f_2
 commit so the autosave / restore / repair
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:65:
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:66:  -- Effective column-level
 UPDATE must be denied on every server-managed
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:67:  -- column. asset_index, a
ttached_pdfs, attached_urls, is_locked,
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:68:  -- locked_by, locked_at, 
schema_version, source, project_id, id flow
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:69:  -- through SECURITY DEFIN
ER RPCs or the service-role client.
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:70:  IF has_column_privilege('
authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:71:    RAISE EXCEPTION 'sub_03
f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:72:  END IF;
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:73:  IF has_column_privilege('
authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:74:    RAISE EXCEPTION 'sub_03
f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:75:  END IF;
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:76:  IF has_column_privilege('
authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:77:    RAISE EXCEPTION 'sub_03
f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:78:  END IF;
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:79:  IF has_column_privilege('
authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:80:    RAISE EXCEPTION 'sub_03
f_2 assert failed: authenticated still has effective UPDATE on project_boards.is_locked';
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:81:  END IF;
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:82:  IF has_column_privilege('
authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:95:    RAISE EXCEPTION 'sub_03
f_2 assert failed: authenticated still has effective UPDATE on project_boards.id';
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:96:  END IF;
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:97:  IF has_column_privilege('
authenticated', 'public.project_boards', 'project_id', 'UPDATE') THEN
> supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:98:    RAISE EXCEPTION 'sub_03
f_2 assert failed: authenticated still has effective UPDATE on project_boards.project_id';
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:99:  END IF;
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:100:  IF has_column_privilege(
'authenticated', 'public.project_boards', 'schema_version', 'UPDATE') THEN
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:101:    RAISE EXCEPTION 'sub_0
3f_2 assert failed: authenticated still has effective UPDATE on project_boards.schema_version';
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:102:  END IF;
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:103:  IF has_column_privilege(
'authenticated', 'public.project_boards', 'source', 'UPDATE') THEN
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:104:    RAISE EXCEPTION 'sub_0
3f_2 assert failed: authenticated still has effective UPDATE on project_boards.source';
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:105:  END IF;
  supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:106:  -- sub_03f_5 LOOP 3 F5 f
inal closure: created_at is also server-managed
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:4:-- function from m
igration 20260429151821 is `SECURITY DEFINER` and is
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:5:-- granted to `aut
henticated`. It writes the three server-managed
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:6:-- columns on proj
ect_boards (attached_pdfs, attached_urls, asset_index)
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:7:-- using values su
pplied by the caller. The Wave C.5d sub_03f_2
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:8:-- table-level UPD
ATE revoke does NOT cover SECURITY DEFINER paths, so
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:9:-- a malicious cli
ent could invoke this RPC directly (bypassing
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:10:-- submitProjectA
ction's server-side asset_index recomputation and
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:11:-- caller-bound s
torage_key checks) and persist arbitrary R2 keys.
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:12:--
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:13:-- This migration
 replaces the function with a hardened version that:
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:14:--
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:15:--   1. Validates
 every storage_key in `p_initial_attached_pdfs` is
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:16:--      caller-bo
und. The accepted prefixes match
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:17:--      `add_proj
ect_board_pdf` (sub_03f_5 F2):
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:18:--        - `boar
d-assets/<auth.uid()>/...`
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:19:--        - `proj
ect-wizard/<auth.uid()>/...`
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:20:--        - `proj
ect-board/<v_board_id>/...` (board belongs to project)
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:21:--      Anything 
else is rejected.
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:22:--
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:23:--   2. Validates
 every URL in `p_initial_attached_urls` is http or
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:24:--      https onl
y. (Defense in depth — add_project_board_url already
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:25:--      enforces 
this, but the seed path predates that gate.)
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:26:--
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:27:--   3. Server-re
computes `asset_index` from the validated
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:28:--      attached_
pdfs + attached_urls arrays. The `p_initial_asset_index`
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:29:--      parameter
 is retained for caller backwards compatibility but
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:30:--      its value
 is IGNORED. Canvas-derived entries are not built here
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:31:--      (parsing 
tldraw store snapshots in plpgsql is not supported);
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:32:--      the first
 saveBoardDocumentAction call after seed will rebuild
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:33:--      asset_ind
ex including canvas entries via the user-action's
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:34:--      TypeScrip
t extractAssetIndex helper. Empty/near-empty documents
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:35:--      at wizard
 submit are the common case, so the gap is bounded.
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:36:--
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:48:
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:49:-- Helper functio
n — caller-bound storage_key check used by the seed
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:50:-- function for e
very entry in p_initial_attached_pdfs. Mirrored on
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:51:-- add_project_bo
ard_pdf inside migration 20260504004349 so the two
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:52:-- write paths st
ay in sync.
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:53:CREATE OR REPLACE
 FUNCTION assert_caller_bound_pdf_storage_key(
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:54:  p_storage_key t
ext,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:55:  p_caller_id   u
uid,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:56:  p_board_id    u
uid
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:57:) RETURNS void
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:58:LANGUAGE plpgsql
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:59:IMMUTABLE
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:77:  p_project_id   
         uuid,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:78:  p_initial_docum
ent      jsonb,
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:79:  p_initial_attac
hed_pdfs jsonb DEFAULT '[]'::jsonb,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:80:  p_initial_attac
hed_urls jsonb DEFAULT '[]'::jsonb,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:81:  p_initial_asset
_index   jsonb DEFAULT '[]'::jsonb  -- ignored; kept for backwards compat
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:82:)
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:83:RETURNS uuid
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:84:LANGUAGE plpgsql
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:85:SECURITY DEFINER
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:86:SET search_path =
 public, pg_temp
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:87:AS $$
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:123:  -- accept any 
client-supplied attachments.
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:124:  SELECT id INTO
 v_existing_board_id
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:125:  FROM project_b
oards WHERE project_id = p_project_id;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:126:  v_board_id := 
COALESCE(v_existing_board_id, gen_random_uuid());
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:127:
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:128:  -- ---------- 
LOOP 2 F3b: reject non-array attachment payloads ----------
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:129:  -- The origina
l validation skipped non-array values, but the upsert
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:130:  -- below still
 wrote `COALESCE(p_initial_attached_pdfs, '[]'::jsonb)`
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:131:  -- which would
 have persisted a malformed scalar/object as-is.
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:132:  -- Reject earl
y so the upsert only ever sees a NULL or a real array.
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:133:  IF p_initial_a
ttached_pdfs IS NOT NULL
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:134:     AND jsonb_t
ypeof(p_initial_attached_pdfs) != 'array' THEN
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:135:    RAISE EXCEPT
ION
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:136:      'seed_proj
ect_board_from_wizard: p_initial_attached_pdfs must be a jsonb array or null (got %)',
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:137:      jsonb_type
of(p_initial_attached_pdfs);
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:138:  END IF;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:139:  IF p_initial_a
ttached_urls IS NOT NULL
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:140:     AND jsonb_t
ypeof(p_initial_attached_urls) != 'array' THEN
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:141:    RAISE EXCEPT
ION
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:142:      'seed_proj
ect_board_from_wizard: p_initial_attached_urls must be a jsonb array or null (got %)',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:143:      jsonb_type
of(p_initial_attached_urls);
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:144:  END IF;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:145:
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:146:  -- ---------- 
Validate attached_pdfs ----------
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:147:  IF p_initial_a
ttached_pdfs IS NOT NULL THEN
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:148:    FOR v_pdf IN
 SELECT * FROM jsonb_array_elements(p_initial_attached_pdfs)
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:149:    LOOP
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:150:      PERFORM as
sert_caller_bound_pdf_storage_key(
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:151:        v_pdf->>
'storage_key',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:152:        v_caller
_id,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:153:        v_board_
id
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:154:      );
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:155:    END LOOP;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:156:  END IF;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:176:  -- the documen
t via the TypeScript extractAssetIndex helper.
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:177:  -- p_initial_a
sset_index is intentionally ignored.
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:178:  IF p_initial_a
ttached_pdfs IS NOT NULL THEN
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:179:    SELECT COALE
SCE(jsonb_agg(
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:180:      jsonb_buil
d_object(
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:181:        'id',   
        pdf->>'id',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:182:        'source'
,       'attached_pdf',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:183:        'kind', 
        'pdf',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:184:        'url',  
        pdf->>'storage_key',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:185:        'title',
        pdf->>'filename',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:186:        'thumbna
il_url', NULL,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:193:    ), '[]'::jso
nb)
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:194:    INTO v_pdf_e
ntries
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:195:    FROM jsonb_a
rray_elements(p_initial_attached_pdfs) AS pdf;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:196:  END IF;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:197:
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:198:  IF p_initial_a
ttached_urls IS NOT NULL THEN
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:199:    SELECT COALE
SCE(jsonb_agg(
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:200:      jsonb_buil
d_object(
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:201:        'id',   
        u->>'id',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:202:        'source'
,       'attached_url',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:203:        'kind', 
        'url',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:219:  -- ---------- 
Upsert ----------
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:220:  INSERT INTO pr
oject_boards (
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:221:    id, project_
id, document, attached_pdfs, attached_urls, asset_index, source
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:222:  )
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:223:  VALUES (
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:224:    v_board_id,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:225:    p_project_id
,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:226:    p_initial_do
cument,
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:227:    COALESCE(p_i
nitial_attached_pdfs, '[]'::jsonb),
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:228:    COALESCE(p_i
nitial_attached_urls, '[]'::jsonb),
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:229:    v_asset_inde
x,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:230:    'wizard_seed
'
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:231:  )
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:232:  ON CONFLICT (p
roject_id) DO UPDATE
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:233:    SET document
      = EXCLUDED.document,
> supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:234:        attached
_pdfs = EXCLUDED.attached_pdfs,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:235:        attached
_urls = EXCLUDED.attached_urls,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:236:        asset_in
dex   = EXCLUDED.asset_index,
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:237:        source  
      = 'wizard_seed',
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:238:        updated_
at    = now()
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:239:  RETURNING id I
NTO v_board_id;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:240:
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:241:  RETURN v_board
_id;
  supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:242:END;
> supabase\migrations\20260504052541_phase_5_briefing_documents.sql:1:-- Phase 5 Wave A task_01 — briefing_documents ta
ble for the new Briefing Canvas paradigm (replaces the projects.attached_pdfs/urls jsonb pattern). Schema + 4 RLS polic
ies. Data migration from the legacy jsonb columns lands in task_02.
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:2:
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:3:-- briefing_documents — Phase 5 신규 테이블
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:4:-- 분리: 기획서 (의뢰자가 직접 만든 자료) vs 레퍼런스 (외부 참고 자료)
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:5:CREATE TABLE briefing_documents (
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:6:  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:7:  project_id uuid NOT NULL REFERENCES projects(id
) ON DELETE CASCADE,
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:8:  -- 분류: 기획서 vs 레퍼런스
  supabase\migrations\20260504052541_phase_5_briefing_documents.sql:9:  kind text NOT NULL CHECK (kind IN ('brief', 're
ference')),
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:1:-- ==========================
===================================================
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:2:-- Phase 5 Wave A task_02 — D
ata migration: attached_pdfs/urls jsonb → briefing_documents
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:3:-- ==========================
===================================================
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:4:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:5:-- PURPOSE:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:6:--   Back-fill the new briefi
ng_documents table (created in task_01:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:7:--   20260504052541_phase_5_b
riefing_documents.sql) from the legacy
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:8:--   attached_pdfs / attached
_urls jsonb arrays on project_boards.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:9:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:10:-- DEPENDENCY:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:11:--   MUST apply AFTER 202605
04052541_phase_5_briefing_documents.sql.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:12:--   The briefing_documents 
table must exist before this migration runs.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:13:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:14:-- ONE-RUN-ONLY / IDEMPOTENC
Y:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:15:--   The two INSERT … SELECT
 statements are NOT inherently idempotent —
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:16:--   re-running would create
 duplicate rows in briefing_documents.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:28:-- SPEC NOTE — source table 
correction:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:29:--   The KICKOFF.md spec (li
nes 444–479) reads `FROM projects p,
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:30:--   jsonb_array_elements(p.
attached_pdfs) AS item` and uses `p.created_by`
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:31:--   as a fallback. However,
 the attached_pdfs / attached_urls columns do NOT
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:32:--   exist on the projects t
able — they were added to project_boards in
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:33:--   Phase 3.1 hotfix-3 (202
60429144523). Therefore this migration sources
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:34:--   data from project_board
s (with a JOIN to projects for the created_by
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:35:--   fallback). All other co
lumn mappings follow the KICKOFF spec exactly.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:36:--   This correction is docu
mented in _wave_a_task_02_result.md.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:37:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:38:-- COLUMNS NOT DROPPED:
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:39:--   project_boards.attached
_pdfs and project_boards.attached_urls are NOT
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:40:--   dropped by this migrati
on — per KICKOFF §제약 line 1031 (data preservation;
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:41:--   cleanup deferred to Wav
e D ff-merge hotfix or Phase 5.1).
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:42:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:43:-- =========================
====================================================
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:44:-- PRE-APPLY VERIFICATION (B
uilder runs manually before apply):
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:45:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:46:--   -- Count total PDF elem
ents across all project_boards
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:47:--   SELECT
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:48:--     COUNT(*) AS board_cou
nt,
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:49:--     SUM(jsonb_array_lengt
h(attached_pdfs)) AS total_pdf_elements,
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:50:--     SUM(jsonb_array_lengt
h(attached_urls)) AS total_url_elements
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:51:--   FROM project_boards
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:52:--   WHERE (attached_pdfs IS
 NOT NULL AND jsonb_array_length(attached_pdfs) > 0)
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:53:--      OR (attached_urls IS
 NOT NULL AND jsonb_array_length(attached_urls) > 0);
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:54:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:55:--   -- Confirm briefing_doc
uments is empty before migration
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:56:--   SELECT COUNT(*) FROM br
iefing_documents;
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:57:--   -- Expected: 0
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:58:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:59:-- =========================
====================================================
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:60:-- POST-APPLY VERIFICATION (
Builder runs manually after apply):
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:101:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:102:  -- ----------------------
---------------------------------------------------
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:103:  -- INSERT 1: PDF uploads 
from project_boards.attached_pdfs
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:104:  --
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:105:  -- jsonb element shape (s
et by add_project_board_pdf RPC):
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:106:  --   { "id": "<uuid>", "s
torage_key": "<text>", "filename": "<text>",
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:107:  --     "size_bytes": <big
int>, "uploaded_at": "<timestamptz>",
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:108:  --     "uploaded_by": "<u
uid>" }
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:109:  --
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:110:  -- Assumption: storage_ke
y and filename are always non-null in well-formed
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:111:  -- entries (the RPC valid
ates them). Rows where either is NULL are skipped by
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:112:  -- the briefing_documents
_source_check constraint and will raise on INSERT.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:113:  -- Builder should verify 
COUNT(*) matches pre-apply total_pdf_elements after
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:114:  -- apply.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:115:  --
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:116:  -- Assumption: mime_type 
is not stored in the jsonb element by the existing
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:117:  -- RPC (add_project_board
_pdf does not persist mime_type in the jsonb blob).
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:118:  -- COALESCE falls back to
 'application/pdf' as specified in KICKOFF line 454.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:119:  --
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:120:  -- Assumption: uploaded_a
t (not uploaded_at) is the timestamp field name —
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:121:  -- confirmed from RPC sou
rce in 20260429144523. KICKOFF uses 'uploaded_at'
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:122:  -- which matches the actu
al jsonb key.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:123:  --
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:124:  -- Fallback for created_b
y: jsonb element uploaded_by → projects.created_by.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:125:  -- project_boards does no
t have a created_by column; the join to projects
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:126:  -- provides the fallback 
owner (the project creator). This matches the spirit
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:127:  -- of the KICKOFF spec wh
ich used p.created_by from a (corrected) projects
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:128:  -- join.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:129:  -- ----------------------
---------------------------------------------------
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:130:  INSERT INTO briefing_docu
ments (
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:131:    project_id, kind, sourc
e_type,
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:132:    storage_key, filename, 
size_bytes, mime_type,
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:142:    COALESCE(item->>'mime_t
ype', 'application/pdf'),
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:143:    COALESCE((item->>'uploa
ded_at')::timestamptz, p.created_at),
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:144:    COALESCE((item->>'uploa
ded_by')::uuid, p.created_by)
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:145:  FROM projects p
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:146:  JOIN project_boards pb ON
 pb.project_id = p.id,
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:147:  jsonb_array_elements(pb.a
ttached_pdfs) AS item
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:148:  WHERE pb.attached_pdfs IS
 NOT NULL
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:149:    AND jsonb_array_length(
pb.attached_pdfs) > 0;
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:150:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:151:  -- ----------------------
---------------------------------------------------
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:152:  -- INSERT 2: URL referenc
es from project_boards.attached_urls
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:153:  --
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:154:  -- jsonb element shape (s
et by add_project_board_url RPC, hotfix-3 version):
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:155:  --   { "id": "<uuid>", "u
rl": "<text>", "title": <text|null>,
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:156:  --     "thumbnail_url": <
text|null>, "provider": "<text>",
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:157:  --     "note": <text|null
>, "added_at": "<timestamptz>",
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:158:  --     "added_by": "<uuid
>" }
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:159:  --
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:160:  -- Assumption: 'added_at'
 / 'added_by' are the timestamp/user fields —
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:161:  -- confirmed from RPC sou
rce. KICKOFF spec uses these exact keys.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:162:  --
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:163:  -- Assumption: provider i
s always non-null in well-formed entries
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:164:  -- (RPC validates it as '
youtube'/'vimeo'/'generic'). COALESCE to 'generic'
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:165:  -- matches KICKOFF line 4
71 as a safety net for legacy Phase 3.0 rows that
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:166:  -- may have been seeded b
efore the provider validation was added.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:167:  --
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:168:  -- Note: 'title' is store
d in the jsonb element but briefing_documents has
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:170:  -- This is documented in 
_wave_a_task_02_result.md.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:171:  --
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:172:  -- Fallback for created_b
y: same pattern as INSERT 1 — jsonb added_by →
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:173:  -- projects.created_by.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:174:  -- ----------------------
---------------------------------------------------
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:175:  INSERT INTO briefing_docu
ments (
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:176:    project_id, kind, sourc
e_type,
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:177:    url, provider, thumbnai
l_url, note,
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:178:    created_at, created_by
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:179:  )
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:180:  SELECT
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:187:    (item->>'note'),
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:188:    COALESCE((item->>'added
_at')::timestamptz, p.created_at),
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:189:    COALESCE((item->>'added
_by')::uuid, p.created_by)
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:190:  FROM projects p
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:191:  JOIN project_boards pb ON
 pb.project_id = p.id,
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:192:  jsonb_array_elements(pb.a
ttached_urls) AS item
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:193:  WHERE pb.attached_urls IS
 NOT NULL
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:194:    AND jsonb_array_length(
pb.attached_urls) > 0;
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:195:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:196:END $$;
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:197:
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:198:-- ========================
=====================================================
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:199:-- K-05 NOTES (for Codex ad
versarial review):
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:200:--
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:201:-- 1. NULL safety: storage_
key / filename NULLs in attached_pdfs elements will
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:202:--    cause INSERT to fail 
at the briefing_documents_source_check constraint
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:203:--    (source_type='upload'
 requires both non-null). Malformed elements from
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:204:--    pre-RPC direct DB wri
tes (if any) would abort the DO block. Builder
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:205:--    should run the pre-ap
ply NULL-check query above before apply.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:206:--
> supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:207:-- 2. created_by FK validit
y: jsonb uploaded_by / added_by values are stored
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:208:--    as text-encoded UUIDs
. COALESCE(...)::uuid cast will fail on malformed
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:209:--    values. The outer fal
lback to p.created_by (a FK-validated column on
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:210:--    projects) reduces but
 does not eliminate risk for the primary cast. If
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:211:--    the cast fails the en
tire DO block rolls back (it runs in a single
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:212:--    implicit transaction)
. No partial insert risk.
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:213:--
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:214:-- 3. Idempotency: guarded 
by the EXISTS check at block entry. Partial-run
  supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:215:--    risk exists if the Po
stgres session is interrupted mid-block (between



 succeeded in 1623ms:
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:1:-- Phase 4.x -- task_01 -- workspace.kind + projects.twin_intent + projects.kind enum + project_licenses
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:17:-- 2. projects.twin_intent
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:20:  ADD COLUMN twin_intent text NOT NULL DEFAULT 'undecided'
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:21:    CHECK (twin_intent IN ('undecided', 'specific_in_mind', 'no_twin'));
src\app\[locale]\app\dashboard\page.tsx:41:  twin_intent: string | null;
src\app\[locale]\app\dashboard\page.tsx:114:      "id, title, brief, status, budget_band, twin_intent, created_at"
src\app\[locale]\app\dashboard\page.tsx:148:    undecided: t("twin_intent.undecided"),
src\app\[locale]\app\dashboard\page.tsx:149:    specific_in_mind: t("twin_intent.specific_in_mind"),
src\app\[locale]\app\dashboard\page.tsx:150:    no_twin: t("twin_intent.no_twin"),
src\app\[locale]\app\dashboard\page.tsx:221:                p.twin_intent,
src\app\[locale]\app\projects\new\actions.ts:831:  // value, validated here and again by the projects.twin_intent CHECK constraint
src\app\[locale]\app\projects\new\actions.ts:833:  twin_intent: z
src\app\[locale]\app\projects\new\actions.ts:839:  // twin_intent. Both fields coexist on the same row (defense-in-depth).
src\app\[locale]\app\projects\new\actions.ts:840:  interested_in_twin: z.boolean().default(false),
src\app\[locale]\app\projects\new\actions.ts:944:      // then prod DB has no twin_intent column and this field is ignored.
src\app\[locale]\app\projects\new\actions.ts:945:      twin_intent: data.twin_intent,
src\app\[locale]\app\projects\new\actions.ts:947:      // Coexists with twin_intent (defense-in-depth). Wave B wizard sets this.
src\app\[locale]\app\projects\new\actions.ts:948:      interested_in_twin: data.interested_in_twin,
src\app\[locale]\app\projects\new\new-project-wizard.tsx:118:  // projects.twin_intent CHECK constraint added by task_01 migration.
src\app\[locale]\app\projects\new\new-project-wizard.tsx:121:  twin_intent: z.enum(["undecided", "specific_in_mind", "no_twin"]),
src\app\[locale]\app\projects\new\new-project-wizard.tsx:321:      twin_intent: "undecided",
src\app\[locale]\app\projects\new\new-project-wizard.tsx:725:            Maps 1:1 to projects.twin_intent enum (undecided / specific_in_mind / no_twin). */}
src\app\[locale]\app\projects\new\new-project-wizard.tsx:728:            <Label>{t("wizard.step3.twin_intent.label")}</Label>
src\app\[locale]\app\projects\new\new-project-wizard.tsx:734:                    aria-label={t("wizard.step3.twin_intent.tooltip_aria")}
src\app\[locale]\app\projects\new\new-project-wizard.tsx:745:                  {t("wizard.step3.twin_intent.tooltip")}
src\app\[locale]\app\projects\new\new-project-wizard.tsx:752:            name="twin_intent"
src\app\[locale]\app\projects\new\new-project-wizard.tsx:760:                  <RadioGroupItem value="undecided" id="twin_intent_undecided" />
src\app\[locale]\app\projects\new\new-project-wizard.tsx:762:                    htmlFor="twin_intent_undecided"
src\app\[locale]\app\projects\new\new-project-wizard.tsx:765:                    {t("wizard.step3.twin_intent.option.undecided")}
src\app\[locale]\app\projects\new\new-project-wizard.tsx:769:                  <RadioGroupItem value="specific_in_mind" id="twin_intent_specific" />
src\app\[locale]\app\projects\new\new-project-wizard.tsx:771:                    htmlFor="twin_intent_specific"
src\app\[locale]\app\projects\new\new-project-wizard.tsx:774:                    {t("wizard.step3.twin_intent.option.specific")}
src\app\[locale]\app\projects\new\new-project-wizard.tsx:778:                  <RadioGroupItem value="no_twin" id="twin_intent_no_twin" />
src\app\[locale]\app\projects\new\new-project-wizard.tsx:780:                    htmlFor="twin_intent_no_twin"
src\app\[locale]\app\projects\new\new-project-wizard.tsx:783:                    {t("wizard.step3.twin_intent.option.no_twin")}
src\app\[locale]\app\projects\new\new-project-wizard.tsx:858:                twin_intent: formVals.twin_intent,
src\app\[locale]\app\projects\[id]\page.tsx:52:  twin_intent: string | null;
src\app\[locale]\app\projects\[id]\page.tsx:96:  // Fetch project. budget_band / submitted_at / twin_intent / kind columns
src\app\[locale]\app\projects\[id]\page.tsx:108:      meeting_preferred_at, twin_intent, created_at,
src\app\[locale]\app\projects\[id]\page.tsx:136:    // twin_intent column added by task_01 migration (Wave D D.1 apply).
src\app\[locale]\app\projects\[id]\page.tsx:139:    twin_intent:
src\app\[locale]\app\projects\[id]\page.tsx:140:      (projectRaw.twin_intent as string | undefined | null) ?? null,
src\app\[locale]\app\projects\[id]\page.tsx:250:          twinIntent={narrowTwinIntent(project.twin_intent)}
src\app\[locale]\app\projects\[id]\page.tsx:259:            twinIntent: tDetail("info_rail.twin_intent"),
src\app\[locale]\app\projects\[id]\page.tsx:270:              undecided: tDetail("twin_intent.undecided"),
src\app\[locale]\app\projects\[id]\page.tsx:271:              specific_in_mind: tDetail("twin_intent.specific_in_mind"),
src\app\[locale]\app\projects\[id]\page.tsx:272:              no_twin: tDetail("twin_intent.no_twin"),
src\components\project-detail\info-rail.tsx:6://   - Twin intent (twin_intent enum -> KO/EN label)

codex
The board table has `project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE`, so the join is one board per project and cannot multiply across sibling boards. The remaining risk is in the new `briefing_documents` UPDATE policy shape, not the join.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql' | ForEach-Object { "'$i++; if($i -ge 20 -and $i -le 145){ '"'{0,4}: {1}' -f "'$i, $_ }}' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260422120000_phase_2_0_baseline.sql' | ForEach-Object { "'$i++; if(($i -ge 1585 -and $i -le 1615) -or ($i -ge 3380 -and $i -le 3410)){ '"'{0,4}: {1}' -f "'$i, $_ }}' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "briefing_documents|created_at.*briefing|ALTER TABLE .*briefing_documents|CREATE TRIGGER .*briefing|UPDATE OF created_at|REVOKE .*briefing|GRANT .*briefing" supabase/migrations src' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/actions.ts' | ForEach-Object { "'$i++; if($i -ge 450 -and $i -le 505){ '"'{0,4}: {1}' -f "'$i, $_ }}' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 376ms:
  20: CREATE OR REPLACE FUNCTION add_project_board_pdf(
  21:   p_board_id    uuid,
  22:   p_storage_key text,
  23:   p_filename    text,
  24:   p_size_bytes  bigint
  25: ) RETURNS uuid
  26: LANGUAGE plpgsql
  27: SECURITY DEFINER
  28: SET search_path = public, pg_temp
  29: AS $$
  30: DECLARE
  31:   v_caller_id  uuid := auth.uid();
  32:   v_project_id uuid;
  33:   v_is_locked  boolean;
  34:   v_is_admin   boolean;
  35:   v_new_id     uuid := gen_random_uuid();
  36:   v_pdf_count  int;
  37: BEGIN
  38:   -- Fetch board meta
  39:   SELECT pb.project_id, pb.is_locked
  40:   INTO v_project_id, v_is_locked
  41:   FROM project_boards pb
  42:   WHERE pb.id = p_board_id;
  43: 
  44:   IF NOT FOUND THEN
  45:     RAISE EXCEPTION 'add_project_board_pdf: board not found';
  46:   END IF;
  47: 
  48:   -- Role check: owner OR yagi_admin
  49:   v_is_admin := is_yagi_admin(v_caller_id);
  50:   IF NOT v_is_admin AND NOT EXISTS (
  51:     SELECT 1 FROM projects p
  52:     WHERE p.id = v_project_id AND p.owner_id = v_caller_id
  53:   ) THEN
  54:     RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
  55:   END IF;
  56: 
  57:   -- Lock check: block non-admin mutations on locked board
  58:   IF v_is_locked AND NOT v_is_admin THEN
  59:     RAISE EXCEPTION 'add_project_board_pdf: board is locked';
  60:   END IF;
  61: 
  62:   -- Count cap: max 30 PDFs
  63:   SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
  64:   FROM project_boards WHERE id = p_board_id;
  65:   IF v_pdf_count >= 30 THEN
  66:     RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
  67:   END IF;
  68: 
  69:   -- Size cap: max 20MB
  70:   IF p_size_bytes > 20 * 1024 * 1024 THEN
  71:     RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
  72:   END IF;
  73: 
  74:   -- Filename length
  75:   IF p_filename IS NULL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
  76:     RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
  77:   END IF;
  78: 
  79:   -- Storage key prefix validation: no path traversal, no absolute path, must start with known prefix
  80:   IF p_storage_key IS NULL
  81:     OR p_storage_key LIKE '%..%'
  82:     OR left(p_storage_key, 1) = '/'
  83:     OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
  84:     RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
  85:   END IF;
  86: 
  87:   -- Append entry using jsonb_build_object (no string concatenation)
  88:   UPDATE project_boards
  89:   SET
  90:     attached_pdfs = attached_pdfs || jsonb_build_array(
  91:       jsonb_build_object(
  92:         'id',          v_new_id::text,
  93:         'storage_key', p_storage_key,
  94:         'filename',    p_filename,
  95:         'size_bytes',  p_size_bytes,
  96:         'uploaded_at', now()::text,
  97:         'uploaded_by', v_caller_id::text
  98:       )
  99:     ),
 100:     updated_at = now()
 101:   WHERE id = p_board_id;
 102: 
 103:   RETURN v_new_id;
 104: END;
 105: $$;
 106: 
 107: -- ============================================================
 108: -- RPC: add_project_board_url
 109: -- Appends a URL attachment entry to project_boards.attached_urls.
 110: -- Validates: caller ownership OR yagi_admin, lock state, count cap (50),
 111: -- URL scheme (http/https only), URL length (2000), note length (500),
 112: -- provider enum (youtube/vimeo/generic).
 113: -- SECURITY DEFINER, search_path locked to public, pg_temp.
 114: -- ============================================================
 115: CREATE OR REPLACE FUNCTION add_project_board_url(
 116:   p_board_id      uuid,
 117:   p_url           text,
 118:   p_title         text,
 119:   p_thumbnail_url text,
 120:   p_provider      text,
 121:   p_note          text
 122: ) RETURNS uuid
 123: LANGUAGE plpgsql
 124: SECURITY DEFINER
 125: SET search_path = public, pg_temp
 126: AS $$
 127: DECLARE
 128:   v_caller_id  uuid := auth.uid();
 129:   v_project_id uuid;
 130:   v_is_locked  boolean;
 131:   v_is_admin   boolean;
 132:   v_new_id     uuid := gen_random_uuid();
 133:   v_url_count  int;
 134: BEGIN
 135:   SELECT pb.project_id, pb.is_locked
 136:   INTO v_project_id, v_is_locked
 137:   FROM project_boards pb
 138:   WHERE pb.id = p_board_id;
 139: 
 140:   IF NOT FOUND THEN
 141:     RAISE EXCEPTION 'add_project_board_url: board not found';
 142:   END IF;
 143: 
 144:   v_is_admin := is_yagi_admin(v_caller_id);
 145:   IF NOT v_is_admin AND NOT EXISTS (

 succeeded in 413ms:
1585: -- Name: projects; Type: TABLE; Schema: public; Owner: -
1586: --
1587: 
1588: CREATE TABLE public.projects (
1589:     id uuid DEFAULT gen_random_uuid() NOT NULL,
1590:     workspace_id uuid NOT NULL,
1591:     brand_id uuid,
1592:     project_type text DEFAULT 'direct_commission'::text NOT NULL,
1593:     created_by uuid NOT NULL,
1594:     title text NOT NULL,
1595:     brief text,
1596:     deliverable_types text[] DEFAULT '{}'::text[] NOT NULL,
1597:     estimated_budget_range text,
1598:     target_delivery_at timestamp with time zone,
1599:     status text DEFAULT 'draft'::text NOT NULL,
1600:     created_at timestamp with time zone DEFAULT now() NOT NULL,
1601:     updated_at timestamp with time zone DEFAULT now() NOT NULL,
1602:     intake_mode text DEFAULT 'brief'::text NOT NULL,
1603:     proposal_goal text,
1604:     proposal_audience text,
1605:     proposal_budget_range text,
1606:     proposal_timeline text,
1607:     CONSTRAINT projects_intake_mode_check CHECK ((intake_mode = ANY (ARRAY['brief'::text, 'proposal_request'::text]))),
1608:     CONSTRAINT projects_project_type_check CHECK ((project_type = ANY (ARRAY['direct_commission'::text, 'contest_brief'::text]))),
1609:     CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_discovery'::text, 'in_production'::text, 'in_revision'::text, 'delivered'::text, 'approved'::text, 'archived'::text])))
1610: );
1611: 
1612: 
1613: --
1614: -- Name: showcase_media; Type: TABLE; Schema: public; Owner: -
1615: --
3380: 
3381: ALTER TABLE ONLY public.preprod_frame_reactions
3382:     ADD CONSTRAINT preprod_frame_reactions_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
3383: 
3384: 
3385: --
3386: -- Name: preprod_frame_reactions preprod_frame_reactions_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
3387: --
3388: 
3389: ALTER TABLE ONLY public.preprod_frame_reactions
3390:     ADD CONSTRAINT preprod_frame_reactions_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;
3391: 
3392: 
3393: --
3394: -- Name: preprod_frames preprod_frames_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
3395: --
3396: 
3397: ALTER TABLE ONLY public.preprod_frames
3398:     ADD CONSTRAINT preprod_frames_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
3399: 
3400: 
3401: --
3402: -- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
3403: --
3404: 
3405: ALTER TABLE ONLY public.profiles
3406:     ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
3407: 
3408: 
3409: --
3410: -- Name: project_deliverables project_deliverables_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

 succeeded in 413ms:
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:2:-- Phase 5 Wave A task_02 — Data migration: attached_pdfs/urls jsonb → briefing_documents
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:6:--   Back-fill the new briefing_documents table (created in task_01:
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:7:--   20260504052541_phase_5_briefing_documents.sql) from the legacy
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:11:--   MUST apply AFTER 20260504052541_phase_5_briefing_documents.sql.
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:12:--   The briefing_documents table must exist before this migration runs.
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:16:--   re-running would create duplicate rows in briefing_documents.
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:18:--   briefing_documents LIMIT 1) before executing. If the table already has
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:25:--   briefing_documents before re-applying; that case is called out in the
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:55:--   -- Confirm briefing_documents is empty before migration
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:56:--   SELECT COUNT(*) FROM briefing_documents;
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:62:--   -- Count rows in briefing_documents vs source jsonb element counts
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:66:--   FROM briefing_documents
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:72:--   -- Cross-check: no orphan rows (briefing_documents without a parent project)
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:73:--   SELECT COUNT(*) FROM briefing_documents bd
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:78:--   -- Check for NULL storage_key (would violate briefing_documents_source_check)
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:80:--   SELECT COUNT(*) FROM briefing_documents
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:84:--   -- Check for NULL url (would violate briefing_documents_source_check)
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:85:--   SELECT COUNT(*) FROM briefing_documents
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:93:  -- Idempotency guard: if any row already exists in briefing_documents,
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:95:  -- duplicates. Builder must TRUNCATE briefing_documents manually if a
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:97:  IF EXISTS (SELECT 1 FROM briefing_documents LIMIT 1) THEN
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:98:    RAISE NOTICE 'briefing_documents already populated; skipping migrate (task_02 idempotency guard)';
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:112:  -- the briefing_documents_source_check constraint and will raise on INSERT.
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:130:  INSERT INTO briefing_documents (
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:168:  -- Note: 'title' is stored in the jsonb element but briefing_documents has
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:175:  INSERT INTO briefing_documents (
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:202:--    cause INSERT to fail at the briefing_documents_source_check constraint
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:216:--    INSERT 1 and INSERT 2). In that case briefing_documents will have upload
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:218:--    must TRUNCATE briefing_documents and re-run. This is the accepted
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:1:-- Phase 5 Wave A task_01 — briefing_documents table for the new Briefing Canvas paradigm (replaces the projects.attached_pdfs/urls jsonb pattern). Schema + 4 RLS policies. Data migration from the legacy jsonb columns lands in task_02.
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:3:-- briefing_documents — Phase 5 신규 테이블
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:5:CREATE TABLE briefing_documents (
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:29:  CONSTRAINT briefing_documents_source_check CHECK (
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:35:CREATE INDEX idx_briefing_documents_project_kind ON briefing_documents(project_id, kind);
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:36:CREATE INDEX idx_briefing_documents_created ON briefing_documents(created_at DESC);
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:39:ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:42:CREATE POLICY "briefing_documents_select" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:57:CREATE POLICY "briefing_documents_insert" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:76:CREATE POLICY "briefing_documents_update" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:87:CREATE POLICY "briefing_documents_delete" ON briefing_documents

 succeeded in 440ms:
 450: 
 451:   // Codex K-05 finding 2 (HIGH-B) ??restrict to status='draft'. Without
 452:   // this guard the wizard's submit path becomes a backdoor that demotes
 453:   // any project owned by the caller (submitted / in_production /
 454:   // delivered etc.) back to 'draft' or stomps on its fields, bypassing
 455:   // the transition matrix in projects/[id]/actions.ts.
 456:   if (target.status !== "draft") return { error: "forbidden" };
 457: 
 458:   // Wave D sub_03g F4: brand_id cross-workspace guard. Resolve the
 459:   // draft's workspace_id (the row the caller is allowed to mutate)
 460:   // and verify any submitted brand_id belongs to it.
 461:   if (fields.brand_id) {
 462:     const { data: draftRow } = await supabase
 463:       .from("projects")
 464:       .select("workspace_id")
 465:       .eq("id", projectId)
 466:       .maybeSingle();
 467:     if (!draftRow?.workspace_id) {
 468:       return { error: "not_found" };
 469:     }
 470:     const { data: brandRow } = await supabase
 471:       .from("brands")
 472:       .select("id")
 473:       .eq("id", fields.brand_id)
 474:       .eq("workspace_id", draftRow.workspace_id)
 475:       .maybeSingle();
 476:     if (!brandRow) {
 477:       return {
 478:         error: "db",
 479:         message: "brand_id does not belong to the project's workspace",
 480:       };
 481:     }
 482:   }
 483: 
 484:   const status = intent === "submit" ? "submitted" : "draft";
 485: 
 486:   const { data: updated, error } = await supabase
 487:     .from("projects")
 488:     .update({
 489:       title: fields.title,
 490:       brief: fields.description ?? null,
 491:       brand_id: fields.brand_id ?? null,
 492:       deliverable_types: fields.deliverable_types,
 493:       estimated_budget_range: fields.estimated_budget_range ?? null,
 494:       target_delivery_at: fields.target_delivery_at ?? null,
 495:       status,
 496:     })
 497:     .eq("id", projectId)
 498:     .eq("created_by", user.id)
 499:     .eq("status", "draft")
 500:     .select("id, status")
 501:     .single();
 502: 
 503:   if (error || !updated) {
 504:     console.error("[submitDraftProject] update error:", error);
 505:     return { error: "db", message: error?.message ?? "update failed" };

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -LiteralPath 'supabase/migrations/20260422120000_phase_2_0_baseline.sql' -Pattern 'projects_created_by_fkey|projects_workspace_id_fkey|projects_owner|owner_id|FOREIGN KEY \\(created_by\\)' -Context 1,3" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql' | ForEach-Object { "'$i++; if($i -ge 145 -and $i -le 240){ '"'{0,4}: {1}' -f "'$i, $_ }}' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "owner_id|ADD COLUMN owner_id|created_by.*REFERENCES|projects_created_by_fkey" supabase/migrations' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 369ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1868:    owner_id text,
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1877:COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1934:    owner_id text,
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1943:COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1957:    owner_id text,
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1976:    owner_id text,
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3206:    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3254:    ADD CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3326:    ADD CONSTRAINT preprod_boards_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3462:    ADD CONSTRAINT project_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3482:-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3486:    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3526:    ADD CONSTRAINT showcases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3566:    ADD CONSTRAINT team_channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:131:  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:88:  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:30:  created_by  uuid REFERENCES profiles(id),
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:2:-- HIGH-A #1: Fix owner_id -> created_by in all 4 new attachment RPCs
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:8:-- FIX HIGH-A #1a: add_project_board_pdf — owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:88:-- FIX HIGH-A #1b: add_project_board_url — owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:172:-- FIX HIGH-A #1c: remove_project_board_attachment — owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:239:-- FIX HIGH-A #1d: update_project_board_url_note — owner_id -> created_by
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:52:    WHERE p.id = v_project_id AND p.owner_id = v_caller_id
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:147:    WHERE p.id = v_project_id AND p.owner_id = v_caller_id
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:235:    WHERE p.id = v_project_id AND p.owner_id = v_caller_id
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:312:    WHERE p.id = v_project_id AND p.owner_id = v_caller_id
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:60:  created_by uuid NOT NULL REFERENCES profiles(id)
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:80:-- projects.owner_id but the actual ownership column is created_by.
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:27:  created_by uuid NOT NULL REFERENCES profiles(id),

 succeeded in 375ms:
 145:   IF NOT v_is_admin AND NOT EXISTS (
 146:     SELECT 1 FROM projects p
 147:     WHERE p.id = v_project_id AND p.owner_id = v_caller_id
 148:   ) THEN
 149:     RAISE EXCEPTION 'add_project_board_url: unauthorized';
 150:   END IF;
 151: 
 152:   IF v_is_locked AND NOT v_is_admin THEN
 153:     RAISE EXCEPTION 'add_project_board_url: board is locked';
 154:   END IF;
 155: 
 156:   SELECT jsonb_array_length(attached_urls) INTO v_url_count
 157:   FROM project_boards WHERE id = p_board_id;
 158:   IF v_url_count >= 50 THEN
 159:     RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
 160:   END IF;
 161: 
 162:   -- URL validation: http/https only, max 2000 chars
 163:   -- Explicitly rejects javascript:, data:, file:, chrome:, etc.
 164:   IF p_url IS NULL
 165:     OR length(p_url) > 2000
 166:     OR (p_url NOT LIKE 'http://%' AND p_url NOT LIKE 'https://%') THEN
 167:     RAISE EXCEPTION 'add_project_board_url: invalid URL (must be http:// or https://, max 2000 chars)';
 168:   END IF;
 169: 
 170:   -- Note length
 171:   IF p_note IS NOT NULL AND length(p_note) > 500 THEN
 172:     RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
 173:   END IF;
 174: 
 175:   -- Provider enum validation
 176:   IF p_provider IS NULL OR p_provider NOT IN ('youtube', 'vimeo', 'generic') THEN
 177:     RAISE EXCEPTION 'add_project_board_url: provider must be youtube, vimeo, or generic';
 178:   END IF;
 179: 
 180:   UPDATE project_boards
 181:   SET
 182:     attached_urls = attached_urls || jsonb_build_array(
 183:       jsonb_build_object(
 184:         'id',            v_new_id::text,
 185:         'url',           p_url,
 186:         'title',         p_title,
 187:         'thumbnail_url', p_thumbnail_url,
 188:         'provider',      p_provider,
 189:         'note',          p_note,
 190:         'added_at',      now()::text,
 191:         'added_by',      v_caller_id::text
 192:       )
 193:     ),
 194:     updated_at = now()
 195:   WHERE id = p_board_id;
 196: 
 197:   RETURN v_new_id;
 198: END;
 199: $$;
 200: 
 201: -- ============================================================
 202: -- RPC: remove_project_board_attachment
 203: -- Removes an attachment by id from attached_pdfs or attached_urls.
 204: -- kind must be 'pdf' or 'url'.
 205: -- Validates: caller ownership OR yagi_admin, lock state.
 206: -- Normalizes null back to empty array if all items removed.
 207: -- ============================================================
 208: CREATE OR REPLACE FUNCTION remove_project_board_attachment(
 209:   p_board_id      uuid,
 210:   p_kind          text,
 211:   p_attachment_id uuid
 212: ) RETURNS boolean
 213: LANGUAGE plpgsql
 214: SECURITY DEFINER
 215: SET search_path = public, pg_temp
 216: AS $$
 217: DECLARE
 218:   v_caller_id  uuid := auth.uid();
 219:   v_project_id uuid;
 220:   v_is_locked  boolean;
 221:   v_is_admin   boolean;
 222: BEGIN
 223:   SELECT pb.project_id, pb.is_locked
 224:   INTO v_project_id, v_is_locked
 225:   FROM project_boards pb
 226:   WHERE pb.id = p_board_id;
 227: 
 228:   IF NOT FOUND THEN
 229:     RAISE EXCEPTION 'remove_project_board_attachment: board not found';
 230:   END IF;
 231: 
 232:   v_is_admin := is_yagi_admin(v_caller_id);
 233:   IF NOT v_is_admin AND NOT EXISTS (
 234:     SELECT 1 FROM projects p
 235:     WHERE p.id = v_project_id AND p.owner_id = v_caller_id
 236:   ) THEN
 237:     RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
 238:   END IF;
 239: 
 240:   IF v_is_locked AND NOT v_is_admin THEN

 succeeded in 432ms:

  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1867:    allowed_mime_types text[],
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1868:    owner_id text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1869:    type storage.buckettype DEFAULT 'STANDARD'::storag
e.buckettype NOT NULL
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1870:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1871:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1876:
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1877:COMMENT ON COLUMN storage.buckets.owner IS 'Field is d
eprecated, use owner_id instead';
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1878:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1879:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1880:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1933:    version text,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1934:    owner_id text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1935:    user_metadata jsonb
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1936:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1937:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1942:
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1943:COMMENT ON COLUMN storage.objects.owner IS 'Field is d
eprecated, use owner_id instead';
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1944:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1945:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1946:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1956:    version text NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1957:    owner_id text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1958:    created_at timestamp with time zone DEFAULT now() 
NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1959:    user_metadata jsonb,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1960:    metadata jsonb
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1975:    etag text NOT NULL,
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:1976:    owner_id text,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1977:    version text NOT NULL,
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1978:    created_at timestamp with time zone DEFAULT now() 
NOT NULL
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:1979:);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3205:ALTER TABLE ONLY public.invoices
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3206:    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KE
Y (created_by) REFERENCES auth.users(id);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3207:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3208:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3209:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3253:ALTER TABLE ONLY public.meetings
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3254:    ADD CONSTRAINT meetings_created_by_fkey FOREIGN KE
Y (created_by) REFERENCES auth.users(id);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3255:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3256:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3257:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3325:ALTER TABLE ONLY public.preprod_boards
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3326:    ADD CONSTRAINT preprod_boards_created_by_fkey FORE
IGN KEY (created_by) REFERENCES auth.users(id);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3327:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3328:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3329:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3461:ALTER TABLE ONLY public.project_threads
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3462:    ADD CONSTRAINT project_threads_created_by_fkey FOR
EIGN KEY (created_by) REFERENCES public.profiles(id);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3463:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3464:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3465:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3481:--
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3482:-- Name: projects projects_created_by_fkey; Type: FK C
ONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3483:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3484:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3485:ALTER TABLE ONLY public.projects
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3486:    ADD CONSTRAINT projects_created_by_fkey FOREIGN KE
Y (created_by) REFERENCES public.profiles(id);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3487:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3488:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3489:--
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3490:-- Name: projects projects_workspace_id_fkey; Type: FK
 CONSTRAINT; Schema: public; Owner: -
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3491:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3492:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3493:ALTER TABLE ONLY public.projects
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3494:    ADD CONSTRAINT projects_workspace_id_fkey FOREIGN 
KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3495:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3496:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3497:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3525:ALTER TABLE ONLY public.showcases
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3526:    ADD CONSTRAINT showcases_created_by_fkey FOREIGN K
EY (created_by) REFERENCES auth.users(id);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3527:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3528:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3529:--
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3565:ALTER TABLE ONLY public.team_channels
> supabase\migrations\20260422120000_phase_2_0_baseline.sql:3566:    ADD CONSTRAINT team_channels_created_by_fkey FOREI
GN KEY (created_by) REFERENCES auth.users(id);
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3567:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3568:
  supabase\migrations\20260422120000_phase_2_0_baseline.sql:3569:--



exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql' | ForEach-Object { "'$i++; if(($i -ge 8 -and $i -le 85) -or ($i -ge 88 -and $i -le 165)){ '"'{0,4}: {1}' -f "'$i, $_ }}' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"UPDATE projects|\\.from\\(\\\"projects\\\"\\).*\\.update|interested_in_twin\" src/app src/lib src/components" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T20:38:44.523633Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.3 seconds
Output:
rg: regex parse error:
    (?:UPDATE projects|\.from\(" projects\\).*\.update|interested_in_twin src/app src/lib src/components)
                                                                                                        ^
error: unopened group

 exited 1 in 331ms:
rg: regex parse error:
    (?:UPDATE projects|\.from\(" projects\\).*\.update|interested_in_twin src/app src/lib src/components)
                                                                                                        ^
error: unopened group

 succeeded in 367ms:
   8: -- FIX HIGH-A #1a: add_project_board_pdf ??owner_id -> created_by
   9: -- ============================================================
  10: CREATE OR REPLACE FUNCTION add_project_board_pdf(
  11:   p_board_id    uuid,
  12:   p_storage_key text,
  13:   p_filename    text,
  14:   p_size_bytes  bigint
  15: ) RETURNS uuid
  16: LANGUAGE plpgsql
  17: SECURITY DEFINER
  18: SET search_path = public, pg_temp
  19: AS $$
  20: DECLARE
  21:   v_caller_id  uuid := auth.uid();
  22:   v_project_id uuid;
  23:   v_is_locked  boolean;
  24:   v_is_admin   boolean;
  25:   v_new_id     uuid := gen_random_uuid();
  26:   v_pdf_count  int;
  27: BEGIN
  28:   IF v_caller_id IS NULL THEN
  29:     RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
  30:   END IF;
  31: 
  32:   SELECT pb.project_id, pb.is_locked
  33:   INTO v_project_id, v_is_locked
  34:   FROM project_boards pb
  35:   WHERE pb.id = p_board_id;
  36: 
  37:   IF NOT FOUND THEN
  38:     RAISE EXCEPTION 'add_project_board_pdf: board not found';
  39:   END IF;
  40: 
  41:   v_is_admin := is_yagi_admin(v_caller_id);
  42:   IF NOT v_is_admin AND NOT EXISTS (
  43:     SELECT 1 FROM projects p
  44:     WHERE p.id = v_project_id AND p.created_by = v_caller_id
  45:   ) THEN
  46:     RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
  47:   END IF;
  48: 
  49:   IF v_is_locked AND NOT v_is_admin THEN
  50:     RAISE EXCEPTION 'add_project_board_pdf: board is locked';
  51:   END IF;
  52: 
  53:   SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
  54:   FROM project_boards WHERE id = p_board_id;
  55:   IF v_pdf_count >= 30 THEN
  56:     RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
  57:   END IF;
  58: 
  59:   IF p_size_bytes > 20 * 1024 * 1024 THEN
  60:     RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
  61:   END IF;
  62: 
  63:   IF p_filename IS NULL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
  64:     RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
  65:   END IF;
  66: 
  67:   IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/'
  68:     OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
  69:     RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
  70:   END IF;
  71: 
  72:   UPDATE project_boards
  73:   SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
  74:     'id', v_new_id::text,
  75:     'storage_key', p_storage_key,
  76:     'filename', p_filename,
  77:     'size_bytes', p_size_bytes,
  78:     'uploaded_at', now()::text,
  79:     'uploaded_by', v_caller_id::text
  80:   )), updated_at = now()
  81:   WHERE id = p_board_id;
  82: 
  83:   RETURN v_new_id;
  84: END;
  85: $$;
  88: -- FIX HIGH-A #1b: add_project_board_url ??owner_id -> created_by
  89: -- (jsonb fix in subsequent migration 20260429151910)
  90: -- ============================================================
  91: CREATE OR REPLACE FUNCTION add_project_board_url(
  92:   p_board_id      uuid,
  93:   p_url           text,
  94:   p_title         text,
  95:   p_thumbnail_url text,
  96:   p_provider      text,
  97:   p_note          text
  98: ) RETURNS uuid
  99: LANGUAGE plpgsql
 100: SECURITY DEFINER
 101: SET search_path = public, pg_temp
 102: AS $$
 103: DECLARE
 104:   v_caller_id  uuid := auth.uid();
 105:   v_project_id uuid;
 106:   v_is_locked  boolean;
 107:   v_is_admin   boolean;
 108:   v_new_id     uuid := gen_random_uuid();
 109:   v_url_count  int;
 110: BEGIN
 111:   IF v_caller_id IS NULL THEN
 112:     RAISE EXCEPTION 'add_project_board_url: unauthenticated';
 113:   END IF;
 114: 
 115:   SELECT pb.project_id, pb.is_locked
 116:   INTO v_project_id, v_is_locked
 117:   FROM project_boards pb
 118:   WHERE pb.id = p_board_id;
 119: 
 120:   IF NOT FOUND THEN
 121:     RAISE EXCEPTION 'add_project_board_url: board not found';
 122:   END IF;
 123: 
 124:   v_is_admin := is_yagi_admin(v_caller_id);
 125:   IF NOT v_is_admin AND NOT EXISTS (
 126:     SELECT 1 FROM projects p
 127:     WHERE p.id = v_project_id AND p.created_by = v_caller_id
 128:   ) THEN
 129:     RAISE EXCEPTION 'add_project_board_url: unauthorized';
 130:   END IF;
 131: 
 132:   IF v_is_locked AND NOT v_is_admin THEN
 133:     RAISE EXCEPTION 'add_project_board_url: board is locked';
 134:   END IF;
 135: 
 136:   SELECT jsonb_array_length(attached_urls) INTO v_url_count
 137:   FROM project_boards WHERE id = p_board_id;
 138:   IF v_url_count >= 50 THEN
 139:     RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
 140:   END IF;
 141: 
 142:   IF p_url IS NULL OR length(p_url) = 0 OR length(p_url) > 2000 THEN
 143:     RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
 144:   END IF;
 145: 
 146:   IF p_url NOT LIKE 'http://%' AND p_url NOT LIKE 'https://%' THEN
 147:     RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
 148:   END IF;
 149: 
 150:   IF p_note IS NOT NULL AND length(p_note) > 500 THEN
 151:     RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
 152:   END IF;
 153: 
 154:   UPDATE project_boards
 155:   SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
 156:     'id',            v_new_id::text,
 157:     'url',           p_url,
 158:     'title',         to_jsonb(p_title),
 159:     'thumbnail_url', to_jsonb(p_thumbnail_url),
 160:     'provider',      COALESCE(p_provider, 'generic'),
 161:     'note',          to_jsonb(p_note),
 162:     'added_at',      now()::text,
 163:     'added_by',      v_caller_id::text
 164:   )), updated_at = now()
 165:   WHERE id = p_board_id;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"interested_in_twin|from\\(\\\"projects\\\"\\)|from\\('projects'\\)|UPDATE projects\" src/app src/lib src/components" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260429151910_phase_3_1_hotfix_3_k05_loop_2_jsonb_nulls.sql' | ForEach-Object { "'$i++; if($i -ge 1 -and $i -le 130){ '"'{0,4}: {1}' -f "'$i, $_ }}' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T20:38:49.991404Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.3 seconds
Output:
rg: regex parse error:
    (?:interested_in_twin|from\(\)
    ^
error: unclosed group

 exited 1 in 340ms:
rg: regex parse error:
    (?:interested_in_twin|from\(\)
    ^
error: unclosed group

2026-05-03T20:38:50.045358Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
Get-Content : Cannot find path 'supabase/migrations/20260429151910_phase_3_1_hotfix_3_k05_loop_2_jsonb_nulls.sql' becau
se it does not exist.
At line:2 char:7
+ $i=0; Get-Content -LiteralPath 'supabase/migrations/20260429151910_ph ...
+       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (supabase/migrat...jsonb_nulls.sql:String) [Get-Content], ItemNotFoundEx 
   ception
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

 exited 1 in 393ms:
Get-Content : Cannot find path 'supabase/migrations/20260429151910_phase_3_1_hotfix_3_k05_loop_2_jsonb_nulls.sql' becau
se it does not exist.
At line:2 char:7
+ $i=0; Get-Content -LiteralPath 'supabase/migrations/20260429151910_ph ...
+       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (supabase/migrat...jsonb_nulls.sql:String) [Get-Content], ItemNotFoundEx 
   ception
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n interested_in_twin src/app src/lib src/components' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"from[(][\\\"']projects[\\\"']|UPDATE projects\" src/app src/lib src/components" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files supabase/migrations | rg "20260429151910|jsonb"' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T20:38:55.303690Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
The string is missing the terminator: ".
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
 

 exited 1 in 359ms:
The string is missing the terminator: ".
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
 

 succeeded in 388ms:
src/app\[locale]\app\projects\new\actions.ts:840:  interested_in_twin: z.boolean().default(false),
src/app\[locale]\app\projects\new\actions.ts:948:      interested_in_twin: data.interested_in_twin,

 succeeded in 410ms:
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql

codex
## VERDICT: NEEDS-ATTENTION

[FINDING 1] HIGH-B: `supabase/migrations/20260504052541_phase_5_briefing_documents.sql:56` — INSERT is not strictly current-workspace scoped. `p.created_by = auth.uid()` allows a user removed from the project workspace to keep inserting briefing documents for that workspace, and the policy does not require `briefing_documents.created_by = auth.uid()`, so a direct client insert can spoof `created_by`. Recommended fix: require current membership through `projects.workspace_id -> workspace_members.user_id = auth.uid()` for non-yagi users, and add `created_by = auth.uid()` to `WITH CHECK`.

[FINDING 2] HIGH-B: `supabase/migrations/20260504052541_phase_5_briefing_documents.sql:75` and `:86` — UPDATE/DELETE are not workspace scoped. A non-member who originally created the row can still UPDATE within the 24h window and DELETE draft project documents after being removed from the workspace. Recommended fix: add the same current-workspace membership predicate to UPDATE and DELETE, with a yagi_admin exception if intended.

[FINDING 3] MED-B: `supabase/migrations/20260504052541_phase_5_briefing_documents.sql:25` and `:75` — `created_at` is default `now()` and I found no trigger protecting it; without column-level grants/guardrails, the 24h UPDATE window depends on a mutable client-writable column. Recommended fix: include `briefing_documents` in the Wave-A-end column-grant sweep, revoking client updates to `created_at`, `created_by`, and probably `project_id`, or enforce immutability in a trigger.

[FINDING 4] MED-C: `supabase/migrations/20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:142` and `:185` — `uploaded_by` / `added_by` UUIDs are cast and used before checking that the profile still exists. A deleted uploader profile in JSON would pass the UUID cast but fail the new `briefing_documents.created_by REFERENCES profiles(id)` FK instead of falling back to `p.created_by`. Recommended fix: join/check `profiles` and use the JSON user only when it exists, otherwise fallback to `p.created_by`, or add an explicit preflight query for stale uploader UUIDs.

Confirmed notes: `role IN ('owner', 'admin')` at `:64` contains dead `'owner'` text because `workspace_members.role` only allows `'admin'|'member'`; remove `'owner'` unless the table CHECK is intentionally changing. The task_02 join preserves parent project mapping, `size_bytes` is numeric for RPC-written PDFs, and `twin_intent` is still written at `actions.ts:945` while `interested_in_twin` has no other write path found.

Run log summary: block prod apply until briefing_documents RLS scope and created_at/created_by integrity gaps are fixed.
tokens used
71,740
## VERDICT: NEEDS-ATTENTION

[FINDING 1] HIGH-B: `supabase/migrations/20260504052541_phase_5_briefing_documents.sql:56` — INSERT is not strictly current-workspace scoped. `p.created_by = auth.uid()` allows a user removed from the project workspace to keep inserting briefing documents for that workspace, and the policy does not require `briefing_documents.created_by = auth.uid()`, so a direct client insert can spoof `created_by`. Recommended fix: require current membership through `projects.workspace_id -> workspace_members.user_id = auth.uid()` for non-yagi users, and add `created_by = auth.uid()` to `WITH CHECK`.

[FINDING 2] HIGH-B: `supabase/migrations/20260504052541_phase_5_briefing_documents.sql:75` and `:86` — UPDATE/DELETE are not workspace scoped. A non-member who originally created the row can still UPDATE within the 24h window and DELETE draft project documents after being removed from the workspace. Recommended fix: add the same current-workspace membership predicate to UPDATE and DELETE, with a yagi_admin exception if intended.

[FINDING 3] MED-B: `supabase/migrations/20260504052541_phase_5_briefing_documents.sql:25` and `:75` — `created_at` is default `now()` and I found no trigger protecting it; without column-level grants/guardrails, the 24h UPDATE window depends on a mutable client-writable column. Recommended fix: include `briefing_documents` in the Wave-A-end column-grant sweep, revoking client updates to `created_at`, `created_by`, and probably `project_id`, or enforce immutability in a trigger.

[FINDING 4] MED-C: `supabase/migrations/20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:142` and `:185` — `uploaded_by` / `added_by` UUIDs are cast and used before checking that the profile still exists. A deleted uploader profile in JSON would pass the UUID cast but fail the new `briefing_documents.created_by REFERENCES profiles(id)` FK instead of falling back to `p.created_by`. Recommended fix: join/check `profiles` and use the JSON user only when it exists, otherwise fallback to `p.created_by`, or add an explicit preflight query for stale uploader UUIDs.

Confirmed notes: `role IN ('owner', 'admin')` at `:64` contains dead `'owner'` text because `workspace_members.role` only allows `'admin'|'member'`; remove `'owner'` unless the table CHECK is intentionally changing. The task_02 join preserves parent project mapping, `size_bytes` is numeric for RPC-written PDFs, and `twin_intent` is still written at `actions.ts:945` while `interested_in_twin` has no other write path found.

Run log summary: block prod apply until briefing_documents RLS scope and created_at/created_by integrity gaps are fixed.
