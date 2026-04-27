# YAGI Workshop — Gate Autopilot Protocol

> **Purpose:** Phase 내부의 Gate 간 자동 전이. `AUTOPILOT.md`가 Phase 간 전이를 다룬다면 이 문서는 **Gate 간 전이 + Gate 완료 자동 처리**를 다룬다.
> **Scope:** Expedited phases (ADR-005) — Phase 2.5처럼 1주 sprint 안에 G1-G8 진행되는 구조. Non-expedited phase는 해당 없음.
> **Boundary:** AUTOPILOT과 동일. Gate Autopilot은 **Gate 사이 dead time 제거**가 목표. Gate 내부 safety는 Codex K-05 + CODEX_TRIAGE.md가 담당 (pre-apply stop은 post-G2 결정으로 제거됨).
> **Design decision:** G2 retrospective 개선안 #1 (권장 1 — "Gate 자동 전이 + Already-answered clarifications 캐시").

---

## The chain (Gate-level)

```
[G(N) SHIPPED: migrations applied, Codex CLEAN, commits pushed, Telegram sent]
        │
        ▼
[Gate Autopilot: read G(N+1)-ENTRY-DECISION-PACKAGE.md]
        │
        ▼
[Decision cache scan — DECISIONS_CACHE.md에서 Q 매칭]
        │
        ▼
[Cache HIT → 자동 적용 | Cache MISS → batch Telegram]
        │
        ▼
[야기 batch 답변 (MISS만) → Builder가 cache에 append]
        │
        ▼
[Builder가 G(N+1) 첫 task 착수 — migration이면 Codex K-05 → TRIAGE → auto-apply]
```

Kill-switch 차이:
- **AUTOPILOT (Phase-level)**: env-gate halts chain between phases
- **Gate Autopilot (Gate-level)**: 야기 개입 없음이 default. Escalation은 TRIAGE 벗어난 Codex finding / SPEC drift / 야기 abort 시에만.

---

## Gate completion protocol (runs at END of every Gate's Builder work)

Gate "SHIPPED" 선언 전에 Builder가 반드시 확인:

### Step 1: Gate scope 100% 완료

- [ ] SPEC 상의 Gate task 전부 완료 (명시 없는 deviation 있으면 G(N)_SUMMARY에 기록)
- [ ] `pnpm build` clean
- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm lint` clean
- [ ] Migration 있었다면: `mcp get_advisors(security)` + `mcp get_advisors(performance)` no new issues

### Step 2: Gate summary 작성

`.yagi-autobuild/phase-{N.N}/G{K}_SUMMARY.md` 작성:

- Gate scope 완료 status (✅ / ⚠️ deviations / ❌ skipped)
- 이 gate에서 확립된 pattern (다음 gate에서 재사용할 것)
- Codex review 결과 (CLEAN / MEDIUM_ONLY + filtered / HIGH + fixed)
- FOLLOWUPS append 목록 (있는 경우)
- Decision cache append 항목 (Q-{id} 목록)
- 다음 Gate 진입 전 결정 필요한 open question (있는 경우)

Phase 2.5 G1/G2는 retrospective와 합쳐진 형태로 이미 존재 → G3부터 이 규격 적용.

### Step 3: Telegram completion message

```
✅ Phase {N.N} G{K} SHIPPED

Scope: {task_completed} / {task_total}
Codex: {verdict}
Deferred: {FU_count} items to FOLLOWUPS
Cache appended: {cache_append_count} new decisions
Duration: {hh:mm}

→ Gate Autopilot: G{K+1} entry 준비 중...
```

### Step 4: G(N+1) ENTRY-DECISION-PACKAGE 로드

Builder가 `.yagi-autobuild/phase-{N.N}/G{K+1}-ENTRY-DECISION-PACKAGE.md` 읽기.

**Package 존재 여부 체크:**

- 파일 존재 → Step 5로
- 파일 없음 → halt + Telegram:
  ```
  🛑 Gate Autopilot halted — G{K+1} Entry Decision Package 없음.
  .yagi-autobuild/phase-{N.N}/G{K+1}-ENTRY-DECISION-PACKAGE.md 를
  web Claude가 pre-author해야 함. 야기가 web Claude 소환 후 package
  작성되면 "continue gate {K+1}" 으로 resume.
  ```

### Step 5: Decision cache scan

G(N+1) package의 "Open questions" / "Decisions needed" 섹션에서 결정 필요 항목 추출.

각 항목에 대해 `.yagi-autobuild/DECISIONS_CACHE.md` 검색:

- **Cache HIT** (유사 질문 이미 답변됨, confidence ≥ HIGH) → Builder가 cache 응답 적용 + package에 `[auto-resolved via cache: Q-{id}]` 마크
- **Cache HIT but MED confidence** → Builder가 야기에게 "cache suggests X — confirm?" 한 줄 확인만 요청
- **Cache MISS** → 다음 Step에서 batch clarification에 포함

Cache matching 기준:
- Exact keyword 매칭 (e.g. "RLS public SELECT pattern")
- Semantic 유사 (e.g. "admin audit column binding" → Q-003 "admin INSERT policy audit binding")
- 모호하면 MISS로 처리 (cache 잘못 적용이 야기에게 다시 물어보는 것보다 리스크 높음)

**Confidence threshold:** 90% 미만이면 MISS. 오매칭 > 다시 묻기.

### Step 6: Clarification batch (MISS + MED confirm만)

Cache MISS + MED confirm 질문 전부 하나의 Telegram 메시지로:

```
🟡 Phase {N.N} G{K+1} entry — 결정 필요 {count}건

