# Phase 5 Lessons (Briefing Canvas + Detail Page Redesign)

> Phase 5 = Briefing Canvas + Detail page redesign + 의뢰자 협업 surface.
> Sprint period: 2026-05-04 estimated 3 weeks → actual ~5 weeks (Wave A
> 2026-04-22 ~ ff-merge 2026-05-05 with hotfix-1 + hotfix-2 inline).
> Final ship commits: c49f0f1 (hotfix-2 to phase branch) + fc7c754 (docs
> consolidation to main).

## TL;DR — top 5 lessons

1. **Estimate honesty** — 3주 sprint 가 5주 됨. 다음 phase = 4-5주 정직
   estimate. Wave 분해 + ff-merge gate 분리 효과 확인됨 (history 가독성
   상승, rollback 가능성 보존).
2. **K-05 Tier 분류 + scale-aware rule 효과적** — HIGH-A/B inline / MED-B/C
   FU / LOW ignore 패턴이 < 100 user state 에서 균형 잡힘. 단 HIGH 가
   browser smoke 까지 안 잡혀서 production 회귀로 이어진 경우 0건 (RLS
   42501 incident 도 dev runtime 에서 잡힘).
3. **Browser smoke = K-06 직전 단계로 binding 화** (Phase 5 Wave C 의 K-06
   protocol 신설로 codify). Hotfix 2 회 발생의 root cause = visual review
   가 wave end 에 없었음. K-06 자동 적용 (Hotfix-2) 으로 6개 design
   finding 사전 catch 확인.
