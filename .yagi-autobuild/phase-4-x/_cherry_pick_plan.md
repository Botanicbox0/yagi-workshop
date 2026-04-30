# Cherry-pick plan (Phase 4.x ENTRY)

**Source branch:** `g-b-8-canvas` @ `0322fba`
**Target branch:** `g-b-9-phase-4` (base = `main` @ `5bfca60`)
**Divergence point:** `5bfca60` (last common ancestor)
**Total commits on g-b-8-canvas above divergence:** 22

---

## 핵심 분석

KICKOFF §Carry-over 표는 "5 working features" 만 명시하지만, 실제로 그 5 features 는 Phase 3.1 + hotfix-3 의 **누적된 21 commits** 에 dependency 가 있다. KICKOFF §Goal 도 "Phase 3.1 + hotfix-3 + Phase 4.x → main 단일 ff-merge" 라 명시 → 즉, **broken parts 만 제외하고 거의 전체 carry-over** 가 의도다.

22 commits 중 1 commit 만 제외 (`0322fba` — broken F1-F6 wiring + commission redirect placeholder + post-submit error surfacing 의 broken portion). 나머지 21 cherry-pick.

---

## 제외 (1 commit)

| SHA | Title | 제외 사유 |
|---|---|---|
| `0322fba` | fix(hotfix-3-addendum-2): Wave H task_12 - submit error surfacing + client redirect + commission route migration | KICKOFF §Carry-over 제외 4 항목 중 3개 (F1-F6 진단 wiring, /app/commission redirect, post-submit detail) 이 이 commit 에 응집. task_02 (F1-F6 정밀 fix) + task_05 (commission redirect 재설계) 에서 깨끗하게 재구현. |

---

## Cherry-pick 대상 (21 commits, 시간순)

### Group 1 — Phase 3.1 DB foundation (3 commits)

| # | SHA | Title | Why |
|---|---|---|---|
| 1 | `4325897` | feat(db): Phase 3.1 project_boards + project_board_versions + 3 RPCs + RLS | Phase 3.1 base migration. ProjectBoard 동작의 schema 기초. |
| 2 | `0180e1d` | fix(k05-loop-1): seed RPC owner gate, server-gen storage keys, asset_index seed, autosave wiring, lock race, bucket mismatch | K05 LOOP 1 hardening — 1번 위에 직접 의존. |
| 3 | `43ff013` | fix(k05-loop-2): drop unsafe 2-arg seed RPC overload + bind storageKey to caller user.id | K05 LOOP 2 hardening — 1+2 위에 직접 의존. |

### Group 2 — Phase 3.1 ProjectBoard component scaffolding (5 commits)

| # | SHA | Title | Why |
|---|---|---|---|
| 4 | `d9b76d9` | feat(board): tldraw POC shell — 3 custom shapes, achromatic theme, empty overlay, mobile read-only | 5 working features 의 base ProjectBoard 컴포넌트 자체. |
| 5 | `4665312` | feat(board): drop handlers + asset action menu + asset-index extractor | Drop 동작 기초 — feature #4 (drop dedup) 의 prerequisite. |
| 6 | `8ed637e` | feat(wizard): step 2 = ProjectBoard wizard mode + seed_project_board RPC submit | Wizard Step 2 가 ProjectBoard 사용. feature #1 (Step 2 max-w-6xl breakout) 의 base. |
| 7 | `e658424` | feat(brief-board): add readOnly prop + legacy banner for Phase 3.1 routing | Brief mode (detail page board tab) 에서 사용. |
| 8 | `db5ca75` | feat(detail): brief tab = ProjectBoard brief mode + board-actions + version-history-panel | Detail page 의 board tab. task_04 재설계 시 wrap 또는 부분 재사용. |

### Group 3 — Phase 3.1 admin + runtime fix (2 commits)

| # | SHA | Title | Why |
|---|---|---|---|
| 9 | `779a441` | feat(admin): asset list panel + queue count indicator (Phase 3.1) | Admin queue indicator. |
| 10 | `6c3b17e` | fix(board): drop runtime import of yagi-shape-types.d.ts (webpack cannot resolve type-only file) | Build fix. |

