# Phase 4.x — Auto-pilot Prompt (Wave A → B → C, STOP before Wave D)

> 야기가 자는 동안 Builder 가 자동 진행. Wave D 직전 STOP.
> ff-merge / push 절대 X (L-027 BROWSER_REQUIRED gate).
> 사고 발생 시 그 wave STOP, 다음 wave 진입 안 함.

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

**AUTO-PILOT MODE — Wave A 잔여 + Wave B + Wave C 자동 진행. Wave D 직전 STOP.**

야기는 자러 갔음. 다음 8시간 동안 chat HALT report 못 받음. 너는 다음 sequence 를 자동 진행하되, **사고 발생 시 그 wave 만 STOP** 하고 다음 wave 진입 X. 야기 일어나면 issue 검토.

## 우선 read (이 순서대로, FULL)

1. `.yagi-autobuild\phase-4-x\KICKOFF.md`
2. `.yagi-autobuild\phase-4-x\_decisions_locked.md`
3. `.yagi-autobuild\phase-4-x\_wave_a_halt.md` (현 상태)
4. `.yagi-autobuild\PRODUCT-MASTER.md` §0, §1, §3, §4, §5
5. `C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md`

## 야기 결정 사항 (chat 에서 lock)

- **4.1 = X** (lead Builder manual sequential rework, no spawn)
- **4.2 = B** (RLS 정책 SQL: owner_id → created_by + KICKOFF amendment)
- **4.3 = GO** (두 main-fork worktree git worktree remove + branch -D)
- **Wave D K-05 reviewer = 야기 일어난 후 다시 결정**. Auto-pilot 은 Wave D 진입 X.

## Wave 진행 순서

### Wave A 잔여 (lead Builder manual, no spawn)

#### Step A — Cleanup (4.3)
- task_02 worktree (worktree-agent-... task_02) `git worktree remove` + `git branch -D`
- task_03 worktree (worktree-agent-a7330b522a8c9710e) `git worktree remove` + `git branch -D`
- task_02 commit 9afef11 + task_03 commit 04b08c5 둘 다 REJECT (cherry-pick X)
- `_wave_a_halt.md` append: "REJECTED commits: 9afef11 (task_02 main-fork), 04b08c5 (task_03 main-fork). 17,608 line revert risk avoided."

#### Step B — BLOCKER 1 fix (4.2)
- task_01 migration 적용 여부 확인:
  - `_run.log` grep "task_01.*push" 또는 직접 supabase 상태 (`npx supabase db remote commit` 또는 `npx supabase migration list --linked` 활용)
- 적용된 경우: 새 migration `supabase/migrations/20260501000100_phase_4_x_license_rls_fix.sql` 생성:
  ```sql
  -- Fix project_licenses_select_owner: owner_id → created_by
  DROP POLICY IF EXISTS "project_licenses_select_owner" ON project_licenses;

  CREATE POLICY "project_licenses_select_owner" ON project_licenses
    FOR SELECT TO authenticated
    USING (
      project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      )
    );
  ```
  `npx supabase db push --linked` 적용 + verify
- 미적용인 경우: 기존 migration 파일 (`20260501000000_phase_4_x_workspace_kind_and_licenses.sql`) 직접 수정 (owner_id → created_by) 후 재적용
- KICKOFF.md §task_01 SQL 블록 amendment + Changelog 에 기록 (append-only):
  ```
  - **2026-05-01 Wave A blocker 1 fix** — project_licenses_select_owner 정책 SQL 의 projects.owner_id → projects.created_by 정정. 실제 컬럼 이름 일치.
  ```
- psql verify: created_by 기반 정책 정상 작동 확인 (test query)
- Commit: `fix(phase-4-x): task_01 BLOCKER 1 — project_licenses RLS owner_id → created_by`

#### Step C — task_02 + task_03 manual rework (4.1)

main worktree (g-b-9-phase-4) 에서 직접 sequential 작업.

