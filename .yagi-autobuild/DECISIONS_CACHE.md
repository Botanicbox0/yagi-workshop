# YAGI Workshop — Decisions Cache

> **Purpose:** 야기가 과거에 답한 결정을 축적. Gate 진입 시 Builder가 먼저 이 cache를 검색해서 "이미 답한 거 다시 묻지 않기". 야기 개입 횟수 감소 목적.
> **How it works:** `GATE_AUTOPILOT.md` Step 5에서 Builder가 이 파일 scan. Keyword + semantic 매칭. HIGH confidence Cache HIT → 자동 적용, MED confidence HIT → 한 줄 확인, MISS → batch clarification.
> **Confidence threshold:** 90% 미만이면 MISS로 처리. 오매칭 > 다시 묻기.
> **Scope:** Tech/process decisions만. Business/product decisions (brand voice, pricing, IP strategy)은 이 cache 대상 아님 — 별도 관리.
> **Related:** `GATE_AUTOPILOT.md` Step 5, `CODEX_TRIAGE.md` Appendix (ERRCODE), `ARCHITECTURE.md` (ADR 기록).

---

## Cache entry 형식

```markdown
### Q-{id}: {한 줄 요약}

**Asked context:** {언제 처음 질문됐나 — Phase/Gate, 상황}
**Question:** {원 질문 풀 텍스트}
**Answer:** {야기 답변 + 핵심 근거}
**Applies when:** {이 답변을 자동 적용할 조건 — keyword / semantic matching 기준}
**Confidence:** {HIGH / MED — 비슷한 새 질문이 들어왔을 때 자동 적용 safe 정도}
**Registered:** {YYYY-MM-DD} {session 출처}
```

**ID 규칙:** `Q-001`부터 sequential. 이 파일 내 중복 금지.

---

## Seed entries (G1/G2 실전 축적)

### Q-001: Reserved handles list 책임 주체

**Asked context:** Phase 2.5 G2 entry (FU-5)
**Question:** handle collision with route segments 방지용 reserved handles list는 누가 소유? `src/lib/handles/reserved.ts`에 hardcode? 아니면 DB column?
**Answer:** `src/lib/handles/reserved.ts` 에 hardcode. 근거: route 구조는 code change로만 바뀌므로 DB보다 code co-location이 truth source. Dev/test 환경에서도 동일 동작 보장.
**Applies when:** 향후 다른 resource가 URL slug를 쓸 때 reserved list 문제 재등장 — 같은 패턴으로 code-level list 사용.
**Confidence:** HIGH
**Registered:** 2026-04-23 (G2 entry)

---

### Q-002: Role-specific stale data (creators/studios rows) 처리

**Asked context:** Phase 2.5 G1 hardening v1 (H4)
**Question:** `profiles.role` 이 flip되면 (creator → studio) 기존 `creators` row는? Hard delete? Soft delete? 유지?
**Answer:** 유지 (soft-delete 개념). 근거: Showcase winner display / submission history attribution에 이 row가 참조됨. Hard delete면 historical attribution 깨짐. UPDATE는 role-match RLS로 차단 (stale row는 read-only 상태). G3/G6 read query는 profiles.role 기준으로 active persona만 필터.
**Applies when:** 다른 persona table (예: future translator, curator role) 도입 시 동일 패턴 — "persona retire ≠ persona row delete".
**Confidence:** HIGH
**Registered:** 2026-04-23 (G1 hardening v1)

---

### Q-003: Admin audit column binding 정책

**Asked context:** Phase 2.5 G1 hardening v1 (M2)
**Question:** Admin INSERT policy에서 audit column (`created_by`, `announced_by`, `admin_id`)을 `auth.uid()`에 바인딩? Admin A가 Admin B의 이름으로 insert 막아야 함?
**Answer:** Bind on INSERT, NOT on UPDATE/DELETE. 근거:
- INSERT: audit 출처 명확해야 함 → `WITH CHECK (... AND created_by = auth.uid())`
- UPDATE/DELETE: cross-admin collaboration 필요 (admin A가 admin B의 판정 수정 가능해야 함)
G1 hardening v2가 이 구분을 강제함 (per-command policy split).
**Applies when:** 새 admin-writable 테이블 추가 시 동일 패턴. `FOR ALL WITH CHECK (audit = auth.uid())`는 anti-pattern.
**Confidence:** HIGH
**Registered:** 2026-04-23 (G1 hardening v2)

---

### Q-004: Slug regex citext case-insensitive 주의

