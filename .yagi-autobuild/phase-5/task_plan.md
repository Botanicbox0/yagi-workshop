# Phase 5 — Wave A task plan

> Authored 2026-05-04 by Builder. Derived from KICKOFF.md v1.2 §Wave A.
> Wave A = Foundation. 3 task parallel via 3 sonnet-4.6 teammates.
> Each teammate gets a self-contained brief; Builder coordinates the
> Codex K-05 LOOP per task and the prod migration apply gate.

## Branch state

- Base: `main` @ `ac628c3` (Phase 4.x ff-merged, including Wave C.5d)
- Working: `g-b-10-phase-5` (currently HEAD = `ac628c3`)
- Migration timestamp range: append after `20260504031343` (sub_03g F3
  in main)

## Pre-phase prerequisites — VERIFIED

| # | Item | Status |
|---|---|---|
| 1 | Phase 4.x ff-merged to main | ✅ `ac628c3` |
| 2 | Wave C.5d SHIPPED | ✅ |
| 3 | main pull --ff-only | ✅ |
| 4 | g-b-10-phase-5 branch | ✅ on branch |
| 5 | Codex CLI ChatGPT subscription auth + gpt-5.5 + medium default | ✅ |
| 6 | PRODUCT-MASTER v1.1 §C / §D | ✅ read (lines 777 / 852) |
| 7 | yagi-design-system v1.0 | ✅ available via skill |
| 8 | R2 bucket + `CLOUDFLARE_R2_PUBLIC_BASE` | ✅ |
| 9 | `getBoardAssetPutUrlAction` server action | ✅ |
| 10 | Resend email setup | ✅ |

## Wave A scope

### task_01 — `briefing_documents` schema + RLS
- **complexity**: complex
- **model**: Sonnet 4.6
- **parallel_group**: A
- **K-05**: Tier 1 high (cross-tenant + new RLS)
- **deliverables**:
  - `supabase/migrations/<ts>_phase_5_briefing_documents.sql` (CREATE TABLE + 4 RLS policies + 2 indexes per KICKOFF spec)
  - Migration NOT applied to prod yet — Builder coordinates apply after K-05 LOOP returns CLEAN + yagi GO
- **Codex K-05 LOOP focus** (6 from KICKOFF):
  1. Cross-tenant leak via project_id guess — RLS scope correct?
  2. INSERT policy `workspace_members.role` enum match (`owner`/`admin`)
  3. UPDATE 24h window race (`created_at` not mutated by trigger)
  4. DELETE policy — status='draft' only, no implicit yagi_admin escape hatch in DELETE (verify)
  5. `kind` + `source_type` + `category` invalid combos — DB-enforced or app-side?
  6. `category` CHECK only meaningful for kind='reference' — kind='brief' must store category=NULL
- **acceptance**:
  - Migration file authored, schema matches KICKOFF spec literally (do not improvise — yagi-locked decisions)
  - K-05 LOOP 1 returns CLEAN OR HIGH-A residual fixed inline within max 2 cycles
  - Builder runs prod apply via mcp `apply_migration` after yagi GO

### task_02 — Data migration `attached_pdfs/urls` jsonb → `briefing_documents`
- **complexity**: complex
- **model**: Sonnet 4.6
- **parallel_group**: A (depends on task_01 schema applied — sequential check before apply)
- **K-05**: Tier 1 high (data integrity)
- **deliverables**:
  - `supabase/migrations/<ts>_phase_5_migrate_attached_to_briefing_documents.sql` (2 INSERT … SELECT statements per KICKOFF)
  - Pre-apply count-check query authored
  - Post-apply count verify query authored
- **Codex K-05 LOOP focus** (5 from KICKOFF):
  1. JSONB element parsing NULL safety
  2. `created_by` fallback FK validity
  3. Idempotency — current migration is NOT idempotent; gate behind a single-run flag (e.g., presence check / migration table)
  4. Schema variance across Phase 3.0 vs 3.1 hotfix-3 jsonb shapes
  5. Apply gate — only after yagi confirm; data loss risk
- **acceptance**:
  - Migration file authored, exact SQL from KICKOFF
  - K-05 CLEAN
  - Apply order: task_01 migration applied → task_02 migration applied → count verify
  - Existing `projects.attached_pdfs/urls` columns NOT dropped (KICKOFF §제약: 폐기 X)