**task_02 (F1-F6 submit fix)**:
- 진단 wiring 위치: `grep -rn "F1\|F2\|F3\|F4\|F5\|F6" src/` (특히 `src/app/[locale]/app/projects/new/`)
- Phase 3.1 wizard.tsx 의 boardDocument + tldraw + AttachmentsSection 구조 기준
- Common candidates 확인 순서:
  1. `seed_project_board_from_wizard` RPC signature 와 `submitProjectAction` 호출 mismatch (attached_pdfs, attached_urls, asset_index 새 field 전달 누락)
  2. zod validation 거절 (twin_intent enum 새 추가)
  3. RLS policy 거절 (workspaces.kind 또는 projects.kind 도입 영향)
  4. wizard state 의 attached_pdfs/urls 가 RPC 에 안 전달
- root cause 분석 + fix 적용 후 진단 wiring 제거 또는 production-grade error handling 으로 refactor
- Acceptance: KICKOFF §task_02 그대로
- 9afef11 의 logical 의도 (Reference url="" placeholder fix) 는 Phase 3.1 wizard 구조에 부적합 → SKIP
- Commit: `feat(phase-4-x): task_02 F1-F6 submit-broken precise fix + 진단 wiring 정리`
- `result_02.md` 작성

**task_03 (Twin intent 3-radio)**:
- main worktree 의 Phase 3.1 Step 3 기준 (boardDocument + meeting_preferred_at 가 이미 cherry-pick 됨)
- _decisions_locked.md §1 (3-radio: specific_in_mind / undecided / no_twin)
- 04b08c5 의 logical 의도 (3-radio + tooltip + i18n + zod) 그대로 재적용 — base 가 Phase 3.1 wizard 라 file path / structure 매핑 manual
- Files: KICKOFF §task_03 Files in scope
- i18n: KICKOFF §task_03 i18n 키 그대로
- Commit: `feat(phase-4-x): task_03 wizard Step 3 Twin intent 3-radio + tooltip + ko/en`
- `result_03.md` 작성

#### Step D — Wave A 통합 verify

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

3개 모두 exit 0 → `_wave_a_result.md` 작성:
- 3 task 별 result 요약 (commit SHA, files changed, acceptance pass/fail)
- BLOCKER 1 fix 적용 결과
- Cleanup 결과 (REJECTED commits + worktree removed)
- Cherry-pick + Wave A 통합 verify (tsc/lint/build exit 0)
- Wave B 진입 가능 여부 confirm

`_run.log` 기록:
```
<ISO> phase-4-x WAVE_A SHIPPED tasks=3 carryover=21 rejected=2 sha=<latest> tsc=ok lint=ok build=ok
```

**사고 발생 시 (Step A-D 어디든)**: 그 step 에서 STOP. `_wave_a_halt.md` append. Wave B 진입 X. `_run.log` 에 `phase-4-x WAVE_A HALT step=<X> reason=<...>` 기록.

---

### Wave B — post-submit detail page 재설계 (sequential, lead Builder)

Wave A SHIPPED 후 자동 진입. KICKOFF §task_04 spec 그대로.

**Files in scope** (KICKOFF 그대로):
- `src/app/[locale]/app/projects/[id]/page.tsx`
- `src/components/project-detail/status-timeline.tsx` (NEW)
- `src/components/project-detail/hero-card.tsx` (NEW)
- `src/components/project-detail/info-rail.tsx` (NEW)
- `src/components/project-detail/tabs.tsx` (NEW)
- `src/components/project-detail/board-tab.tsx` (NEW)
- `src/components/project-detail/progress-tab.tsx` (NEW)
- `src/components/project-detail/placeholder-tab.tsx` (NEW)
- `messages/ko.json` + `messages/en.json`

**Layout**: 1280 max-width, 1:1 hero card (720×720), right rail (360), status timeline 5단계, 4 tabs (보드/진행 active, 코멘트/결과물 disabled).

**Status mapping**:
- 검토: status='in_review' or 'draft'
- 라우팅: status='routing'
- 진행: status='in_progress'
- 시안: status='approval_pending' (Phase 5+, slot 만)
- 납품: status='delivered'

**Design system v1.0 compliance**:
- Pretendard Variable, lh 1.18 / 1.37, ls -0.01em / 0
- 무채색 + sage `#71D083` 단일 액센트 (status pill, current step in timeline)
- Radius 24 (cards), 999 (pills), zero shadow
- Border subtle rgba(255,255,255,0.11)