### Group 4 — hotfix-3 DB migration + integration (4 commits)

| # | SHA | Title | Why |
|---|---|---|---|
| 11 | `ae7738d` | feat(db): hotfix-3 migration — attached_pdfs + attached_urls + 4 RPCs + extend seed RPC | hotfix-3 의 attachments DB layer. feature #2 (AttachmentsSection) 의 prerequisite. |
| 12 | `098787a` | feat(board): unified asset_index normalizer with attached_pdfs + attached_urls merge | Board asset-index 가 PDF/URL 통합. |
| 13 | `74efba1` | **feat(board): canvas full-width breakout + Q-AD aspect ratio + tsconfig allowImportingTsExtensions** | **★ KICKOFF feature #1 — Step 2 max-w-6xl breakout** |
| 14 | `5d4a905` | **feat(attachments): AttachmentsSection + PdfCard + UrlCard + i18n + asset-list-panel update** | **★ KICKOFF feature #2 (a) — AttachmentsSection** |

### Group 5 — hotfix-3 wiring + Lock UI (3 commits)

| # | SHA | Title | Why |
|---|---|---|---|
| 15 | `9c37810` | **feat(integration): wire AttachmentsSection to wizard + brief mode + 5 server actions** | **★ KICKOFF feature #2 (b) — AttachmentsSection wiring** |
| 16 | `1c8c73b` | **feat(lock-ui): yagi_admin lock button + locked banner + cascade + toggleBoardLockAction** | **★ KICKOFF feature #3 — Lock UI** |
| 17 | `6454bb3` | chore: regen database.types.ts for hotfix-3 schema (attached_pdfs/urls + 4 new RPCs) | Types regen — 11번 위에 의존. |

### Group 6 — hotfix-3 type casts + RLS hardening (2 commits)

| # | SHA | Title | Why |
|---|---|---|---|
| 18 | `dedb499` | fix(types): add as-any casts to ref-actions.ts after database.types.ts regen (kind column NOT NULL) | tsc fix post-types-regen. |
| 19 | `b2788b2` | fix(k05-loop-1-hotfix3): owner_id->created_by in 4 RPCs + seed auth gate + RLS column REVOKE | hotfix-3 K05 LOOP 1 hardening (RLS + 2 추가 migrations: `20260429151821`, `20260429151910`). |

### Group 7 — hotfix-3 addendum (Step 3 + meeting + drop dedup) (2 commits)

| # | SHA | Title | Why |
|---|---|---|---|
| 20 | `1da4207` | **feat(hotfix-3-addendum): Wave E task_09 — Step 3 polish + meeting_preferred_at + canvas drop dedup** | **★ KICKOFF features #4 (drop dedup) + #5 (meeting_preferred_at)** combined commit. Step 3 polish 도 동봉. |
| 21 | `5cd1fc2` | chore(types): regen database.types.ts post task_09 meeting_preferred_at migration | Types regen — 20번 위에 의존. |

---

## Mapping: KICKOFF §Carry-over 5 항목 → cherry-pick commits

| KICKOFF # | 기능 | 이 plan 의 commits |
|---|---|---|
| 1 | Step 2 max-w-6xl breakout | `74efba1` |
| 2 | AttachmentsSection (PDF/URL 별도 섹션) | `5d4a905` + `9c37810` |
| 3 | Lock UI (admin 잠금 + cascade banner) | `1c8c73b` |
| 4 | Drop 중복 fix (registerExternalContentHandler) | `1da4207` 의 부분 (canvas drop dedup) |
| 5 | 미팅 희망 일자 필드 (datetime-local + DB column + i18n) | `1da4207` 의 부분 (meeting_preferred_at) + `5cd1fc2` (types regen) |