### task_03 — `interested_in_twin` + status copy i18n + onboarding/brand polish
- **complexity**: medium (combined sub-tasks)
- **model**: Sonnet 4.6
- **parallel_group**: A (independent of 01/02 schema)
- **K-05**: Tier 2 medium for sub_3a (column + zod), skip for sub_3b (i18n), skip for sub_3c (UI polish)
- **deliverables**:
  - **sub_3a**: `supabase/migrations/<ts>_phase_5_interested_in_twin.sql` + `src/app/[locale]/app/projects/new/actions.ts` (zod field + INSERT mapping). twin_intent enum kept, `interested_in_twin` boolean added with DEFAULT false.
  - **sub_3b**: `messages/ko.json` + `messages/en.json` `projects.status.*` keys (6 status). Audit existing call sites — list of consumers in result doc.
  - **sub_3c**: `src/app/[locale]/onboarding/brand/page.tsx` + `messages/ko.json` + `messages/en.json` `onboarding.brand.helper.twin`. Option A only (yagi-locked Wave A scope-min).
- **Codex K-05 LOOP focus** (3a only, Tier 2):
  1. boolean default false back-fills existing rows
  2. zod twin_intent + interested_in_twin coexistence — server-side mapping clear
  3. RLS impact = 0
- **acceptance**:
  - 3a migration + zod sync, K-05 CLEAN
  - 3b i18n keys present in both locales, status display consumers grep-audited
  - 3c brand placeholder + Twin helper copy live, /en parity
  - tsc=0, lint=baseline 3155, build=0

## Codex K-05 budget (Wave A)

Per KICKOFF.md v1.2 §K-05 message budget — Wave A target = 3-5 messages.

| Task | Tier | Reasoning | Expected messages |
|---|---|---|---|
| task_01 K-05 LOOP 1 | 1 | high | 1 |
| task_01 K-05 LOOP 2 (if HIGH-A) | 1 | high | 1 (conditional) |
| task_02 K-05 LOOP 1 | 1 | high | 1 |
| task_03 sub_3a K-05 LOOP 1 | 2 | medium (config default) | 1 |
| Wave A end Tier 3 verify | 3 | low | 1 |
| **Total expected** | | | **3-5** |

File count budget per K-05 call: < 10 files (Wave A is small surface).

## Builder grep audit pre-step

Phase 4.x lesson — Codex misses cascading patterns. Builder runs grep
before each Tier 1 K-05 to surface the obvious cascade and feed it
into the prompt:

For task_01 (RLS):
- `from\("workspace_members"\)` callsites near `.role` to verify the
  enum literal matches what the new policy expects (the wave-c5d
  audit confirmed `'owner'` and `'admin'` are the legitimate values)
- existing tables with similar 4-policy patterns to surface
  inconsistencies (`projects`, `project_boards`, `brands`)

For task_02 (data migration):
- existing rows in prod via Supabase MCP — count of
  `attached_pdfs` / `attached_urls` jsonb elements before migration
- post-migration count of `briefing_documents` rows by kind

For task_03 sub_3a:
- existing `twin_intent` consumers in `src/` — verify they remain
  callable without `interested_in_twin` (legacy compat)

## Spawn brief — common rules (apply to every teammate)

- Branch is `g-b-10-phase-5`. Commit ONLY on this branch. NEVER push
  to main, NEVER ff-merge. yagi handles ff-merge in Wave D.