**Asked context:** Phase 2.5 G1 hardening v1 (M1)
**Question:** `slug citext CHECK (slug ~ '^[a-z]+$')` 로 lowercase 강제? 근데 citext는 case-insensitive match 하는데...
**Answer:** `slug::text ~ ...` 로 **text cast** 필요. Plus defense layer `AND slug::text = lower(slug::text)`. 근거: citext의 `~` 연산자는 ILIKE 상당 → 'ABC' 도 `^[a-z]+$` 통과. Text cast 없이는 uppercase 허용하는 bug 생김.
**Applies when:** citext 컬럼에 regex/pattern CHECK 제약 걸 때 **항상** text cast 필수.
**Confidence:** HIGH
**Registered:** 2026-04-23 (G1 hardening v1)

---

### Q-005: RLS public SELECT 기본값

**Asked context:** Phase 2.5 G1 main
**Question:** 신규 테이블 SELECT policy? Public vs owner-only vs admin-only?
**Answer:** 다음 기준으로 판단:
- 사용자가 생성한 public surface (profiles, creators, studios, challenges, submissions) → **public SELECT** (`USING (true)`)
- Audit / internal log (handle_history, challenge_judgments) → **owner SELECT + admin SELECT** (명시적)
- Draft/pre-release (challenges draft) → **admin SELECT OR is_yagi_admin bypass**
기본값: "사용자가 이 데이터를 볼 권리를 기대하는가"로 판단. 애매하면 stricter 쪽 (owner + admin).
**Applies when:** 새 테이블 추가 시. 단, "creator의 사적 작업 노트" 같이 context 다르면 MISS 처리.
**Confidence:** MED (context dependency)
**Registered:** 2026-04-23 (G1 main)

---

### Q-006: SECURITY DEFINER 함수 search_path

**Asked context:** Phase 2.5 G1/G2 (반복)
**Question:** SECURITY DEFINER 함수에 `SET search_path` 필요?
**Answer:** **항상 `SET search_path = public, pg_temp`**. 근거: definer가 schema 검색 시 attacker가 제어하는 schema를 먼저 찾을 수 있으면 권한 상승. Codex K-05 HIGH-A 단골 항목.
**Applies when:** 모든 SECURITY DEFINER 함수. 예외 없음.
**Confidence:** HIGH
**Registered:** 2026-04-23 (G1)

---

### Q-007: RPC NULL input 처리 (void vs boolean return)

**Asked context:** Phase 2.5 G2 hardening v1 (L2, L3)
**Question:** RPC NULL input 처리? `STRICT` modifier (NULL 반환)? Explicit RAISE?
**Answer:** **Explicit RAISE with structured ERRCODE (`22023 handle_null`)**. 근거:
- void 함수: NULL 반환 = client에 신호 없음 (성공 여부 불명)
- boolean 함수: NULL 반환 = false와 구분 불가 (client 버그)
- STRICT는 "NULL 입력 = NULL 출력" 의미론이 맞을 때만 (SQL 언어 일관성 복잡). RPC 계약에선 RAISE가 명확.
**Applies when:** 모든 RPC NULL 파라미터. `STRICT` modifier는 사용하지 말 것.
**Confidence:** HIGH
**Registered:** 2026-04-23 (G2 hardening v1)

---

### Q-008: Migration chain 스타일 (main + hardening 분리 vs 통합)

**Asked context:** Phase 2.5 G2 hardening v1
**Question:** Codex가 main migration에 HIGH 잡았을 때: inline fix? Separate hardening file? Revert + rewrite?
**Answer:** **Main 상태에 따라 분기:**
- Main이 아직 local-only (prod apply 전) → `main + hardening_v1` 두 파일을 한 push로 composite apply. Migration chain linear 유지.
- Main이 이미 prod apply됨 → `hardening_v1 → hardening_v2 → ...` post-apply 체인 (G1 패턴).
Inline rewrite는 git history 지저분해지므로 피할 것.
**Applies when:** 매 migration Codex HIGH 처리 시.
**Confidence:** HIGH
**Registered:** 2026-04-23 (G2 hardening v1)

---

### Q-009: FORCE ROW LEVEL SECURITY 적용 여부

**Asked context:** Phase 2.5 G2 hardening v1 (M2)
**Question:** 신규 테이블에 `FORCE ROW LEVEL SECURITY` 명시?
**Answer:** **당분간 NO, Phase 2.6 일괄 rollout (FU-13) 까지 대기**. 근거: G1 main/H1/H2 모두 `ENABLE ROW LEVEL SECURITY` 만 사용. 새 테이블에만 FORCE 추가 = inconsistent posture → consistency가 isolated defense보다 중요. Phase 2.6에서 전 테이블 일괄 FORCE + service_role bypass 검토.
**Applies when:** Phase 2.5 내 모든 신규 테이블. Phase 2.6 진입 후엔 이 답변 revisit.
**Confidence:** HIGH (Phase 2.5 한정)
**Registered:** 2026-04-23 (G2 hardening v1)