**Self-review focus** (CRITICAL — Wave D 에서 manual verify):
- Detail page every tab → project-scope authorization (project.created_by === auth.uid() OR yagi_admin role)
  - **CAUTION**: BLOCKER 1 에서 owner_id → created_by 확정. detail page authorization 도 created_by 사용
- 코멘트/결과물 tab disabled → placeholder text 만 렌더, 어떤 server data 도 fetch X
- info-rail → project_licenses 정보가 client 에 절대 노출 X (Phase 4 admin only)

**Sub-task breakdown** (10 commits 정도 권장):
1. `chore(phase-4-x): task_04 (1/10) — project-detail 디렉토리 + placeholder-tab.tsx`
2. `feat(phase-4-x): task_04 (2/10) — status-timeline.tsx (5단계 sage active)`
3. `feat(phase-4-x): task_04 (3/10) — hero-card.tsx 1:1 cinematic 720x720`
4. `feat(phase-4-x): task_04 (4/10) — info-rail.tsx 5 fields ink.tertiary`
5. `feat(phase-4-x): task_04 (5/10) — tabs.tsx 4 tabs nav (disabled UX)`
6. `feat(phase-4-x): task_04 (6/10) — board-tab.tsx (ProjectBoard brief + AttachmentsSection)`
7. `feat(phase-4-x): task_04 (7/10) — progress-tab.tsx (status_history)`
8. `feat(phase-4-x): task_04 (8/10) — page.tsx 통합 + submit-직후 banner`
9. `chore(phase-4-x): task_04 (9/10) — i18n ko/en 신규 키`
10. `chore(phase-4-x): task_04 (10/10) — types regen + cleanup`

각 sub-task 별 tsc 빠른 verify 가능.

#### Step D-B — Wave B 통합 verify
- tsc + lint + build exit 0
- `_wave_b_result.md` 작성
- `_run.log`: `phase-4-x WAVE_B SHIPPED tasks=1 sub_commits=10 sha=<latest> tsc=ok lint=ok build=ok`

**사고 발생 시**: Wave B STOP. Wave C 진입 X.

---

### Wave C — Brand sidebar + workspace switcher + license stub (lead Builder, 3 sub-task sequential)

Wave B SHIPPED 후 자동 진입. KICKOFF §task_05 + §task_06 + §task_07 + _decisions_locked.md §2-§4.

**중요**: lead Builder 직접 작업 (no spawn). worktree isolation 사고 재발 방지.

**task_05 (Brand sidebar + commission redirect + dashboard)** — _decisions_locked.md §4 (옵션 B 채택):
- `/app/commission` → `/app/projects` redirect (`next.config.ts` 또는 `middleware.ts`)
- Brand sidebar 5 항목 (대시보드 + 프로젝트 active / 추천 Artist + 청구 disabled / 라이선스 hidden / 팀-권한 + 설정 active)
- `/app/dashboard` 별도 page (count cards 3 + 최근 RFP 5)
- `/app` → `/app/dashboard` redirect
- _decisions_locked.md §4 의 i18n 키 그대로
- Files in scope: KICKOFF §task_05 + _decisions_locked.md §4 amendment
- Self-review: open redirect 방지 (next= 무시)
- Commits: 3-4개 sub-task

**task_06 (workspace switcher full multi-workspace)** — _decisions_locked.md §2 (cookie-based) + §3 (disabled "+ 추가"):
- `src/components/sidebar/workspace-switcher.tsx` (NEW)
- `src/lib/workspace/active.ts` (NEW — resolveActiveWorkspace)
- Cookie key: `yagi_active_workspace` (uuid)
- Server component 가 매번 cookie + workspace_members 검증
- Cookie tampering 시 fallback (first member workspace)
- Dropdown groups: Brands / Artists (Phase 5+) / YAGI Admin
- "+ 새 workspace 추가" disabled tooltip "Phase 5 부터 가능"
- i18n: KICKOFF §task_06 그대로
- Files: KICKOFF §task_06 그대로
- Self-review CRITICAL: cookie tampering, multi-workspace SELECT scope (Wave D manual verify 대상)
- Commits: 4-5개 sub-task