추가 흡수: hotfix-3 task_01 의 `20260429144523_phase_3_1_hotfix_3_attachments.sql` = `ae7738d`. 이미 prod 적용됐으나 cherry-pick 으로 git history 와 prod 가 sync (idempotent 우려는 D.1 에서 `supabase migration list` 비교로 confirm).

---

## Dependency 분석

```
Group 1 (DB base) → Group 2 (ProjectBoard component) → Group 3 (admin + fix)
                                                        ↓
Group 4 (hotfix DB + breakout + AttachmentsSection) → Group 5 (wiring + Lock + types)
                                                                                    ↓
                                                  Group 6 (casts + RLS hardening) → Group 7 (Step 3 + meeting + drop dedup + types regen)
```

각 group 은 chronological order 로 cherry-pick 해야 dependency 가 만족된다. Out-of-order cherry-pick 시 conflict 폭주 위험.

---

## 예상 Conflict

main 의 마지막 commit (`5bfca60` — fix(r2): strip x-amz-checksum-* headers from presigned PUT URLs) 와 g-b-8-canvas 의 cherry-pick 대상 중 R2 presign 관련 commit 이 있는가?

→ 22 commits 중 R2 presign signature 자체를 수정한 commit 없음 (board / attachments / wizard 영역만). **Conflict 가능성 낮음**.

가능한 micro-conflict:
- `messages/ko.json`, `messages/en.json` — feature 마다 키 추가, accumulative — Group 4-7 사이 자체 conflict 는 chronological cherry-pick 으로 회피.
- `src/lib/supabase/database.types.ts` — auto-gen 파일, Group 5 (`6454bb3`) + Group 7 (`5cd1fc2`) 둘 다 regen. 두 commit 모두 적용 후 Wave D D.4 에서 다시 regen 하므로 안전.
- `src/app/[locale]/app/projects/new/actions.ts` — Group 1-7 의 여러 commits 가 수정. chronological 이면 자체 conflict 없음.
- `tsconfig.json` — `74efba1` 의 `allowImportingTsExtensions` 추가. main 과 충돌 가능성 — main 현재 옵션 확인 필요. (낮은 영향, 추가만)

---

## 실행 명령 (야기 confirm 후)

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
# 21 commits chronological
git cherry-pick 4325897 0180e1d 43ff013 d9b76d9 4665312 8ed637e e658424 db5ca75 779a441 6c3b17e ae7738d 098787a 74efba1 5d4a905 9c37810 1c8c73b 6454bb3 dedb499 b2788b2 1da4207 5cd1fc2
```

Conflict 발생 시 KICKOFF §Carry-over conflict resolution rule:
- Phase 4.x broken 영역 (post-submit detail page, F1-F6, /app/commission, workspace switcher placeholder) 과 겹치면 → **새 branch 빈 상태 우선** (즉 hotfix-3 변경 거절)
- 그 외 → `task_plan.md` 기록 + 야기 chat 보고 후 case-by-case

---

## Post cherry-pick verify (Step 4 결과로)

- `pnpm exec tsc --noEmit` exit 0
- `pnpm lint` exit 0 (warnings OK, errors 0)
- `git log --oneline g-b-9-phase-4` 에서 21 cherry-picked commits + main base 확인
- KICKOFF prereq §6 (tldraw integration / AttachmentsSection 렌더 / Lock UI 동작) — D.11 browser smoke 에서 verify (Wave A 단계 X)

---

## 야기 confirm 요청

이 plan 으로 진행하면:
- **GO**: 21 commits 그대로 cherry-pick. 0322fba 만 제외. → Step 4 진입.
- **수정**: 특정 commits 의 inclusion/exclusion 변경. → 야기가 chat 에 명시.

confirm 신호: 야기 chat 에 `cherry-pick GO` (또는 수정 instruction).

---

## Changelog

- **2026-04-30** — Builder 가 g-b-8-canvas 22 commits 분석 후 작성. KICKOFF §Carry-over 의 "5 항목" 표현은 5 working features 를 의미하나 실제 dependency 가 21 commits 에 펼쳐져 있어, broken `0322fba` 만 제외하고 21 commits cherry-pick 권장.