---

### Q-010: ERRCODE `22023` vs `23514` 구분

**Asked context:** Phase 2.5 G2 hardening v1 (L1)
**Question:** Business rule 거부 (handle_unchanged, handle_change_locked)에 어떤 ERRCODE?
**Answer:** **`23514` (check_violation)**. 근거:
- `22023` (invalid_parameter_value): 값 자체가 invalid (NULL, 범위 초과) — 값 수정하면 OK
- `23514` (check_violation): 값은 유효하지만 business rule이 거부 — 다른 시점/조건이면 OK
`handle_unchanged` / `handle_change_locked`는 후자. 상세는 `CODEX_TRIAGE.md` Appendix.
**Applies when:** 모든 plpgsql 구조화 에러 raise. Appendix map 우선 참조.
**Confidence:** HIGH
**Registered:** 2026-04-23 (G2 hardening v1)

---

### Q-011: 정보통신망법 §50 marketing consent 처리 시점

**Asked context:** Phase 2.5 G1 (FU-1)
**Question:** 마케팅 알림 동의 수집은 어디 layer에서?
**Answer:** **G7 dispatch layer에서**. DB 컬럼 (`challenge_marketing_enabled` boolean DEFAULT FALSE)은 Phase 2.5 closeout 직전 follow-up migration. 이유: G1 scope 과부하 방지, legal 요건은 dispatch layer가 최종 책임. 회원가입 폼 체크박스 + 동의 로그 테이블 + 야간 가드 + [광고] prefix는 G7에서 patch.
**Applies when:** 다른 마케팅 성격 알림 추가 시 동일 — "DB column은 master toggle, 법적 compliance는 sender-side".
**Confidence:** HIGH
**Registered:** 2026-04-23 (G1 main)

---

### Q-012: Next.js 15 인증 페이지 route 구조

**Asked context:** Phase 1.1 (재확인 G2 onboarding)
**Question:** 인증된 페이지는 route group `(app)` vs `[locale]/app/*`?
**Answer:** **`/[locale]/app/*`** (NOT route group). 근거: next-intl + middleware auth 조합에서 route group은 locale 처리 꼬임. CLAUDE.md §Architecture rules #7 명문화됨.
**Applies when:** 모든 authenticated client page 신규 작성.
**Confidence:** HIGH
**Registered:** Phase 1.1, 재확인 G2

---

### Q-013: Pre-apply stop vs Codex CLEAN auto-apply

**Asked context:** Post-G2 retrospective (2026-04-23 저녁)
**Question:** Migration prod apply 전 야기 수동 continue 필요?
**Answer:** **아니, 완전 제거**. Codex K-05 CLEAN = Builder auto-apply. 근거:
- G2에서 pre-apply stop이 HIGH 1건 막았지만 Codex도 같은 HIGH 잡음 → 중복 safety
- 야기 마찰 시간 > 실제 안전 이득
- TRIAGE taxonomy가 CLEAN 외 케이스 escalation 처리 충분
예외 경로: HIGH-B/C, MED-C, LOW-C, taxonomy mismatch, 2nd auto-fix fail, SPEC drift, 야기 Telegram abort/hold.
**Applies when:** 모든 migration apply 결정. CLAUDE.md §Database write protocol이 authoritative.
**Confidence:** HIGH
**Registered:** 2026-04-23 (post-G2 yagi decision)

---

### Q-014: Web Claude session standing order — 속도 우선 + 외부 관점 지속 검토

**Asked context:** Post-G2 세션 (2026-04-23) — 내가 gstack README만 읽고 추측으로 문서 쓰려다 야기가 catch함
**Question:** Web Claude가 야기와 협업할 때 default mindset은?
**Answer:**
- **속도 최우선** — PARALLEL_WORKTREES 같은 병렬 인프라가 #1 speed lever. Redundancy 제거가 #2. 느림 유발 문서/프로세스는 삭제 대상.
- **gstack / Karpathy 관점 지속 검토** — 내 제안이 Garry Tan식 / Karpathy식으로 평가받았을 때 sound한지 주기적 자가 점검.
- **추측 금지** — repo 실제 파일 안 보고 "대략 이럴 것" 가정한 문서 작성은 redundancy 생성의 주범. 쓰기 전에 Filesystem MCP / web_fetch로 실제 확인.
- **공식 docs 1차 source** — 3rd party 블로그 > web_search 검증됨 수준. docs.anthropic.com 등 공식 우선.
**Applies when:** Web Claude가 새 세션 시작할 때, 새 인프라 문서 쓸 때, "이거 정말 필요한가" 판단할 때. 야기가 "제대로 확인하고 하는 거 맞지?"로 질문하면 이 원칙 재확인 신호.
**Confidence:** HIGH
**Registered:** 2026-04-23 (post-G2 web Claude standing order)

