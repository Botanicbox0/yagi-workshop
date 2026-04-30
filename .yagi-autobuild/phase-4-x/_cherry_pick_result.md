# Cherry-pick result (Phase 4.x ENTRY)

**Source:** `g-b-8-canvas` @ `0322fba`
**Target:** `g-b-9-phase-4` (base = `main` @ `5bfca60`)
**Plan reference:** `_cherry_pick_plan.md` (21 commits chronological, 1 excluded)
**Yagi confirm:** `cherry-pick GO` (received in chat 2026-04-30, prior session)
**Executed:** 2026-04-30 (post-confirm) — 21 commits applied via `git cherry-pick` chronological batch

---

## Applied commits (g-b-9-phase-4 new SHAs, oldest → newest)

| # | New SHA | Source SHA (g-b-8-canvas) | Title |
|---|---|---|---|
| 1 | `60ea614` | `4325897` | feat(db): Phase 3.1 project_boards + project_board_versions + 3 RPCs + RLS |
| 2 | `85c3241` | `0180e1d` | fix(k05-loop-1): seed RPC owner gate, server-gen storage keys, asset_index seed, autosave wiring, lock race, bucket mismatch |
| 3 | `ef44625` | `43ff013` | fix(k05-loop-2): drop unsafe 2-arg seed RPC overload + bind storageKey to caller user.id |
| 4 | `ab8d82f` | `d9b76d9` | feat(board): tldraw POC shell — 3 custom shapes, achromatic theme, empty overlay, mobile read-only |
| 5 | `dfc830c` | `4665312` | feat(board): drop handlers + asset action menu + asset-index extractor |
| 6 | `a421c2f` | `8ed637e` | feat(wizard): step 2 = ProjectBoard wizard mode + seed_project_board RPC submit |
| 7 | `2b234f3` | `e658424` | feat(brief-board): add readOnly prop + legacy banner for Phase 3.1 routing |
| 8 | `26b0c03` | `db5ca75` | feat(detail): brief tab = ProjectBoard brief mode + board-actions + version-history-panel |
| 9 | `0eebffa` | `779a441` | feat(admin): asset list panel + queue count indicator (Phase 3.1) |
| 10 | `ef6baba` | `6c3b17e` | fix(board): drop runtime import of yagi-shape-types.d.ts (webpack cannot resolve type-only file) |
| 11 | `52282a8` | `ae7738d` | feat(db): hotfix-3 migration — attached_pdfs + attached_urls + 4 RPCs + extend seed RPC |
| 12 | `f23b8c3` | `098787a` | feat(board): unified asset_index normalizer with attached_pdfs + attached_urls merge |
| 13 | `9b414df` | `74efba1` | **★ feat(board): canvas full-width breakout + Q-AD aspect ratio + tsconfig allowImportingTsExtensions** (KICKOFF feature #1) |
| 14 | `591fe13` | `5d4a905` | **★ feat(attachments): AttachmentsSection + PdfCard + UrlCard + i18n + asset-list-panel update** (KICKOFF feature #2 a) |
| 15 | `2ba67e8` | `9c37810` | **★ feat(integration): wire AttachmentsSection to wizard + brief mode + 5 server actions** (KICKOFF feature #2 b) |
| 16 | `2543b69` | `1c8c73b` | **★ feat(lock-ui): yagi_admin lock button + locked banner + cascade + toggleBoardLockAction** (KICKOFF feature #3) |
| 17 | `6c64a5b` | `6454bb3` | chore: regen database.types.ts for hotfix-3 schema (attached_pdfs/urls + 4 new RPCs) |
| 18 | `4c2abe5` | `dedb499` | fix(types): add as-any casts to ref-actions.ts after database.types.ts regen (kind column NOT NULL) |
| 19 | `c5128d1` | `b2788b2` | fix(k05-loop-1-hotfix3): owner_id->created_by in 4 RPCs + seed auth gate + RLS column REVOKE |
| 20 | `f677c40` | `1da4207` | **★ feat(hotfix-3-addendum): Wave E task_09 — Step 3 polish + meeting_preferred_at + canvas drop dedup** (KICKOFF features #4 + #5) |
| 21 | `0b0706c` | `5cd1fc2` | chore(types): regen database.types.ts post task_09 meeting_preferred_at migration |

**HEAD (g-b-9-phase-4):** `0b0706c`
**Excluded:** `0322fba` (broken F1-F6 wiring + commission redirect placeholder + post-submit error surfacing) — Phase 4.x task_02 + task_05 에서 깨끗하게 재구현

---

## Conflict resolution

**Status:** 0 conflicts during chronological cherry-pick batch.

Pre-flight conflict prediction (from `_cherry_pick_plan.md`):
- `messages/ko.json` / `en.json` — accumulative additions, chronological order resolves cleanly. ✅
- `src/lib/supabase/database.types.ts` — auto-gen, both regen commits applied without manual merge. ✅
- `src/app/[locale]/app/projects/new/actions.ts` — multiple commits, chronological order preserves dependency. ✅
- `tsconfig.json` — `allowImportingTsExtensions` (commit 13) added cleanly to existing main config. ✅
- main `5bfca60` (R2 presign x-amz-checksum-* strip) — separate concern, no overlap. ✅

---

## KICKOFF §Carry-over 5 features mapping (verify via SHA)

| KICKOFF # | Feature | New SHA(s) on g-b-9-phase-4 |
|---|---|---|
| 1 | Step 2 max-w-6xl breakout | `9b414df` |
| 2 | AttachmentsSection (PDF/URL 별도 섹션) | `591fe13` + `2ba67e8` |
| 3 | Lock UI (admin 잠금 + cascade banner) | `2543b69` |
| 4 | Drop 중복 fix (registerExternalContentHandler) | `f677c40` (canvas drop dedup portion) |
| 5 | 미팅 희망 일자 필드 (datetime-local + DB column + i18n) | `f677c40` (meeting_preferred_at portion) + `0b0706c` (types regen) |

추가 흡수: `52282a8` (hotfix-3 attachments migration `20260429144523_phase_3_1_hotfix_3_attachments.sql`) — git history + prod sync. Idempotent risk: 검증은 Wave D D.1 의 `supabase migration list` 비교에서 처리.

---

## Post cherry-pick verify

| Check | Result | Note |
|---|---|---|
| `git log --oneline main..HEAD` | 21 commits visible | Chronological order matches plan |
| `pnpm exec tsc --noEmit` | exit 0, 0 errors | Clean |
| `pnpm lint` | exit 1, **delta vs main = 0** | Baseline broken on main (pre-existing); cherry-pick 0 net-new errors |
| `pnpm build` | Deferred to Wave A integrate (Step 6) | Heavy — run after teammates commit |
| KICKOFF prereq §6 (tldraw render / AttachmentsSection / Lock UI live) | Deferred to Wave D D.11 browser smoke | Wave A spec does not require browser verify |

### Lint baseline analysis

g-b-9-phase-4 lint (post-21-cherry-picks): **26556 problems (3155 errors, 23401 warnings)**, exit 1.
main lint (5bfca60 baseline): same exit 1.

Top 7 error rules — exact match between main and g-b-9-phase-4:

| Rule | main | g-b-9-phase-4 | Delta |
|---|---|---|---|
| `@typescript-eslint/no-explicit-any` | 1156 | 1156 | 0 |
| `@typescript-eslint/no-require-imports` | 899 | 899 | 0 |
| `@typescript-eslint/no-this-alias` | 332 | 332 | 0 |
| `@typescript-eslint/no-wrapper-object-types` | 72 | 72 | 0 |
| `yagi-rsc/no-async-form-action` | 2 | 2 | 0 |
| `react/display-name` | 1 | 1 | 0 |
| `@typescript-eslint/triple-slash-reference` | 1 | 1 | 0 |

**Conclusion**: Cherry-pick added 0 lint regressions. The 3155 baseline errors are pre-existing on main (likely vendored / generated files such as `database.types.ts`, tldraw shape declarations using `require()`, eslint-disable directive misuse, etc. — out of scope for Phase 4.x). Document for FOLLOWUPS but do not block Wave A.

---

## Decision log

- 21 cherry-picks (not 5) → KICKOFF §Carry-over 5 항목은 5 working *features* but their commit dependency chain is 21 commits. `_cherry_pick_plan.md` 야기 confirm 시 21 채택 확정.
- `0322fba` 단독 제외 → broken F1-F6 wiring + post-submit error surface concentrated 여기. task_02 (Wave A) + task_05 (Wave C) 에서 재구현.

---

## Next step

Step 5 — Wave A spawn (3 teammates parallel, all Sonnet 4.6):
- task_01: DB schema migration (workspaces.kind + projects.twin_intent + projects.kind enum + project_licenses)
- task_02: F1-F6 submit-broken precise fix
- task_03: Wizard Step 3 Twin intent 3-radio (LOCKED §1)

`task_plan.md` 동시 작성.
