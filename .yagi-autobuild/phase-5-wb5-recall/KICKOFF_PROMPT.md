# Builder Kickoff — Phase 5 Wave B.5 (Client Recall) — v3

You are Builder (Opus, B-O-E lead). Read this kickoff + sibling
`SPEC.md` (now exists at `.yagi-autobuild/phase-5-wb5-recall/SPEC.md`)
before any tool call.

## Resume note (from v1 halt + v2 → v3 정정)

- v1 kickoff caused HALT because SPEC.md did not exist on disk.
- v2 added migration apply gate — 야기 정정: prod = sandbox state,
  no separate environment, builder 자율 apply.
- v3 정정사항:
  - Migration apply gate 제거 (Builder 자율 `mcp__supabase__apply_migration`)
  - Codex reasoning effort 강제 안 함 (Builder 자율 medium/high 판단)
  - ff-merge gate (야기 GO) 만 유지

SPEC v3 가 디스크에 갱신됨. 두 파일 다시 read 후 resume.
v1 questions Q1.1 ~ Q1.5 + Q2 + Q3 모두 SPEC v3 에서 답변됨.

## Context loading (mandatory, in order)

1. `view ~/.claude/skills/yagi-context/SKILL.md`
2. `view ~/.claude/skills/yagi-design-system/SKILL.md`
3. `view .yagi-autobuild/PRODUCT-MASTER.md` — head 350, then tail 200
   (sections 0, §C.2, §C.4 most relevant)
4. `view .yagi-autobuild/phase-5-wb5-recall/SPEC.md`  ← v3
5. `view supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql`
   lines 200–340 (state machine truth table you must extend)
6. `view supabase/migrations/20260504200001_phase_5_transition_project_status_creator_role.sql`
   (Wave B creator-first role patch — your matrix change must compose with this)

## Mandate

Implement SPEC.md v3 exactly. Do not expand scope.

If SPEC v3 still reveals ambiguity, write to
`.yagi-autobuild/phase-5-wb5-recall/_questions_v3.md` and HALT.

## Build order (sequential, single ff-merge gate at the end)

### Step 1 — Migration draft
- Filename:
  `supabase/migrations/<utc_timestamp>_phase_5_wb5_client_recall_to_draft.sql`
- Timestamp format `YYYYMMDDHHMMSS` matching repo convention
- CREATE OR REPLACE `is_valid_transition` with the 2 added client rows
  per SPEC §"State machine 변경". Preserve all other existing rows
  verbatim — copy from Phase 3.0 migration.
- All comments in English (Phase 3.0 convention: no Korean in SQL).

### Step 2 — Server action
- `src/app/(authenticated)/projects/[id]/_actions/recallProjectAction.ts`
- Pattern: copy `submitProjectAction.ts` shape (find via grep).
- Discriminated union return per SPEC §"Server action".

### Step 3 — i18n keys
- Add namespace `projectDetail.recall.*` to `messages/ko.json` +
  `messages/en.json`. SPEC.md 8-row table is source of truth.

### Step 4 — RecallButton
- Use existing AlertDialog primitive (grep `AlertDialog` to find path,
  likely `src/components/ui/alert-dialog.tsx`).
- Use existing toast (`useToast` or `sonner` — grep to confirm).
- Style: outline variant, sage accent (`#71D083`) on confirm action.
- No new dependencies.

### Step 5 — Detail page integration
- Conditional render only — single block per SPEC §"Detail page integration".
- Condition: `(status === 'submitted' || status === 'in_review') && viewer.id === project.created_by`
- Do NOT touch other detail page surfaces (Wave C scope).

### Step 6 — Pre-apply verification (SPEC steps 1–3)
- `pnpm exec tsc --noEmit` clean
- `pnpm lint` clean
- `pnpm build` clean
- Write results to `.yagi-autobuild/phase-5-wb5-recall/_verify_log.md`

### Step 7 — Apply migration to prod (Builder 자율)
- `mcp__supabase__apply_migration` to prod (`jvamvbpxnztynsccvcmr`).
- prod = sandbox state (no real users), no chat gate required.

### Step 8 — Post-apply SQL verify (SPEC steps 4–8)
- Run 5 SQL queries via `mcp__supabase__execute_sql`.
- Append to `_verify_log.md`.
- Any unexpected result → HALT (matrix bug).

### Step 9 — Manual smoke (SPEC steps 9–13)
- Run smoke yourself if possible (browser automation), or write
  step-by-step instructions for 야기 to run manually + paste results.
- Append to `_verify_log.md`.

### Step 10 — K-05 LOOP 1
- Write `.yagi-autobuild/phase-5-wb5-recall/_codex_review_prompt.md`
  with adversarial framing per SPEC §"Verification" step 14.
- Codex 가용 → `codex` CLI. Reasoning effort: 자율 (default `medium`,
  복잡도/risk 보고 `high` upgrade).
- Unavailable → Opus self-review.
- Findings → `.yagi-autobuild/phase-5-wb5-recall/_codex_review_loop1.md`.
- 0 findings = PASS.

### YAGI GATE — Final ff-merge
- Final report `.yagi-autobuild/phase-5-wb5-recall/_wave_b5_result.md`.
- Chat 야기에게 GO/HALT recommendation.
- 야기 GO → ff-merge to main.

## Constraints (non-negotiable)

- One PowerShell git command at a time. `git status` after every
  `git add`. Commit messages via `-F .git\COMMIT_MSG.txt`.
- Korean characters in SQL = forbidden.
- No new npm dependencies. Reuse existing UI + i18n infra.
- Wave C scope (detail page redesign) is OFF-LIMITS — your detail page
  integration is *minimal patch only* (single conditional render block).
- ff-merge to main requires 야기 chat GO (single gate).

## HALT conditions

- Migration draft fails to compose (e.g., existing matrix changed since
  SPEC was written) → HALT, write to `_questions_v3.md`
- Step 6 (tsc/lint/build) FAIL → HALT, fix and retry
- SPEC verify step 4–8 SQL returns unexpected result → HALT (matrix bug)
- K-05 LOOP 1 finds 1+ HIGH severity → HALT for 야기 (Layer 2 required)
- Existing AlertDialog or toast primitive missing → HALT
  (do not introduce new UI lib)

## Reporting

Final report:
`.yagi-autobuild/phase-5-wb5-recall/_wave_b5_result.md`

Sections:
- Diffs (commits + file list)
- Verify log summary (steps 1–13)
- K-05 result
- Open questions
- Ready-to-merge: YES / NO

Then chat summary to 야기:
- (a) commits made (hashes)
- (b) verify summary
- (c) GO / HALT recommendation

---

GO.