---

### Q-015: Parallel execution infrastructure — Agent Teams + in-process mode

**Asked context:** Post-G2 parallelism 설계 세션 (2026-04-23)
**Question:** 야기 Windows 11 + WSL2 + Warp 환경에서 병렬 agent 실행 표준?
**Answer:** **Claude Code Agent Teams, in-process mode 강제**. 근거:
- Conductor / cmux / Superset 전부 macOS only → 배제
- tmux split-pane mode는 Warp Windows / Windows Terminal / VS Code integrated terminal / Ghostty에서 **공식 미지원** (docs.anthropic.com/agent-teams limitations)
- In-process mode는 아무 terminal에서 작동, Shift+Down으로 teammate 순환
- settings.json `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 형식 필수 (top-level 키는 env var export 안 됨, 2026-04-23 smoke test로 확인)
- 3-5 teammates per team이 sweet spot (공식 best practice)
- task_plan.md는 `parallel_group` 필드 필수 (동일 letter = parallel, 다른 letter = sequential barrier)
상세: `PARALLEL_WORKTREES.md`, `yagi-agent/orchestrator/CLAUDE.md` v2.0.
**Applies when:** 모든 Gate build step, 모든 multi-task 설계. 병렬 가능한지 먼저 판단 → 가능하면 parallel_group으로 분할.
**Confidence:** HIGH
**Registered:** 2026-04-23 (Agent Teams smoke test PASS)

---

### Q-016: Redundant document removal policy

**Asked context:** ARCHITECTURE.md v2.0 rewrite 결정 (2026-04-23)
**Question:** 기존 문서에 aspirational (계획됐지만 구현 안 됨) 섹션이 있을 때?
**Answer:** **삭제 + Version bump + "What changed" 섹션 명시**. 근거:
- Stale 섹션 그대로 두면 새 contributor/agent가 "있는 기능"으로 오해 → redundant 구현 시도
- "언젠가 만들 거면 일단 둔다"는 anti-pattern (결국 안 만들고 누적)
- 제거 시 version bump 1.0 → 2.0 (major), 변경 이유 §0에 명시. ADR 따로 필요 없음 (문서 내재 변경 이력)
ARCHITECTURE.md v2.0 실례: L2 token-sync pipeline (src/design-tokens/*.ts 자동 생성), `skills/` 디렉토리 전체 (존재 안 함), 일부 review skill 파일 삭제.
**Applies when:** 문서 audit 시 aspirational 섹션 발견. 단, "현재 구현 안 됐지만 로드맵 명확"은 `## Open questions` 섹션으로 이동 (삭제 아님).
**Confidence:** HIGH
**Registered:** 2026-04-23 (ARCHITECTURE.md v2.0)

---

### Q-017: SECURITY DEFINER 엄격도 톤 다운

**Asked context:** Post-G2 retrospective (2026-04-23)
**Question:** Codex K-05가 SECURITY DEFINER 관련 HIGH-B/C 잡을 때 전부 고쳐야?
**Answer:** **Exploitable today만 fix, theoretical defense-in-depth는 Phase 2.6 dedicated security sweep로 defer**. 근거:
- 야기 pre-revenue + pre-compliance-audit stage
- Ship speed > defense-in-depth 현 시점
- Phase 2.6에 FU-13 (FORCE RLS), FU-8 (auth.uid 최적화) 등 묶어서 전수 sweep 예정
- `search_path = public, pg_temp` 같은 기본 hardening은 여전히 mandatory (Q-006)
구분 기준: "공격자가 현재 prod에서 exploit 가능?" → YES면 fix, NO (추가 조건/권한 필요)면 defer.
**Applies when:** 모든 Codex K-05 SECURITY DEFINER 관련 HIGH-B / HIGH-C 판정. CODEX_TRIAGE.md taxonomy와 함께 사용.
**Confidence:** HIGH (Phase 2.5 한정. Phase 2.6 진입 후 revisit.)
**Registered:** 2026-04-23 (post-G2 yagi decision)

---

### Q-018: 추측으로 문서 작성 금지 — 실제 repo 확인 의무