- Migration files: append a fresh timestamp via
  `date +%Y%m%d%H%M%S` (don't reuse existing timestamps).
- DO NOT apply migrations to prod yourself — Builder runs the
  `mcp apply_migration` flow after K-05 returns CLEAN and yagi GO.
- If the schema you author diverges from the KICKOFF spec, STOP and
  raise it in the result doc; do not improvise — yagi-locked decisions
  in §Confirmed yagi decisions are not negotiable inside Wave A.
- After your last commit, write a short result file at
  `.yagi-autobuild/phase-5/_wave_a_task_<NN>_result.md` with: commit
  SHAs, files touched, tsc/lint/build state, anything you punted on.
- L-001: PowerShell does not support `&&`. Use `;` chaining or split.
- Codex K-05 is run by Builder, not by the teammate. Surface anything
  K-05-relevant in the result doc.

## Wave A acceptance gate (Builder owned)

After all 3 teammates report SHIPPED:

1. Builder runs Tier 1 K-05 on task_01 and task_02 (separately, file
   count < 10 each).
2. If CLEAN, Builder runs Tier 2 K-05 on task_03 sub_3a.
3. yagi GO check before prod migration apply.
4. Builder applies 3 migrations sequentially via mcp `apply_migration`
   (task_01 schema → task_02 data → task_03 sub_3a column).
5. Verify count match for task_02. Verify column exists for sub_3a.
   Verify RLS policies live for task_01.
6. Builder runs final Tier 3 verify K-05 over the wave's net diff.
7. tsc / lint baseline-3155 / build all 0.
8. yagi visual review (onboarding/brand polish + status copy display).
9. Write `_wave_a_result.md` and update `_run.log`.

## Output expectations (Builder)

- `.yagi-autobuild/phase-5/task_plan.md` (this file)
- `.yagi-autobuild/phase-5/_wave_a_task_01_result.md` (teammate 1)
- `.yagi-autobuild/phase-5/_wave_a_task_02_result.md` (teammate 2)
- `.yagi-autobuild/phase-5/_wave_a_task_03_result.md` (teammate 3)
- `.yagi-autobuild/phase-5/_phase_5_review_targets.log` (cumulative)
- `.yagi-autobuild/phase-5/_wave_a_codex_review_task_01.md`
- `.yagi-autobuild/phase-5/_wave_a_codex_review_task_02.md`
- `.yagi-autobuild/phase-5/_wave_a_codex_review_task_03_sub_3a.md`
- `.yagi-autobuild/phase-5/_wave_a_result.md` (Wave A end)
- `.yagi-autobuild/phase-5/_run.log` (per-task SHIPPED + message count)

---

# Phase 5 — Wave B task plan (appended 2026-05-04 post Wave A SHIPPED)

> Wave B = Briefing Canvas, sequential, lead Builder direct (no spawn).
> KICKOFF v1.2 §Wave B (lines 592-833). Day 4-10 (7 days budget).
> Each stage = yagi visual review sub-gate.

## Wave B scope

### task_04 — Stage 1 — Intent form (3-col grid)
- **complexity**: complex
- **model**: Builder Opus direct (sequential)
- **K-05**: skip (UI + i18n only, no RLS / server-action work)
- **deliverables**:
  - `src/app/[locale]/app/projects/new/briefing-canvas-stage-1.tsx` (NEW)
  - `src/app/[locale]/app/projects/new/page.tsx` (mount Stage 1, stage routing scaffold)
  - `messages/ko.json` + `messages/en.json` — `projects.briefing.stage1.*` keys
- **9 form fields** (per KICKOFF §task_04):
  - Col 1: deliverable_types (multi, **AI 인물 활용 콘텐츠** added) / purpose (multi) / channels (multi)
  - Col 2: description (textarea) / visual_ratio (single chip) / target_audience (textarea)
  - Col 3: has_plan (single) / mood_keywords (multi chip + free) / additional_notes (textarea)
- **persistence strategy** for Stage 1 — only the fields that map to existing `projects` columns persist via ensureDraftProject (description, deliverable_types, brand_id eventually). The new Stage-1-only fields (purpose, channels, visual_ratio, target_audience, has_plan, mood_keywords, additional_notes) are held in client state through to Stage 3 submit, where they're flattened into a JSON intent payload (decision: store as `projects.brief` extension JSON OR add columns in a Wave-B-end follow-up migration). Default for Wave B kickoff: client-state-only + flatten at Stage 3; defer schema decision to task_06 spec lock.
- **acceptance**:
  - 3-col grid on desktop, 1-col on mobile (375px verified)
  - All 9 fields functional + zod validation
  - "임시 저장" persists draft (existing ensureDraftProject path)
  - "저장 후 다음 단계 →" navigates to Stage 2 placeholder ("Coming soon" page until task_05 lands)
  - /en parity
  - yagi visual review PASS

### task_05 — Stage 2 — Asset workspace
- **K-05**: mandatory Tier 1 (server actions for briefing_documents writes + R2 prefix + oembed SSRF)
- 2-col + sidebar layout per KICKOFF §task_05
- New server actions: `addBriefingDocumentAction`, `removeBriefingDocumentAction`, `updateBriefingDocumentNoteAction`, `getBriefingDocumentPutUrlAction`
- R2 prefix: `briefing-docs/${user.id}/{brief|reference}/<uuid>.<ext>`
- expandable tldraw whiteboard section
- See KICKOFF lines 676-769 for full spec

### task_06 — Stage 3 — Review + submit
- **K-05**: skip
- Read-only summary + edit affordance + final submit CTA
- New server action: `submitBriefingAction` (replaces or wraps legacy `submitProjectAction`)
- Lock briefing_documents on status='in_review' transition (RLS already enforces — verify)
- See KICKOFF lines 771-825

## Wave B Codex K-05 budget

- task_04 K-05: skip (UI only)
- task_05 K-05 LOOP 1: 1 message (Tier 1 high)
- task_05 K-05 LOOP 2 (if HIGH-A): 1 message conditional
- task_06 K-05: skip
- Wave B end Tier 3 verify: 1 message
- **Estimated total**: 1-3 messages over 7 days. Trivial quota footprint.

## Wave B acceptance gate (Builder owned)

- 3 stages all functional + sequential nav working
- Stage 1+2 fields persisted to DB at Stage 3 submit
- briefing_documents kind/source_type/note/category integrity OK
- yagi visual review PASS each stage
- tsc / lint / build all 0