4. **Verify-before-cite 룰 정착** — 새 chat 의 "80% 정확 + 20% 환각" 패턴
   여러 번 관찰 (Wave C drafting "RecallButton 환각", HF1.6 "보드 tab
   회귀 진단" 등). Filesystem grep 으로 cite 전 verify 가 표준화됨.
5. **RLS multi-role audit (L-049) binding 화** — Wave C K-05 LOOP 1 이
   CLEAN 인데 browser smoke 에서 42501 발견 = K-05 가 yagi_admin 관점만
   review 한 결과. 4-perspective walk (client / ws_admin / yagi_admin /
   different-user) 강제로 고정.

## Wave-by-wave

### Wave A — Foundation (briefing_documents schema + migration + interested_in_twin)

**Estimate**: 5d → **Actual**: ~7d. K-05 LOOP 1 + LOOP 2 모두 진행.

**Findings**:
- briefing_documents INSERT RLS 가 status='draft' 만 허용 (Wave A sub_5
  LOOP 1 F2). Wave C 의 in_review 자료 추가 caller (MaterialAppendModal)
  가 forbidden 으로 차단 → FU-Phase5-16 으로 deferred (현재 미해결, Phase
  6 또는 hotfix-3 후보).
- briefing_documents UPDATE RLS 도 24h 윈도우 + status='draft' 동시 적용.

**Lessons**:
- Migration apply 전 prod data 확인 (`SELECT count`) 패턴이 destructive
  accident 방지. L-019 binding.
- `database.types.ts` regen 누락 시 type cast `as any` 우회. 이거 Phase 5
  내내 여러 번. Phase 6 시작 시 generated types 한 번 regen 권장.

### Wave B — Briefing Canvas (Stage 1/2/3)

**Estimate**: 7-10d → **Actual**: ~14d. hotfix-6 까지 (sub_5, hotfix6,
task_04v3, task_06v3 각각 K-05 review 진행).

**Findings**:
- task_04v3 의 `ensureBriefingDraftProject` defensive soft-delete 패턴 도
  입. yagi_admin 외 user 의 deleted_at write 차단되는 것을 K-05 가 못
  잡음 → Wave C browser smoke 에서 42501 발견 → 인 라인 fix
  (FU-Phase5-17, L-048 codify). 이 패턴이 후에 Hotfix-2 의
  deleteProjectAction 에서도 동일하게 사용됨.
- Korean IME composition 이 zod validation 'onBlur' mode 와 충돌 → form
  silent reject. 'onSubmit' mode 로 fix.
- task_06v3 (Step 3 confirm) 의 transition_project_status RPC actor_role
  resolution 이 client/yagi_admin 동시 보유 user 에서 yagi_admin 우선
  순위로 갔던 버그. creator-first role resolution 로 fix
  (`20260504200001` migration).

**Lessons**:
- `purpose` text[] column 이 Wave B hotfix-4 에서 *제거* 됐지만 INSERT 본
  문에는 남아있어서 schema mismatch. 후속 hotfix-5 에서 정리. Schema 변경
  시 *모든* call site grep + remove 필수.
- Wave B 의 hotfix 6회 = Wave 자체 분해가 너무 큼. Phase 6 부터는 hotfix
  횟수 budget 명시 (예: max 2회 inline, 그 이상은 별도 hotfix wave).

### Wave B.5 — Client Recall (recall round-trip + 자동 wipe dangling drafts)

**Estimate**: 1.5d → **Actual**: ~2d. Branch g-b-10-phase-5 에 합쳐짐.

**Findings**:
- Recall 시 dangling alive drafts 자동 wipe (옵션 A). hard-delete 가
  아닌 soft-delete 로 처리.
- RecallButton (yagi_admin lock toggle) 만 구현; client-facing
  recall-to-edit component 는 미구현 (FU 로 deferred). 후에 Hotfix-1 의
  Status 카드 dual CTA secondary 로 흡수.

**Lessons**:
- Wave B.5 의 spec 와 builder 결과 사이 mismatch. "RecallButton 환각" 이
  새 chat 의 80/20 패턴 사례. Phase 6 부터 verify-before-cite 룰 강제.

### Wave C — Detail page redesign (5-tab + status timeline + CTA matrix)

**Estimate**: 5-7d → **Actual**: ~8d (K-05 LOOP 1 CLEAN, browser smoke
에서 RLS 42501 + design issue 9개 발견 → Hotfix-1 + Hotfix-2 분리).

**Findings**:
- 5-tab 구조 (현황 / 브리프 / 보드 / 코멘트 / 결과물) 정상 ship.
- HYBRID dispatch (lead solo C_1 → parallel C_2/C_4/C_5 → lead C_3 → lead
  C_6) 가 7-commit 동안 안정적 작동.
- K-05 LOOP 1 CLEAN (0 findings, 63,472 tokens, Tier 2 medium) — 단 browser
  smoke 에서 (1) RLS 42501 (2) design hierarchy 9 issue 발견. 즉 K-05 만
  으로는 *충분 조건* 아님. **Browser smoke + K-06 binding 화** 가 결론.
- 7 FUs (Phase5-10~16) deferred — 모두 ff-merge blocker 아님.

**Lessons**:
- Wave C 가 main 으로 ff-merge 전에 hotfix-1/-2 발생. 즉 Wave 의 ff-merge
  gate 가 *too lenient* 했음. Phase 6 부터 *visual smoke + K-06* 둘 다
  pass 후 ff-merge 권장.
- HYBRID dispatch 자체는 안정적. parallel 분기 안에 cross-task dependency
  명시 (K_3 의 RecallButton 위치가 K_1 의 status 카드 결과 의존 같은
  케이스) 가 mergeability 보장.

### Hotfix-1 — Detail page UI polish (status 카드 + timeline + CTA + date format + board 회귀 + tab UX)

**Estimate**: 1.5d → **Actual**: ~2d. Browser smoke 후 야기 visual
review 9 issue 발견 → 6 sub-task (HF1.0~1.6) parallel ship.

**Findings**:
- HF1_2 + HF1_5 worktrees stale-base 문제 발생 (PHASE_BASE 가
  `ac628c3` = Phase 4.x tip 으로 capture). Hand-merge 로 recovery (~30
  min). → **L-051** codify.
- HF1.6 board 회귀 = `boardRow.source IN ('wizard_seed', 'admin_init')`
  filter 가 'migrated' source 제외. `hasBoardRow = !!boardRow` 로 fix.
  Phase 4.x-internal code gap 인데 Wave C C_5 가 inherit, never tested
  with migrated boards.
- K-06 protocol 신설 (manual 1회 — 야기 + Web Claude). Hotfix-2 부터 자동
  Opus subagent 적용.

**Lessons**:
- 야기 visual review 가 hotfix wave 의 trigger 가 되는 패턴 = 매번
  반복됨. K-06 자동화 = 이 패턴의 사전 대응.
- 6-sub-task parallel dispatch 가 budget 안 (1.5d) 에 들어옴. Wave 분해의
  greenfield 검증.

### Hotfix-2 — Layout consolidation + 의뢰 삭제

**Estimate**: 1.5d → **Actual**: ~1.5d (K-05 + K-06 자동 적용).

**Findings**:
- L2 (StatusTimeline) + L3 (HeroCard + InfoRail) 가 5-tab 안 status tab
  의 콘텐츠와 redundant 했음. `page.tsx` 의 redirect 정리 + StatusTab
  내부 grid-cols-12 layout 으로 통합 (좌 timeline / 메인 카드 / 우
  InfoRail).
- `deleteProjectAction` 신규 server action — status IN ('submitted',
  'in_review') + isOwner gate. service-role client (L-048) 사용. K-05
  가 TOCTOU 0-row UPDATE silent success 잡음 → `select("id")` length
  check 로 inline fix.
- **K-06 자동 첫 적용** — fresh Opus subagent 가 4 MED + 2 LOW finding
  반환 (FU-Phase5-27~32). HIGH/BLOCK 0. K-06 protocol 검증 PASS.

**Lessons**:
- K-05 + K-06 parallel 적용으로 wave end 시간 추가 ~10-15min 만. Phase 6
  부터 표준화.
- "Layout 회귀" 가 Wave C 시점에 발견 안 된 이유 = 야기가 visual review
  를 ff-merge 후에야 진행. 이건 K-06 자동화로 catch 가능 (단 K-06 가 미
  래 wave 의 시각 의도와 일치하는 reference 가 있어야 함 — PRODUCT-MASTER
  §C.x 가 그 역할).

## Patterns That Worked

1. **Wave end gate = K-05 + K-06 + browser smoke + ff-merge** (4-step). 다음
   phase 표준.
2. **HYBRID dispatch** — lead solo base + parallel sub-tasks. 6-task 까지
   안정적. 7+ 는 검증 안 됨.
3. **Scale-aware rule** — HIGH inline / MED FU / LOW ignore. < 100 user
   state 에서 검증.
4. **Service-role client for `deleted_at`** — L-048 이 Hotfix-1 (defensive
   soft-delete) + Hotfix-2 (deleteProjectAction) 둘 다 적용. 패턴 안정성
   확인.
5. **Diagnosis-first (L-045)** — HF1.6 보드 회귀, RLS 42501 진단 등에서
   3-4 hypothesis walk 후 fix 가 빠른 recovery.

## Patterns That Need Work

1. **K-05 가 RLS 환경 의존성 못 잡음** — yagi_admin 관점만 review 가
   default. L-049 의 4-perspective walk 강제로 fix 함.
2. **Wave hotfix 횟수 polynomial growth** — Wave B 안에서 hotfix 6회
   발생. Wave 분해가 너무 컸거나 spec 가 미진함. Phase 6 부터 wave 당
   max 2 inline hotfix 권장.
3. **Stale-base parallel worktree** — PHASE_BASE capture 가 stale 가능.
   L-051 fail-fast 패턴으로 binding 화.
4. **Spec ↔ builder 결과 mismatch** — "RecallButton 환각", "HF1.6 진단
   환각" 같은 case. verify-before-cite 룰 강화.

## FU 누적 status (Phase 5 종료 시점)

총 12개 deferred (Phase5-16 ~ -32 중 일부 inline 처리, 나머지 Phase 6+
수렴):

| FU | Status | 설명 |
|---|---|---|
| Phase5-10~15 | Deferred | Wave C 의 minor polish |
| Phase5-16 | Deferred | briefing_documents INSERT RLS in_review 허용 |
| Phase5-17 | **APPLIED** (Hotfix-1) | defensive soft-delete service-role |
| Phase5-18~22 | Deferred | Hotfix-1 의 minor polish |
| Phase5-23~26 | Deferred | Hotfix-2 의 30일 cleanup / mobile / dropdown polish |
| Phase5-27~32 | Deferred (K-06 finding) | Top status pill / InfoRail double-aside / gap rhythm 등 |

Phase 6 entry 시 FU 들 일괄 review — Phase 6 의 Artist surface 작업과
*시너지 있는 것* 만 우선 흡수.

## Quote (chat 산출)

> "기획 / 디자인 감각 review 가 지금 없어서 컴포넌트 위치 / 블록이
> 사용자 친화적인지가 좀 안 잡히는 것 같음."
> — Hotfix-1 후 K-06 protocol 신설의 origin (chat 2026-05-04).

> "라우팅이 뭐지? — 사용자는 모름."
> — PRODUCT-MASTER §M 워딩 룰 lock 의 origin (chat 2026-05-05).

> "이러한 오류 다시는 없게 해줘."
> — RLS 42501 incident 후 L-048/049/050 codify 의 origin
> (chat 2026-05-04).

---

*Phase 5 lessons.md v1.0 lock (2026-05-05). Phase 6 KICKOFF 작성 진입
prerequisite 만족.*