**Asked context:** Post-G2 web Claude가 gstack README만 읽고 PARALLEL_WORKTREES.md 추측 작성 시도 → 야기가 catch (2026-04-23)
**Question:** 외부 framework (gstack 등) 참조하는 문서 쓸 때 준비 수준?
**Answer:** **최소 다음 3개 확인 후 작성:**
1. 해당 repo 실제 파일 구조 (AGENTS.md / CLAUDE.md / SKILL.md 최소 1개 fetch)
2. 공식 docs에서 primitive 검증 (`--worktree` flag, Agent Teams env var 등 추측 금지)
3. 야기 환경 호환성 확인 (Windows/WSL/Warp 제약에 맞는지)
근거: README는 marketing surface, 실제 구현 detail은 source file에만 있음. README만 보고 쓴 문서는 "원칙상 맞지만 실전 잘못된" 가이드 생성.
**Applies when:** 외부 tool/framework 참조하는 모든 문서. 특히 claim "X가 Y 기능을 제공한다" 쓰기 전 source 확인.
**Confidence:** HIGH
**Registered:** 2026-04-23 (web Claude self-correction after yagi catch)

---

### Q-019: ROADMAP staleness 패턴 — 다문서 cross-reference 의무

**Asked context:** Agent Teams smoke test — teammate가 HANDOFF (2026-04-23) vs ROADMAP (2026-04-21) 날짜 차이 + Phase 숫자 차이 cross-check하여 staleness 발견 (2026-04-23)
**Question:** Agent teammate / Builder가 여러 문서 읽을 때 staleness 판단 기준?
**Answer:** **Date-based cross-reference 의무화**. 근거:
- 단일 문서 읽고 그 내용 신뢰 = staleness에 취약
- Timeline 문서 (HANDOFF, ROADMAP, PHASE_SUMMARY) 여럿 읽을 때 → **last-modified date 비교 + phase/gate number 비교 + contradiction 있으면 flag**
- 발견 시 발견자가 FU로 등록 (FU-14 실례: ROADMAP stale)
실전 패턴: teammate / agent가 multi-doc input 받으면 synthesis 시 "Reconciliation note" 섹션 자동 추가 (smoke test teammate가 자발적으로 함 — 이 pattern을 norm으로 채택).
**Applies when:** Agent Team lead 가 여러 문서 synthesis할 때, Builder 가 Gate entry 시 여러 reference 문서 읽을 때, web Claude가 handoff 준비할 때.
**Confidence:** HIGH
**Registered:** 2026-04-23 (Agent Teams smoke test teammate emergent behavior)

---

## Cache maintenance

### Append workflow

새 야기 답변이 들어오면:

1. Builder가 DECISIONS_CACHE.md 읽기
2. 다음 Q-ID 계산 (현재 max + 1)
3. 위 형식 따라 append
4. Commit: `docs(autobuild): cache decision Q-{id} — {title}`

### Review workflow

Phase 완료 시점:

1. 해당 Phase에서 등록된 Q 전부 확인
2. Confidence MED → HIGH 승격 가능 여부 판단 (비슷한 새 질문에도 잘 매칭됐나)
3. Context 변화로 applicability 바뀐 entry는 "Applies when" 섹션 업데이트
4. 완전히 stale된 entry는 **삭제하지 말고** "Superseded by Q-{new_id}" 마크

### 매칭 정확도 개선

Cache hit 후 야기가 "이 답변 이 상황엔 적용 안 됨" 피드백을 주면:

1. 해당 entry의 "Applies when" 섹션 narrow down
2. Confidence 하향 (HIGH → MED)
3. 피드백 발생 사례를 entry 하단에 "Edge case" 섹션으로 기록

---

## Anti-patterns (cache 잘못 쓰는 법)

- **Cache에 있다고 무조건 적용:** Context 다르면 HIGH confidence라도 MISS 처리. 의심스러우면 야기에게 물음.
- **Product/brand decision cache에 넣기:** 기술/process만. "이 카피는 어떻게?"는 brand voice guide 영역.
- **Cache 크기 억제 목적으로 entry 삭제:** Cache growth는 문제 아님. Stale은 "Superseded" 마크로 유지.
- **Cache entry에 detail 너무 많이:** 요지 + 근거만. 상세는 원본 session/PR에 링크.

---

## 이 파일 갱신 트리거

- 야기 새 결정 → append (Gate Autopilot Step 6)
- Phase closeout → review workflow 실행
- 오매칭 발생 → Applies when narrow down + Confidence 하향
- 새 pattern 등장 (3+ gate에서 동일 결정 반복) → entry 통합 검토

**Owner:** Builder (append 주체) + 야기 (review 주체) + Web Claude (정합성 검토)