{Q-1: 한 줄 요약}
  선택지: A / B / C
  기본 추천: A (근거: ...)

{Q-2: cache suggests Z — 이 맥락에도 적용 OK?}
  답: yes / no

답변 포맷: "G{K+1}: Q1=A, Q2=yes, Q3=..."
```

**야기가 batch 답변 → Builder가 다음 실행:**

1. 답변 받은 Q-A 쌍을 DECISIONS_CACHE.md에 append (새 Q-id 할당)
2. G(N+1) package에 결정 반영 (수정 commit)
3. G(N+1) 첫 작업 착수

### Step 7: G(N+1) 착수 — Codex가 safety layer

Migration 작업이면 Codex K-05 → TRIAGE → auto-apply. 야기 사전 승인 없음.

여전히 halt하는 경우 (CODEX_TRIAGE.md 기준):
- Taxonomy mismatch
- HIGH-B / HIGH-C / MED-C / LOW-C
- 2nd consecutive auto-fix cycle failure
- SPEC drift 발견
- 야기 Telegram `abort` / `hold`

---

## ENTRY-DECISION-PACKAGE 작성 책임

### 누가

- **Web Claude** (이 문서를 포함한 모든 decision package 작성의 기본 author)
- 급할 때 Builder가 self-author 가능하나 web Claude review 권장

### 언제

- Gate K가 ship되면 바로 다음 (G(K+1) package 작성 = 다음 gate 진입 전제조건)
- 이상적으로는 Gate K 진행 중 web Claude가 병렬로 G(K+1) package 초안 작성
- Phase 2.5는 이미 G3까지 pre-authored 됨 (Phase entry 시점에 web Claude가 일괄 작성한 좋은 선례)

### 무엇을 포함

필수 섹션:
- **Scope**: 이 Gate가 다룰 범위 (SPEC 참조)
- **Tasks**: Builder가 실행할 subtask 목록
- **Decisions needed**: 야기 결정 필요 항목 (cache 매칭 대상)
- **Pre-built infra**: 이미 작성되어 있는 파일 리스트
- **Success criteria**: Ship 판단 기준

권장 섹션:
- **Risk scan**: 이 Gate에서 예상되는 HIGH/MED 유형 (Codex 프롬프트에 Focus Areas로 전달)
- **ERRCODE map 추가분**: Gate별 신규 ERRCODE 매핑 (CODEX_TRIAGE.md Appendix와 sync)

---

## Failure modes

### G(N+1) package 없음

Builder가 스스로 작성하지 말 것. 야기에게 web Claude 소환 요청.
Gate 간 dead time > Gate 중 잘못된 scope로 작업.

### Cache 오매칭

Cache에 "유사" 질문 있다고 적용했는데 context 달라서 잘못된 결정 → Builder가 의심되면 MISS로 처리. 나중에 야기가 "이 답변 이 상황엔 적용 안 됨" 피드백 주면 해당 entry의 "Applies when" narrow + Confidence 하향.

### 야기 batch 답변 지연

Telegram 답변 24h 무응답 → Builder는 Gate 진입 대기 유지, 다른 병렬 작업 (FOLLOWUPS cleanup, tsc fix, docs) 으로 전환.

### Gate 도중 SPEC drift 발견

Gate 진행 중에 "이 task가 사실 SPEC 이후 조항과 충돌함" 발견 → 즉시 stop + Telegram 야기. SPEC amend commit이 먼저, Gate 재개는 그 후. (이건 Codex가 잡을 수 없는 product-scope 이슈이므로 Codex CLEAN auto-apply 정책의 예외.)

### Codex CLEAN 후 post-apply에서 문제 발견

`mcp get_advisors` 경고 또는 smoke test 실패 → Builder가 즉시 rollback 검토 + 야기 Telegram. "CLEAN이었으니까" 방치 금지.

---

## 관찰 (G1/G2 실전 데이터 기반)

- **G1/G2에서 야기 개입 횟수:** Gate당 평균 3-4회 (pre-apply stop, Codex HIGH 판단, env-check, G(N+1) entry 결정)
- **이 문서 + DECISIONS_CACHE.md + pre-apply stop 제거 후 예상:** Gate당 평균 0-1회 (Codex HIGH-B 등 예외 경로, 또는 야기가 자발적 확인 원할 때만)
- **자동화 효과 검증:** G3가 첫 실전 케이스. G3 retrospective에서 실제 개입 횟수 측정 + 이 문서 조정.

---

## 이 문서 갱신 트리거

- 새 gate failure mode 발견 → Failure modes 섹션 append
- ENTRY-DECISION-PACKAGE 템플릿 진화 → "무엇을 포함" 섹션 업데이트
- Cache 오매칭 사례 발생 → Confidence threshold 조정 검토
- Post-apply 이슈 패턴 발견 → "Codex CLEAN 후" failure mode 구체화

**Owner:** Web Claude + 야기 (Builder가 제안 append 가능, web Claude가 sanity check)


---

## G6-specific entry requirement (2026-04-24 Phase 2.6 v3.1 amendment)

Phase 2.5 G6 entry has an **additional pre-flight check** beyond the standard Step 4 package-load and Step 5 cache-scan flow.

### Why

Phase 2.6 G2 (scope selector) and Phase 2.5 G6 (`/u/[handle]` edit affordance) both consume `useUserScopes()` hook. Phase 2.6 SPEC §8 fragility guard requires this hook lands BEFORE G6 first commit — otherwise G6 ships with ad-hoc role checks and Phase 2.6 requires retrofitting.

### Extra G6 entry step (inserted between Step 3 and Step 4)

**Step 3.5: FU-SCOPES-1 verification (G0 pre-work)**

```bash
# Builder runs before loading G6 ENTRY-DECISION-PACKAGE:
test -f src/lib/app/scopes.ts && \
  grep -q "export function getUserScopes" src/lib/app/scopes.ts && \
  test -f src/lib/app/use-user-scopes.ts && \
  grep -q "export function useUserScopes" src/lib/app/use-user-scopes.ts
```

**Branches:**
- **EXIT 0** (all checks pass) → proceed to Step 4 normally.
- **EXIT non-zero** → HALT normal G6 entry. Execute G0 pre-work FIRST:
  1. Read `.yagi-autobuild/phase-2-5/G6-ENTRY-DECISION-PACKAGE.md` §0 inline spec
  2. Create `src/lib/app/scopes.ts` + `src/lib/app/use-user-scopes.ts`
  3. Modify `src/app/[locale]/app/layout.tsx` to wrap children with `<UserScopesProvider>`
  4. Verify `pnpm exec tsc --noEmit` + `pnpm lint` both EXIT=0
  5. Telegram: `✅ Phase 2.5 G0 (FU-SCOPES-1) SHIPPED`
  6. Commit: `chore(phase-2-5): G0 pre-work (FU-SCOPES-1) — useUserScopes hook`
  7. Resume normal G6 entry from Step 4

### Why this is special-cased for G6 only

G6 is the only gate that structurally depends on a Phase 2.6 primitive. Other gates (G5/G7/G8) are self-contained within Phase 2.5 scope. No other gate triggers this pre-flight.

### Cross-refs

- `.yagi-autobuild/phase-2-5/FOLLOWUPS.md` FU-SCOPES-1
- `.yagi-autobuild/phase-2-5/G6-ENTRY-DECISION-PACKAGE.md` §0
- `.yagi-autobuild/phase-2-6/SPEC.md` §8 (fragility guard 3-layer)
- `.yagi-autobuild/phase-2-6/SPEC.md` §6 Success Criterion #15

### Layer accounting

This check is **Layer 2** of the 3-layer fragility guard:
- Layer 1: FU-SCOPES-1 in Phase 2.5 FOLLOWUPS.md (passive reminder)
- **Layer 2: this GATE_AUTOPILOT G6 entry step (active block) ← you are here**
- Layer 3: Phase 2.6 SPEC.md G1 prerequisite note (post-hoc warning)

If all 3 layers fire and Builder still skips G0, that's a systemic process failure warranting ARCHITECTURE.md revision.
