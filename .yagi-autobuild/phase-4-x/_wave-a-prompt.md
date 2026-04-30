# Phase 4.x — Wave A Claude Code Prompt

> 야기가 Warp 의 새 Claude Code 세션에 paste 할 첫 prompt.
> Builder = Opus 4.6, Orchestrator = Sonnet 4.6, Executors = Sonnet 4.6 (no Haiku).

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

너는 **YAGI Studio Phase 4.x 의 Builder** 다. B-O-E (Builder-Orchestrator-Executor) 모드로 작동한다.

이번 prompt 의 scope = **Phase 4.x ENTRY + Wave A (3 task parallel)**.

## 우선 read (이 순서대로, FULL)

1. `C:\Users\yout4\yagi-studio\yagi-workshop\.yagi-autobuild\phase-4-x\KICKOFF.md`
2. `C:\Users\yout4\yagi-studio\yagi-workshop\.yagi-autobuild\phase-4-x\_decisions_locked.md`
3. `C:\Users\yout4\yagi-studio\yagi-workshop\.yagi-autobuild\PRODUCT-MASTER.md` §0, §1, §3, §4, §5
4. `C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md` (design system v1.0 token)

위 4개 다 read 후 작업 시작. KICKOFF + _decisions_locked.md 가 source of truth — 본 prompt 와 충돌 시 KICKOFF/locked 우선.

## 작업 sequence

### Step 1 — Pre-phase prerequisites verify (KICKOFF §Pre-phase prerequisites)

9 항목 각각 verify. 결과 `.yagi-autobuild\phase-4-x\_run.log` 에 기록:
```
<ISO> phase-4-x ENTRY prerequisites_check started
<ISO> ✅/❌ 1. main latest pull
<ISO> ✅/❌ 2. g-b-9-phase-4 branch (생성 전이면 다음 step 에서 생성)
... (9 항목 모두)
```

실패 항목 있으면 HALT 후 야기 chat 에 즉시 보고. 모두 ✅ (또는 acceptable state — branch 미생성은 step 2 에서 처리) 이면 step 2.

### Step 2 — Cherry-pick prep

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
git checkout main
git pull origin main --ff-only
git checkout -b g-b-9-phase-4
git log g-b-8-canvas --oneline > .yagi-autobuild\phase-4-x\_carry_over_candidates.log
```

`_carry_over_candidates.log` 분석 → KICKOFF §Carry-over from hotfix-3 의 5 항목 SHA 식별:

| # | 기능 | SHA 추출 hint |
|---|---|---|
| 1 | Step 2 max-w-6xl breakout | hotfix-3 task_03 (3a) — wizard container width |
| 2 | AttachmentsSection (PDF/URL 별도) | hotfix-3 task_03 (3b, 3c) — 가장 큰 commit 일 가능성 |
| 3 | Lock UI (admin 잠금 + cascade) | hotfix-3 task_04 — lock-button + locked-banner |
| 4 | Drop 중복 fix | (sub-fix) registerExternalContentHandler |
| 5 | 미팅 희망 일자 필드 | datetime-local + DB column + i18n |

추가 흡수: hotfix-3 task_01 의 DB migration `20260430010000_phase_3_1_hotfix_3_attachments.sql` — 이미 prod 적용됐으면 idempotent. cherry-pick 또는 re-apply check 둘 다 OK. Decision: **cherry-pick 권장** (prod 와 git history sync).

### Step 3 — Cherry-pick plan + 야기 confirm (HALT)

`.yagi-autobuild\phase-4-x\_cherry_pick_plan.md` 작성. 형식:

```markdown
# Cherry-pick plan (Phase 4.x ENTRY)

Source branch: g-b-8-canvas @ 0322fba
Target branch: g-b-9-phase-4 (base = main latest stable)

## 대상 commits (순서 보존)

1. <SHA> — feat: ... — "Step 2 max-w-6xl breakout"
2. <SHA> — feat: ... — "AttachmentsSection (PDF/URL 별도 섹션)"
3. <SHA> — feat: ... — "Lock UI"
4. <SHA> — fix: ... — "Drop 중복 fix"
5. <SHA> — feat: ... — "미팅 희망 일자 필드"
6. (optional) <SHA> — chore: ... — "DB migration 20260430010000" (re-apply check 또는 cherry-pick)

## Dependency 분석
... (각 commit 간 dependency)

## 예상 conflict
... (Phase 4.x 재설계 영역과 겹치는 부분)

## 실행 명령

git cherry-pick <SHA-1> <SHA-2> <SHA-3> <SHA-4> <SHA-5>
```

**HALT** — 야기 chat 에 `_cherry_pick_plan.md` 내용 보고. 야기 confirm "cherry-pick GO" 받은 후 Step 4.

### Step 4 — Cherry-pick 실행

야기 confirm 받은 후:

```powershell
git cherry-pick <SHA-1> <SHA-2> <SHA-3> <SHA-4> <SHA-5>
```

Conflict 발생 시 KICKOFF §Carry-over from hotfix-3 의 conflict resolution rule 적용:
- Phase 4.x broken 영역과 겹치는 conflict → 새 branch 의 빈 상태가 우선 (hotfix-3 변경 거절)
- 그 외 conflict → `task_plan.md` 에 기록 + 야기 chat 보고 후 case-by-case 결정

Cherry-pick 완료 후 `_cherry_pick_result.md` 작성:
- 5 commits 적용 SHA (g-b-9-phase-4 의 새 SHA)
- Conflict 발생 항목 + resolution
- tsc/lint/build 빠른 verify (`pnpm exec tsc --noEmit; pnpm lint`)

### Step 5 — Wave A spawn (3 teammate parallel, all Sonnet 4.6)

KICKOFF §Wave A 의 3 task 를 task_plan.md 에 entry 작성 후 B-O-E orchestrator 로 spawn:

```yaml
- id: task_01
  title: "DB schema migration (workspaces.kind + projects.twin_intent + projects.kind enum + project_licenses)"
  complexity: complex
  model: sonnet-4-6
  parallel_group: A
  spec_ref: "phase-4-x/KICKOFF.md §task_01"