**task_07 (license stub admin sidebar hidden)** — Q-103 옵션 A within B:
- /app/admin/* sidebar 의 라이선스 항목 hidden (Phase 4 노출 X)
- /app/admin/projects/[id] 의 라이선스 섹션 미표시
- /app/admin/licenses route 직접 접근 → 404 또는 redirect
- Files: KICKOFF §task_07
- 빠른 task (1-2 commit)

#### Step D-C — Wave C 통합 verify
- tsc + lint + build exit 0
- `_wave_c_result.md` 작성
- `_run.log`: `phase-4-x WAVE_C SHIPPED tasks=3 sha=<latest> tsc=ok lint=ok build=ok`

**사고 발생 시**: Wave C STOP. Wave D 진입 X.

---

### STOP — Wave D 직전 (auto-pilot 끝)

Wave C SHIPPED 후 즉시 STOP. Wave D 진입 X.

`.yagi-autobuild\phase-4-x\_autopilot_summary.md` 작성:
- Wave A SHIPPED 결과 요약 (tasks, commits, BLOCKER 1 fix)
- Wave B SHIPPED 결과 요약 (sub-commits 10)
- Wave C SHIPPED 결과 요약 (3 task)
- Total commit count + final SHA on g-b-9-phase-4
- tsc + lint + build status
- 사고 발생 wave 있으면 명시 + 어느 step 에서 STOP 했는지
- Wave D 진입 시 야기 결정 필요 사항:
  - K-05 reviewer 옵션 (Codex 단독 / Hybrid / Reviewer Fallback Layer 1 = Opus 4.7 self-review)
  - Manual SQL verify 6 항목 (D.9 Layer 2)
  - This-chat second-opinion (D.10)
  - Browser smoke 14 section
  - ff-merge to main + push (push 절대 자동 X)

`_run.log`:
```
<ISO> phase-4-x AUTOPILOT_END_BEFORE_WAVE_D waves_shipped=A,B,C sha=<latest> tsc=ok lint=ok build=ok
```

**push 절대 X**. main 에 ff-merge 절대 X. g-b-9-phase-4 에만 commit. L-027 BROWSER_REQUIRED gate 그대로.

---

## 사고 처리 protocol (Best-effort + STOP per wave)

각 wave 안에서 발견된 issue:
- **MINOR** (lint warning, type cast 추가, i18n 누락 등) → Best-effort 진행 + `_hold/issues_<wave>.md` 에 기록 + 다음 sub-task 계속
- **MAJOR** (tsc error, build fail, 잘못된 SQL, RLS 우려) → 그 wave STOP, 다음 wave 진입 X, `_wave_<x>_halt.md` 작성, `_run.log` 에 HALT 기록

판단 기준:
- tsc 또는 build exit ≠ 0 → MAJOR
- RLS / auth / payment 영역에서 spec drift 발견 → MAJOR
- task_01 의 owner_id 같은 spec drift 발견 → MAJOR
- 단순 lint warning, console.log 누락, type cast 추가 → MINOR

## 제약

- L-001 PowerShell `&&` 금지
- L-005 git inline `-m` 또는 `-F .git\COMMIT_MSG.txt`
- L-008 pnpm install in main worktree after ff-merge 는 Wave D 작업 (auto-pilot 에선 X)
- L-009 ASCII repo paths only
- L-010..L-014 design system v0.2.0
- L-018 design system v1.0 (sage #71D083 단일)
- **L-027 BROWSER_REQUIRED gate** — push 절대 X
- Forbidden: Phase 5+ 작업, ProfileRole 타입 narrowing, status machine 수정

## Output expectations

`.yagi-autobuild\phase-4-x\` 안에:
- `_run.log` (timestamps + sha 누적)
- `_wave_a_result.md` (Wave A SHIPPED — Step A-D 통합)
- `_wave_b_result.md`
- `_wave_c_result.md`
- `_autopilot_summary.md` (final, Wave D 진입 전 야기 일어났을 때 read 용)
- `_wave_<x>_halt.md` (사고 시)
- `_hold/issues_<wave>.md` (MINOR 이슈 누적)
- `result_NN.md` (각 task 별)

## 시작

Wave A 잔여 Step A 부터 즉시 시작. 사고 발생 시 그 wave STOP. Wave D 직전 STOP.

야기 일어났을 때 첫 read = `_autopilot_summary.md`.

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆
