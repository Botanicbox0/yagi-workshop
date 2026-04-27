# Phase 2.6 — Kickoff Prompt v2 (post-Phase 2.5 SHIPPED)

**Status:** READY TO PASTE.
**Preconditions verified:** Phase 2.5 SHIPPED confirmed (main merge + Telegram 🚀 sent).

---

## Context for Builder (paste this into Builder in main worktree)

Phase 2.6 IA Revision kickoff — ULTRA-CHAIN MODE with Phase 2.5 learnings applied.

### 전제 확인 (Builder가 자동 실행 first thing)

```bash
# G0 pre-work (FU-SCOPES-1) — Phase 2.5 G6에서 이미 land됨
test -f src/lib/app/scopes.ts && \
  grep -q "export function getUserScopes" src/lib/app/scopes.ts && \
  (test -f src/lib/app/use-user-scopes.ts || test -f src/lib/app/use-user-scopes.tsx) && \
  grep -q "export function useUserScopes" src/lib/app/use-user-scopes.*

# EXIT 0 기대. non-0이면 halt + Telegram + 야기 개입.

# Main 브랜치 위치 확인
git status
git log --oneline -3
# 기대: worktree-g3-challenges merge 완료된 main HEAD
```

### Source of truth 문서 (전부 pre-authored)

- `.yagi-autobuild/phase-2-6/SPEC.md` v3.1 (policy) — **읽기 필수**
- `.yagi-autobuild/phase-2-6/IMPLEMENTATION.md` v3.1 (how) — **읽기 필수**
- `.yagi-autobuild/phase-2-6/REFERENCES.md` v3 (cross-refs) — 필요 시
- `.yagi-autobuild/phase-2-6/FOLLOWUPS.md` — FU 등록 대상
- `docs/design/DECISIONS.md` ADR-008 (no breadcrumbs), ADR-009 (role types), ADR-010 (sidebar IA) — 이미 landed

### Gate 구조

- **G1** — Sidebar 3-tier refactor + 4-group mapping + scope resolver wiring (3-4h)
- **G2** — Scope selector rename + multi-kind + keyboard nav + **first-use tooltip** (3-4h)
- **G3** — Help link mechanism + **public exit link** + 1 guide page published (2-3h + 30min content)
- **G4** — A11y + mobile drawer + **Codex K-05** (2-3h + Codex loop)

Total: ~10-14h Phase 2.6 proper.

### 작업 전략 (Phase 2.5에서 배운 것)

**Worktree 사용 여부:** 기본은 **main worktree 직접 작업**. Phase 2.6은:
- UI-only (no schema change)
- 스코프 선명
- 병렬 teammate 필요도 낮음 (G1-G4 순차로 충분)

→ main에서 바로 `claude` 실행, worktree 오버헤드 없이 진행.

**다만** G4 (Codex K-05) 시 Phase 2.5 G8처럼 hardening loop 가능성 있음. 아래 loop budget 참조.

### Codex hardening loop budget (G4 전용)

Phase 2.5에서 hardening 3-loop까지 갔음. Phase 2.6은 UI-only라 schema-level vuln 훨씬 적을 것. 그래도 명시:

- **Loop 1**: Codex finding → hardening migration/app patch → re-run
- **Loop 2**: 잔존 finding 있으면 추가 patch → re-run
- **Loop 3 (hard stop)**: 잔존 HIGH 있으면 자동 Downgrade 경로 진입 (FU 등록 후 ship)

**MVP context severity triage:** 야기 1인 법인 MVP 공개 관점에서 다음 조건 만족 시 HIGH-C는 MED로 자동 downgrade 허용:
- Self-corruption only (attacker가 본인 row만 망칠 수 있음)
- No cross-user leak
- No privilege escalation
- App-layer에서 이미 validation 존재

이런 finding은 FU 등록 후 Phase 2.6 closeout 또는 Phase 2.7에서 처리.

### 체인 policy (Phase 2.5 ULTRA-CHAIN 동일)

1. Gate SHIPPED (barrier PASS + closeout committed) 즉시 다음 Gate 자동 진입, 야기 승인 불필요
2. DECISIONS_CACHE.md scan → cache HIT autoAdopt
3. Cache MISS 시 SPEC/IMPLEMENTATION default recommendation 채택
4. Entry package 방식 없음 (Phase 2.5와 차이점) — SPEC + IMPLEMENTATION이 곧 entry package
5. "Should I proceed?" "Do you want..." "Let me know..." 승인 요청 금지. Builder는 문서 source of truth로 자체 결정 후 즉시 실행.

### G3 minimum viable content (critical gate criterion)

G3 완료 조건 중 하나: **challenge-creation 가이드 1개 게시**.

- **작성자**: 야기 또는 Dana
- **분량**: 300-500 words
- **경로**: `/journal/guide/challenge-creation`
- **Flip**: 저술 후 Builder가 `src/lib/app/help-routes.ts`의 `challengeCreation.published = true`

**타이밍:**
- G3 진입 시 Telegram alert: "G3 진입 — 가이드 저술 필요. 야기/Dana 30분 내 draft 요청."
- 30분 경과해도 draft 없으면 Builder가 **가이드 placeholder** 자체 작성 (300 words, 야기가 나중에 replace 가능한 형태). published=true flip.
- 야기/Dana 최종 저술은 Phase 2.6 SHIPPED 이후 언제든 replace.

이렇게 하면 G3 barrier 안 막힘. MVP 공개 후 가이드 개선 가능.

### Stop triggers

- Codex G4 K-05 HIGH-A finding (exploitable today)
- SPEC drift 발견 (SPEC 수정 없이는 진행 불가)
- build/tsc/lint fail 2회 연속
- Schema 변경 시도 발견 (Phase 2.6 UI-only 불변식 위반)

### Telegram

- Gate SHIPPED: 한 줄 축약
- G3 가이드 요청: 30분 타이머 시작 알림
- Halt: 즉시 + reason + actionable suggestion
- Progress: OFF

### 체인 종료 + MVP 전환

G4 closeout → Phase 2.6 SHIPPED Telegram → chain STOP.

**Phase 2.6 SHIPPED 직후 야기 visual review 요청:**
- 모든 app 루트 sidebar rendering
- Scope selector 작동 + first-use tooltip
- Public exit link 위치/동작
- Help link 렌더링 (challenge-creation 경로)
- Mobile drawer

Visual review PASS 시 MVP polish 전환. Phase 2.7은 별도 planning session.

### Execution policy (재확인)

- 파일 생성/수정/삭제: SPEC/IMPLEMENTATION 범위 내라면 승인 불필요
- Dep 추가: Phase 2.6은 new dep 없음. Unexpected dep 추가 시도 → halt.
- Schema 변경 시도 → halt.
- Git commit: `feat(phase-2-6 g{K}): <summary>` or `chore(phase-2-6 g{K}): <summary>`

실행 개시.

---

**Estimated total duration:**
- Optimistic (cache HIT + clean Codex): 8-10h
- Typical: 10-14h
- Conservative (1 hardening loop in G4): 12-16h

**MVP 공개 타임라인 기준:**
- 금요일 오후-밤: Phase 2.6 G1-G3 (optimistic) 또는 G1-G2 (conservative)
- 토요일: G3-G4 완료 + MVP polish 시작
- 일요일: visual QA + 런칭 준비
- 🚀 일요일 밤 / 월요일 새벽: **MVP 공개**