- id: task_02
  title: "F1-F6 submit-broken precise fix + 진단 wiring 정리"
  complexity: complex
  model: sonnet-4-6
  parallel_group: A
  spec_ref: "phase-4-x/KICKOFF.md §task_02"

- id: task_03
  title: "Wizard Step 3 Twin intent 필드 + tooltip + locale (LOCKED §1: 3-radio)"
  complexity: simple
  model: sonnet-4-6
  parallel_group: A
  spec_ref: "phase-4-x/KICKOFF.md §task_03 + _decisions_locked.md §1"
```

각 teammate 에게 줄 instructions:
- KICKOFF §task_NN spec 의 Files in scope, Acceptance, Self-review focus 모두 따름
- task_03 은 _decisions_locked.md §1 (3-radio 확정) 명시
- Commit message convention: `feat(phase-4-x): <task scope> <summary>` 또는 `chore(phase-4-x): ...`
- 각 task 결과 `.yagi-autobuild\phase-4-x\result_NN.md` 작성
- tsc + lint barrier = lead Builder 가 합산 (각 teammate 는 자기 task 안에서만 verify)

### Step 6 — Wave A 완료 + 야기 review (HALT)

3 task 모두 commit clean 후:

1. lead Builder 가 tsc + lint + build (전체) verify
2. `.yagi-autobuild\phase-4-x\_wave_a_result.md` 작성:
   - 3 task 별 result 요약 (commit SHA, files changed, acceptance pass/fail)
   - Cherry-pick + Wave A 통합 verify (tsc/lint/build exit 0)
   - 발견된 issue + resolution
   - Wave B 진입 가능 여부
3. `_run.log` 에 기록:
```
<ISO> phase-4-x WAVE_A SHIPPED tasks=3 carryover=5 sha=<latest> tsc=ok lint=ok build=ok
```
4. **HALT** — 야기 chat 에 Wave A 결과 보고:
   - "Wave A SHIPPED. Wave B 진입 대기. Review 부탁."
   - `_wave_a_result.md` 핵심 요약 chat 에 paste

야기 review + 다음 wave prompt 받을 때까지 대기.

## 제약 (KICKOFF §Constraints + §Forbidden)

- L-001 PowerShell `&&` 금지 — `;` 또는 `; if ($?) {}`
- L-005 git inline `-m`; multi-line commit 시 `-F .git\COMMIT_MSG.txt`
- L-007 Supabase project = `jvamvbpxnztynsccvcmr`
- L-009 ASCII repo paths only
- L-010..L-014 design system v0.2.0 (achromatic + no shadow + font-suit + no italic + hairline)
- L-018 design system **v1.0 (yagi-design-system)** 도 read at boot (sage #71D083 단일 액센트, flora editorial dark)
- L-027 BROWSER_REQUIRED gate — Wave D 까지 push 절대 X
- Wave A 단계 = no K-05, no manual verify, no browser smoke (Wave D 작업)
- Forbidden: Phase 5+ 작업 (Artist workspace, Roster, Approval gate, Inbound routing, License surface, Reveal Layer)

## Output expectations

모든 산출물 `.yagi-autobuild\phase-4-x\` 안에 저장:
- `_run.log` (timestamps + sha)
- `_carry_over_candidates.log` (git log dump)
- `_cherry_pick_plan.md` (야기 confirm 전 보고)
- `_cherry_pick_result.md` (실행 후)
- `result_01.md`, `result_02.md`, `result_03.md` (각 task 결과)
- `_wave_a_result.md` (Wave A 통합 보고)
- `task_plan.md` (3 task entry)

각 commit message: `<type>(phase-4-x): <scope> <summary>`

## 시작

Step 1 부터 순서대로 실행. HALT point 마다 야기 chat 보고. 의문점 있으면 즉시 chat 으로 question.

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆

---

## 야기 paste 절차

1. Warp 새 탭 열기 (또는 현재 yagi-workshop 작업 탭)
2. `cd C:\Users\yout4\yagi-studio\yagi-workshop`
3. Claude Code 시작: `claude --teammate-mode in-process` (또는 평소 명령)
4. 위 ⬇⬇⬇ ~ ⬆⬆⬆ 사이 내용 그대로 paste
5. Builder 가 Step 1 부터 작업 시작
6. **첫 HALT** = Step 3 의 cherry-pick plan 보고 → 야기 chat 에 `_cherry_pick_plan.md` 내용 보여줌 → 야기 confirm "cherry-pick GO"
7. **두 번째 HALT** = Step 6 의 Wave A 결과 보고 → 야기 review 후 chat 으로 다음 wave prompt 요청
