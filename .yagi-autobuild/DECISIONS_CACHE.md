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


---

## 2026-04-24 overnight batch — Phase 2.5 G5~G8 entry packages + Phase 2.6 v3.1 SPEC

Entry packages pre-authored by web Claude. These decisions map 1:1 to the Q-G{N}-{n} questions in each entry package's "Decisions needed" section. Builder applies these on cache HIT at Step 5.

### Q-020: G5 — static submission-requirements form UX

**Asked context:** Phase 2.5 G5 entry package §D, §K Q-G5-1
**Question:** Adopt static layout per submission type with fold/unfold checkbox, NOT a generic JSONB schema editor?
**Answer:** YES. Static layout with checkboxes for each type (native_video / image / pdf / youtube_url / text_description), sub-config rendering only when checked. Zod schema validates form → JSONB before INSERT.
**Applies when:** Any future JSONB-building admin form. Static-with-fold pattern is default, not generic editor.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-021: G5 — judging_config form UX

**Asked context:** G5 entry package §E, §K Q-G5-2
**Question:** Radio selector (admin_only / public_vote / hybrid) with conditional weight slider (default 70% admin for hybrid)?
**Answer:** YES. Hybrid default weight 70% admin / 30% public. Slider 0-100, public weight auto-derived.
**Applies when:** G5 only. New judging modes in Phase 3+ → new decision.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-022: G5 — synchronous fan-out on announce

**Asked context:** G5 entry package §F, §K Q-G5-3
**Question:** Synchronous notification_events INSERT fan-out (100 rows in one transaction) for winner announce — acceptable at current scale?
**Answer:** YES. notify-dispatch existing batching handles Resend rate limits. At <500 emails/day peak (current scale), no infra upgrade needed. Phase 2.6+ monitor; queue-based dispatcher if volume >1k/day.
**Applies when:** All synchronous fan-out patterns at current YAGI scale. Re-evaluate in Phase 3+.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-023: G5 — slug lock after draft

**Asked context:** G5 entry package §C, §K Q-G5-4
**Question:** Slug editable ONLY while `challenges.state = 'draft'`, read-only after?
**Answer:** YES. Prevents URL breakage from slug rename after gallery has submissions / social shares. Server Action rejects slug change if state != 'draft'.
**Applies when:** Any resource with public slug + state machine. Pattern: lock after first non-draft transition.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-024: G5 — state machine reopen transition

**Asked context:** G5 entry package §B, §K Q-G5-5
**Question:** Allow `closed_judging → open` reopen transition (admin corrective path)?
**Answer:** YES. Allowed transitions: draft→open, open→closed_judging, closed_judging→{closed_announced, open}, closed_announced→archived. Reopen is rare admin use for corrective actions.
**Applies when:** G5 only. Additional transitions require new ADR.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-025: G5 — score scale default

**Asked context:** G5 entry package §K Q-G5-6
**Question:** Per-judgment score scale — 0-10 or 0-100?
**Answer:** 0-10 for MVP simplicity. Stored in `challenge_judgments.score numeric`. If future challenges need finer granularity, judging_config JSONB can extend with `score_scale` field.
**Applies when:** G5 only. Score scale expansion in Phase 3+ via judging_config extension.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-026: G6 — G0 pre-work inline execution

**Asked context:** G6 entry package §0, §K Q-G6-1
**Question:** If Builder finds `src/lib/app/use-user-scopes.ts` missing at G6 entry, execute inline G0 spec automatically?
**Answer:** YES. Verification + auto-execute + Telegram on G0 ship is the BLOCKER path per GATE_AUTOPILOT G6-specific amendment (2026-04-24). See FU-SCOPES-1.
**Applies when:** G6 entry specifically. Other gates don't have this pattern.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-027: G6 — locale-free /u/[handle] route

**Asked context:** G6 entry package §B, §K Q-G6-2
**Question:** `/u/[handle]` NOT under `[locale]`, mirroring `/showcase/[slug]` pattern?
**Answer:** YES. Handles are global identifiers, not locale-scoped. Middleware matcher excludes `u` from locale redirect.
**Applies when:** Any future globally-scoped public surface (e.g., share links). Locale-free routes require middleware exclusion.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-028: G6 — Observer profile role badge

**Asked context:** G6 entry package §C, §K Q-G6-3
**Question:** Render role badge for Observer profile?
**Answer:** NO. Observer profile is minimal by design — no public role display. Creator / Studio get badges; Observer bare.
**Applies when:** Profile display for ProfileRole = observer. Consistent across any profile-display surface.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-029: G6 — no handle_holds table for squatter protection

**Asked context:** G6 entry package §D, §K Q-G6-4
**Question:** Skip `handle_holds` table? 90-day self-lock (profiles.handle_changed_at) sufficient?
**Answer:** YES. At current user scale, squatting isn't a real risk. 90-day self-lock prevents impulsive changes. Phase 3+ revisit if squatting observed.
**Applies when:** Handle lifecycle decisions. Hold-table is premature optimization at current scale.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-030: G6 — react-image-crop dependency

**Asked context:** G6 entry package §E, §K Q-G6-5
**Question:** Add `react-image-crop` dep (~30KB gzip) for avatar crop UI?
**Answer:** YES. Hand-rolling canvas crop UI with drag handles is non-trivial. `react-image-crop` is small, maintained, accessible.
**Applies when:** Avatar crop + any future image crop needs (e.g., hero upload).
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-031: G6 — external links as {label, url} objects

**Asked context:** G6 entry package §F, §K Q-G6-6
**Question:** Store `profiles.external_links jsonb` as `[{label, url}]` objects vs plain URL array?
**Answer:** YES ({label, url}). Labels improve UX — users can annotate "Portfolio" / "Instagram" / "YouTube" without visitors parsing domain names.
**Applies when:** Any user-configurable external link field. Same shape convention.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-032: G6 — role switch UI deferred

**Asked context:** G6 entry package §I, §K Q-G6-7
**Question:** Defer role switch UI (Observer → Creator/Studio upgrade, Creator ↔ Studio) to Phase 2.6+ BACKLOG?
**Answer:** YES. Role switch has cascading effects (RLS, UI surface). Separate page to avoid accidental-click. MVP: manual SQL Editor by 야기.
**Applies when:** Role switch decisions. Not G6 scope.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-033: G7 — 4 new notification kinds + severity

**Asked context:** G7 entry package §A, §J Q-G7-1
**Question:** Auto-adopt `challenge_submission_confirmed` (medium), `challenge_closing_soon` (high), `challenge_announced_winner` (high), `challenge_announced_participant` (medium)?
**Answer:** YES. Mirrors Phase 2.5 SPEC §3 G7 Task 1 literal. High severity bypasses digest batching (fires immediately per Phase 1.8 behavior).
**Applies when:** G7 kinds registration.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-034: G7 — Korean + English notification copy

**Asked context:** G7 entry package §B, §J Q-G7-2
**Question:** Adopt bilingual notification copy per G3 tone rules (no "제출", use "작품", "주인공" for winner)?
**Answer:** YES. Copy follows G3 tone principle (creator-centric, action-driven, emotional). Korean primary, English parity.
**Applies when:** All new notification kinds going forward.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-035: G7 — inline email templates in notify-dispatch (log as debt)

**Asked context:** G7 entry package §C, §J Q-G7-3
**Question:** Add inline template strings in notify-dispatch/index.ts (not React Email pipeline), log as tech debt FU?
**Answer:** YES. Deno runtime constraint makes React Email pipeline infeasible without larger refactor (Phase 3+). Log tech debt for future unification.
**Applies when:** All new notification kinds until React Email / Deno pipeline unified.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-036: G7 — pg_cron migration path

**Asked context:** G7 entry package §D, §J Q-G7-4
**Question:** Attempt `cron.schedule()` via Supabase CLI migration, fallback to manual SQL Editor if migration fails?
**Answer:** YES. First try migration (first cron.schedule in codebase). If fails → manual dashboard SQL Editor + document in CLOSEOUT. Log as FU candidate for migration-compatible cron pattern.
**Applies when:** New pg_cron jobs going forward.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-037: G7 — locale-aware body rendering in notify-dispatch

**Asked context:** G7 entry package §D, §J Q-G7-5
**Question:** Cron INSERT blank title/body, notify-dispatch reads profile.locale and renders localized? Cleaner than hardcoding Korean in cron.
**Answer:** YES. notify-dispatch is the single rendering layer. Cron inserts structural data (kind, payload, url_path), dispatch renders per locale.
**Applies when:** All pg_cron-emitted notifications going forward.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-038: G7 — challenge_updates_enabled gates email only

**Asked context:** G7 entry package §E, §J Q-G7-6
**Question:** Preference flag `challenge_updates_enabled=false` suppresses email dispatch only, in-app row still inserted?
**Answer:** YES. Preserves notification bell visibility for users who want in-app but not email. Consistent with Phase 1.8 existing pattern.
**Applies when:** All notification preferences gates. In-app always inserted; email/push gated.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-039: G7 — 2-browser realtime smoke as manual QA

**Asked context:** G7 entry package §G, §J Q-G7-7
**Question:** Document 2-browser realtime smoke in YAGI-MANUAL-QA-QUEUE.md, not blocking G7 ship?
**Answer:** YES. Manual QA runs async. Not a Builder-automatable test. Queue entry documents procedure + expected behavior.
**Applies when:** Any realtime subscription smoke test at Builder level. Delegate to manual QA queue.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-040: G8 — Codex K-05 focus areas

**Asked context:** G8 entry package §A, §K Q-G8-1
**Question:** Run Codex K-05 with focus prompt: "RLS enforcement, JSONB validation, state-machine bypass, realtime fan-out correctness, cron idempotency, notification rate-limiting, avatar upload security"?
**Answer:** YES. Focus list matches SPEC §2 success criteria + major new infra. Codex decides severity per findings.
**Applies when:** G8 Codex invocation.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-041: G8 — HIGH-B/C auto-defer to Phase 2.6

**Asked context:** G8 entry package §A triage, §K Q-G8-2
**Question:** Auto-defer HIGH-B/C findings (theoretical defense-in-depth) to Phase 2.6 security sweep (FU-8/9/11/13), not inline fix?
**Answer:** YES. Per CODEX_TRIAGE + existing Phase 2.6 FU plan. HIGH-A (exploitable today) still halts; HIGH-B/C batched to sweep.
**Applies when:** All G8 Codex triage decisions. HIGH-A = inline, HIGH-B/C = defer.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-042: G8 — bulk contracts.md update acceptable

**Asked context:** G8 entry package §D, §K Q-G8-3
**Question:** Accept bulk Phase 2.5 section addition to contracts.md at G8 (drift remediation), file FU-PROCESS-1 for pre-commit hook enforcement going forward?
**Answer:** YES. Bulk update + process-level fix (pre-commit hook in Phase 2.6+) prevents future drift.
**Applies when:** Any cross-phase contract drift remediation.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-043: G8 — first-admin seed backfill migration

**Asked context:** G8 entry package §E, §K Q-G8-4
**Question:** File backfill seed migration for yagi_admin role (idempotent, no-op if already seeded manually)?
**Answer:** YES. ON CONFLICT DO NOTHING makes it safe. Formalized for fresh-DB-reset reproducibility.
**Applies when:** Any role seed decisions.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-044: G8 — fast-forward worktree merge to main

**Asked context:** G8 entry package §F, §K Q-G8-5
**Question:** Merge worktree branch → main via fast-forward (linear history), else merge commit?
**Answer:** YES. FF if possible. No parallel main writes during Phase 2.5 should make FF feasible. Fallback: merge commit if conflict.
**Applies when:** All worktree → main merge decisions.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch

### Q-045: G8 — file ADR-010 at G8 cross-phase tidy

**Asked context:** G8 entry package §J, §K Q-G8-6
**Question:** File ADR-010 (Sidebar IA grouping) in docs/design/DECISIONS.md during G8?
**Answer:** Already filed by web Claude 2026-04-24 (pre-G8). G8 Builder just verifies existence, no action needed. If missing, Builder writes.
**Applies when:** Cross-phase ADR landing decisions. Web Claude can pre-author ADRs during SPEC phase.
**Confidence:** HIGH
**Registered:** 2026-04-24 overnight batch


---

## 2026-04-24 late night batch — Phase 2.7 Commission Platform decisions

Phase 2.7 Kickoff 전 pre-answered decisions. Builder가 Ultra-chain Step 5 cache scan 시 autoAdopt.

### Q-046: Client signup — phone 필수 여부

**Asked context:** Phase 2.7 SPEC §1 Client persona, G2 signup form
**Question:** Signup 시 phone 필수?
**Answer:** NO. Optional. Email 필수, phone은 verification or urgent contact 시 admin이 별도 요청.
**Rationale:** Privacy friction 최소화. 대기업 계정 생성 시 담당자 폰 공개 꺼림.
**Applies:** Client signup G2

### Q-047: Client verification — manual vs automated

**Asked context:** SPEC §3 clients.verified_at field
**Question:** Client 회사 (대기업 주장) 진위 verification?
**Answer:** Manual admin. `verified_at timestamptz` stamp. Admin이 사업자등록증 or 회사 도메인 이메일 확인 후 stamp. Automated verification은 Phase 2.8+.
**Rationale:** MVP 초기 10-30건은 야기가 직접 검증. 스케일 시 API 도입.
**Applies:** G2 + Admin review flows.

### Q-048: Project visibility default

**Asked context:** SPEC §3 projects.visibility enum
**Question:** Default visibility?
**Answer:** `admin_curated`. Creator pool 중 자격/랭킹 맞는 크리에이터만 discover 가능 (완전 public보다 제한적).
**Rationale:** Client privacy 보호 + creator quality filter.
**Applies:** G3 brief wizard default.

### Q-049: Brief markdown editor 수준

**Asked context:** SPEC G3 task
**Question:** Rich WYSIWYG editor vs textarea + preview?
**Answer:** Textarea + markdown preview tab. WYSIWYG는 Phase 3+.
**Rationale:** MVP 속도 우선. react-markdown 이미 깔려있음.
**Applies:** G3.

### Q-050: Pay-to-apply for creator proposals

**Asked context:** SPEC §2 Creator journey
**Question:** Creator가 proposal 제출 시 fee 지불?
**Answer:** NO. Free submission.
**Rationale:** Creator acquisition이 먼저. 향후 premium creator tier에서 "priority proposal" 유료화 가능 (Phase 2.9+).
**Applies:** G4.

### Q-051: Multi-winner challenge → portfolio auto-add

**Asked context:** SPEC §2 Journey C
**Question:** Challenge 우승작을 creator portfolio에 자동 추가?
**Answer:** NO. 자동 candidate proposal만, creator 본인이 curate.
**Rationale:** Portfolio는 creator의 editorial statement. 자동 추가는 invasion.
**Applies:** G7.

### Q-052: Client can request specific creator

**Asked context:** SPEC §3 projects.visibility
**Question:** Client가 특정 creator만 consider할 수 있는 invite_only 모드 제공?
**Answer:** YES. `visibility = 'invite_only'` + `project_invitations` (G4 또는 FU-2.7-13). MVP는 admin 수동 process: client 요청 → admin이 invite_only project 생성 + 지정 creator에게 invitation notification.
**Rationale:** 이미 관계 있는 creator와 계속 작업하고 싶은 client 많음. 엔터 업계 통상적.
**Applies:** G3 (visibility 선택) + G4 (admin invite flow).

### Q-053: Contract PDF legal validity

**Asked context:** SPEC §6 Payment strategy
**Question:** 전자서명 PDF가 MVP 법적 validity 충분?
**Answer:** YES for MVP (1-1억원 미만 거래). "전자서명 + IP/timestamp 기록 보관"은 전자문서법상 적법. 공인전자문서 upgrade는 FU-2.7-11 (매출 규모 확대 시).
**Rationale:** MVP 단계 법률 리스크 관리 가능 수준.
**Applies:** G5.

### Q-054: Multilingual (en + ko)

**Asked context:** REFERENCES §6
**Question:** Phase 2.7 en 지원?
**Answer:** ko 우선. en은 stub 유지 (기존 Phase 2.5 패턴). en 본격 재도입은 해외 client 대비 Phase 2.9+.
**Rationale:** 타겟 시장 (JYP, YG, 하이브 등) 전부 한국. en 품질 관리 overhead > 가치.
**Applies:** 전체 phase.

### Q-055: Refund policy

**Asked context:** REFERENCES §6
**Question:** Refund/cancellation 구조?
**Answer:** `projects.state = 'cancelled'` + `project_contracts.state = 'cancelled'` + admin 중재. 정식 refund process는 Phase 2.8 (escrow 연동 시).
**Rationale:** MVP 거래 적어 case-by-case 수동 처리 가능.
**Applies:** G1 state machine triggers.

### Q-056: Brokerage rate default

**Asked context:** SPEC §6 project_contracts.brokerage_rate
**Question:** Default 수수료율?
**Answer:** 15%. Admin이 per-contract 조정 가능 (0-50% range).
**Rationale:** 업계 통상 15-20% (agent + vendor 수수료 합). 경쟁력 + 수익 밸런스.
**Applies:** G5 contract creation.

### Q-057: Portfolio_publication_allowed default

**Asked context:** IMPLEMENTATION §1 Section 6 project_contracts
**Question:** Contract 체결 시 creator가 결과물을 portfolio에 공개 허용 default?
**Answer:** TRUE (default 허용). Client가 NDA 필요 시 명시적으로 FALSE 설정.
**Rationale:** Creator brand 성장에 portfolio 중요. 대부분 client는 홍보 효과로 OK.
**Applies:** G5 contract terms.

### Q-058: Milestone 자동 생성 vs admin 수동

**Asked context:** IMPLEMENTATION §5 G6
**Question:** Milestone은 contract active 시 자동 생성? 
**Answer:** NO auto. Admin이 contract active 후 `/app/admin/commissions/[id]/match` surface에서 수동 생성. 권장 template: 3 milestones (concept approval / WIP review / final delivery).
**Rationale:** 프로젝트별 milestone 다양. 자동화는 Phase 3+ AI 보조.
**Applies:** G5/G6.

### Q-059: R2 bucket separation project vs challenge

**Asked context:** SPEC §3 Storage buckets
**Question:** Project files를 기존 `yagi-challenge-submissions` bucket에 넣을까 새 bucket?
**Answer:** 새 bucket `yagi-project-files`. 라이프사이클/CORS/권한 분리.
**Rationale:** Challenge는 24h tmp lifecycle, project는 영구 보관. 혼용 시 정책 충돌.
**Applies:** G1 (env 설정) + G6 (upload wiring).

### Q-060: Font licensing MVP strategy

**Asked context:** REFERENCES §4
**Question:** Migra 구매 vs Playfair Display 무료?
**Answer:** Playfair Display (무료, Google Fonts). Post-MVP Migra upgrade는 FU-2.7-10.
**Rationale:** MVP 비용 최소화. 폰트 교체는 token level 한 줄 변경.
**Applies:** G8-E.

### Q-061: GSAP ScrollTrigger vs Framer Motion

**Asked context:** IMPLEMENTATION §5 G8-F
**Question:** Scroll motion library?
**Answer:** Framer Motion (이미 프로젝트에 있음 가능성 + react 친화). GSAP는 추가 dep + 라이선스 검토 부담.
**Rationale:** Webflow 같은 scroll 연출은 Framer Motion `useScroll` + `useTransform`으로 대부분 가능. GSAP은 Phase 2.8+ 필요시.
**Applies:** G8-A landing + G8-B commission.

### Q-062: Client role이 /app/discover 접근?

**Asked context:** Route structure
**Question:** Client가 creator discover feed 볼 수 있어야?
**Answer:** NO. `/app/discover`는 creator/studio 전용. Client는 자기 project의 proposals만 본다. Discover 공개 시 client가 creator를 outside-of-platform contact 유도 가능.
**Rationale:** Platform integrity 보호. Creator DM spam 방지.
**Applies:** G4 middleware.

### Q-063: Signup role 선택 UI 방식

**Asked context:** G2 task 1
**Question:** 4 roles (creator/studio/observer/client) 선택 UI?
**Answer:** 2-step. Step 1: "당신은 무엇을 하러 왔나요?" - [의뢰하러 왔어요] (client) / [작품 만들러 왔어요] (creator/studio/observer). Step 2는 Step 1 선택에 따라 분기.
**Rationale:** Client와 Creator는 서비스 본질 다름. 한 페이지에 4개 role 나열은 client 혼란 + creator/studio/observer는 기존 flow 유지.
**Applies:** G2.

### Q-064: Client dashboard first view

**Asked context:** UX
**Question:** Client가 `/app` 진입 시 첫 화면?
**Answer:** `/app/commission` (project list, 비어 있으면 "첫 프로젝트 시작하기" CTA). Phase 2.6 sidebar는 client용으로 "작업" group에 의뢰 관리 항목 추가.
**Rationale:** Client의 primary use case = 프로젝트 관리.
**Applies:** G2 middleware + Phase 2.6 sidebar mapping 확장 (client role).

### Q-065: Admin 의뢰 review 기간

**Asked context:** SPEC G3
**Question:** Admin 심사 SLA?
**Answer:** "1-2 영업일" 공표 (SPEC에 명시). Client에게 submit 후 expected timeframe 표시.
**Rationale:** Manual review 감당 가능 + client expectation management.
**Applies:** G3 submission confirm UI.

### Q-066: Proposal submit 후 edit 가능?

**Asked context:** SPEC journey B
**Question:** Creator가 submitted proposal 수정?
**Answer:** NO edit, YES withdraw + resubmit. Status transition: submitted → withdrawn (creator self) → new submission (해당 creator 이 project에 UNIQUE constraint 있지만 withdrawn proposal은 제외 로직 허용).
**Rationale:** Audit trail 명확성 + client 혼란 방지.
**Applies:** G4 state machine + UNIQUE exclusion.

### Q-067: Contract terms_md template

**Asked context:** G5
**Question:** 기본 계약서 template 출처?
**Answer:** YAGI admin이 공증 법무사와 협의한 표준 템플릿 사용. Web Claude가 초안 Korean 작성 가능 (standard VFX 의뢰 계약 참고). Admin이 공식 template 준비될 때까지 draft template 사용.
**Rationale:** 법무 검토는 post-MVP 우선순위. MVP는 "선의의 가이드라인 + 양자 합의" 수준.
**Applies:** G5. Web Claude가 `docs/contract-template-draft.md` 작성 지원 가능 (post-G5).

### Q-068: 3-way messaging (client-creator-admin)

**Asked context:** G6
**Question:** Admin이 모든 message 볼 수 있음? Privacy 이슈?
**Answer:** YES admin sees all. Admin은 중재자 역할. Message thread에 "⚡ Admin can see this message" 노출로 transparency.
**Rationale:** Platform integrity + dispute 사전 방지. Client/Creator 양측 동의 (ToS).
**Applies:** G6 UI + ToS 명시.

### Q-069: Deliverable file format 제한

**Asked context:** SPEC §3 project_deliverables
**Question:** File format 제한?
**Answer:** WIP: mp4/mov/jpg/png/pdf (500MB max). Final: 동일 + zip (2GB max, final은 source files 포함 가능). 자동 virus scan은 Phase 2.8+.
**Rationale:** 업계 standard 커버.
**Applies:** G6 upload validation.

### Q-070: Ranking tier upgrade 규칙

**Asked context:** SPEC §7 G7
**Question:** ranking_tier 자동 승급 구체 규칙?
**Answer:** Bronze default (creator), Silver default (studio). 
- Challenge 1회 우승 → 최소 Silver (creator). 
- Same category 2회 우승 → Gold.
- Premium client와 2회+ contract completed → Platinum.
Admin override 항상 가능.
**Rationale:** Merit-based + 가시적 성장 경로.
**Applies:** G7 trigger + admin panel.

### Q-071: Discover feed filter 우선순위

**Asked context:** G4 task 1
**Question:** Default sort order?
**Answer:** 1. 내 specialty 매치 스코어, 2. ranking_tier (platinum first), 3. recency. Creator는 본인 상태 `accepting`인 것만 제안 권장 (app hint).
**Rationale:** Relevance + incentive for quality creators.
**Applies:** G4 query default.

### Q-072: pg_cron 신규 job 추가 방법

**Asked context:** G6 milestones-deadline-reminder
**Question:** Phase 2.5 G7 pattern 그대로?
**Answer:** YES. `supabase/migrations/{ts}_phase_2_7_milestones_cron.sql` 독립 파일. G1 migration과 분리 (Phase 2.5 ULTRA-CHAIN D pattern).
**Applies:** G6.

### Q-073: Challenge role과 Commission role 통합 사이드바

**Asked context:** Phase 2.6 sidebar mapping 확장
**Question:** "의뢰" 새 group 추가 vs 기존 "작업" group에 편입?
**Answer:** 기존 "작업" group에 편입 (client role은 `작업 ▾` 하위에 `의뢰 작성` + `내 의뢰` 만 표시; creator/studio는 `Discover` + `내 제안` 추가). 4 group 상한 유지.
**Rationale:** ADR-010 기본 4 group 설계 존중. Client UI는 자연스럽게 "작업" = "의뢰 작업".
**Applies:** G2 + Phase 2.6 ADR-010 수정 (minor).

### Q-074: Observer role의 Phase 2.7 권한

**Asked context:** Observer가 commission surface 접근?
**Question:** Observer가 `/app/discover` 또는 `/app/commission/*` 접근?
**Answer:** Observer는 `/app/discover` read-only 가능 (단, proposal 제출 불가), `/app/commission/*`는 NO (role upgrade prompt). 
**Rationale:** Observer가 의뢰 생태계 관찰할 수 있게 해야 role upgrade 동기 부여. 직접 참여는 creator/studio upgrade 후.
**Applies:** G4 middleware.

### Q-075: Email notification digest frequency

**Asked context:** Phase 2.7의 12 new notification kinds
**Question:** 모두 real-time email?
**Answer:** High severity만 real-time, medium은 digest (기존 Phase 1.8 패턴). `new_message_in_project` 특히 spammy 가능성 → 5분 debounce per project.
**Rationale:** Email fatigue 방지.
**Applies:** G4/G6 notification wiring.

### Q-076: Portfolio item 최대 개수

**Asked context:** SPEC §2 Surface C
**Question:** 12 items 확정?
**Answer:** YES 12 max. 이유: 12 = 3 columns × 4 rows grid, desktop 적정. More items는 "See all" modal 또는 Phase 3+.
**Applies:** G7.

### Q-077: Landing page challenge preview 몇 개

**Asked context:** G8-A
**Question:** Landing에 challenge 노출 몇 개?
**Answer:** 열린 챌린지 중 3개 carousel (desktop) / 1개 대표 (mobile). 0개일 때 최근 종료 챌린지 우승작 showcase.
**Rationale:** Active signal 전달, 너무 많으면 landing 주목 분산.
**Applies:** G8-A.

### Q-078: Commission sales page에 실제 사례 표시

**Asked context:** G8-B case studies section
**Question:** 실제 case study 없는 상황에서 section 처리?
**Answer:** 3-4개 placeholder cinematic 이미지 + 짧은 카피 ("AI로 재탄생한 K-POP 뮤직비디오", 등). Post-launch 실제 case 교체. Unsplash 고화질 cinematic 샘플 활용 (license 체크 — 대부분 OK, 최종 체크 야기).
**Rationale:** 빈 섹션은 어색. 실제 case 수집까지 약 1-2달.
**Applies:** G8-B.

### Q-079: App shell 의뢰 entry point

**Asked context:** UX
**Question:** App shell 내에서 "의뢰하기" 버튼 어디?
**Answer:** Client는 sidebar "작업 > 의뢰 작성" + global CTA 가능. Creator/Studio는 `/app/discover` 사이드바 메뉴로 의뢰 탐색.
**Rationale:** Role별 primary action 명확화.
**Applies:** G2 middleware + sidebar mapping.

### Q-080: Phase 2.7 SHIPPED 후 Phase 2.6 FU 정리?

**Asked context:** Phase 2.6에 9개 FU carryforward 있음
**Question:** Phase 2.7 G9 closeout에서 Phase 2.6 FU 도 포함 처리?
**Answer:** NO. Phase 2.6 FU는 Phase 2.7 범위 밖. G9 closeout에서 FU-2.7 전용 목록만 등록. Phase 2.6 FU는 별도 sweep phase (Phase 2.7.1 또는 Phase 2.8 security sweep 예정).
**Rationale:** Scope creep 방지.
**Applies:** G9 closeout.

---

### Q-081: Codex CLI 호출 방식 (gpt-5.5 / 0.125.0+)

**Asked context:** Phase 2.8 G_B-1 Loop 2 — KICKOFF §3 INVOKE 블록의 `codex --model ... --prompt ...` 패턴이 22분 hang. Builder가 spec 그대로 호출 → `codex` (no subcommand) = interactive TUI 진입 → stdin 영원히 대기.
**Question:** Codex CLI 를 non-interactive 로 호출할 때 정확한 invocation pattern?
**Answer:** 다음 3개 규칙 강제:
1. Subcommand `exec` 필수 (`codex exec`, NEVER bare `codex`). Bare `codex` 는 interactive TUI 진입 → stdin 무한 대기.
2. Prompt 전달은 stdin pipe 또는 positional argument. `--prompt` flag 는 **존재 안 함**.
3. Reasoning effort 는 `-c model_reasoning_effort=high` config override (CLI shortcut flag `--reasoning-effort` 는 버전별로 unreliable).
4. gpt-5.5 model 은 Codex CLI 0.125.0+ 필수. 0.122.0 미지원.

표준 PowerShell pattern (UTF-8 강제 필수 — 한국어/이모지/non-ASCII 깨짐 방지):
```powershell
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Get-Content prompt.md -Encoding UTF8 -Raw | codex exec --model gpt-5.5 -c model_reasoning_effort=high > output.txt
```

또는 positional argument 패턴 (stdin 회피, 안전):
```powershell
$prompt = Get-Content prompt.md -Raw -Encoding UTF8
codex exec --model gpt-5.5 -c model_reasoning_effort=high $prompt > output.txt
```
표준 bash pattern:
```bash
cat prompt.md | codex exec --model gpt-5.5 -c model_reasoning_effort=high > output.txt
```
**Rationale:** 공식 OpenAI Codex docs (developers.openai.com/codex/cli/reference + /noninteractive) 직접 검증. PR #15917 에서 prompt-plus-stdin 패턴 도입. `--prompt` flag 는 모든 0.12x 버전에서 invalid.
**Applies when:** 향후 모든 phase 의 K-05 review invocation, 또는 Codex 를 non-interactive 로 부르는 모든 자동화 코드. KICKOFF §3 작성 시 자동 참조.
**Confidence:** HIGH (공식 docs + 실전 확인 + encoding incident 2026-04-26 K-PUX 1차 시도)
**Registered:** 2026-04-26 (Phase 2.8 G_B-1 Loop 2 incident, web Claude verification against developers.openai.com)
**Updated:** 2026-04-26 (K-PUX-1 1차 시도에서 PowerShell cp949 → UTF-8 fix 추가. 한국어 prompt 가 ?로 변환되는 incident.)

**추가 주의:** Codex 사용량 한도 (token limit) 도달 시 "You've hit your usage limit" 오류. high reasoning + 큰 prompt 는 토큰 빠르게 소모. 한도 초과 시 reset 시각까지 대기 또는 다른 model (gpt-5.4) 시도.

---

### Q-082: HIGH-A-SCHEMA-ONLY severity 분류 (K-05 review)

**Asked context:** Phase 2.8 G_B-1 Loop 1 — Codex 가 K05-G_B_1-01 을 HIGH-A (privilege escalation) 로 표시. KICKOFF §3 spec 상 HIGH-A 는 "loop 카운트와 무관 즉시 HALT". Builder 가 auto-fix 결정 (spec 위반). 야기 검토 결과 fix 정확 + production data 0건이라 retroactively reasonable.
**Question:** K-05 가 HIGH-A 로 분류한 finding 중 "schema/RLS only, no prod data, additive fix" 케이스를 어떻게 다룰까?
**Answer:** 새 severity sub-category `HIGH-A-SCHEMA-ONLY` 도입. 정의:
- privilege escalation 또는 RLS 우회가 schema/RLS layer 에만 존재
- production data 노출 0 (migration not yet applied to prod, 또는 빈 테이블)
- 제안된 fix 가 precise + additive (기존 정상 흐름 영향 X)

위 3 조건 모두 만족 시 처리:
- Loop 1 auto-fix 허용 (HALT 안 함)
- Loop 2 mandatory re-verify 필수 (Codex 재호출)
- Loop 2 에서 같은 severity 재발견 시 즉시 HALT

조건 1개라도 미충족 → 그냥 HIGH-A 로 처리, KICKOFF §3 원본 spec (즉시 HALT) 따름.
**Rationale:** Pure HIGH-A 는 prod 손상 위험 즉시 차단해야. 그러나 schema-only 는 prod 미노출 + fix 정확 시 auto-fix 가 stop-the-world 보다 안전. Phase 2.8 KICKOFF §3 retrofit 으로 spec 화 (web Claude, 2026-04-25).
**Applies when:** 다음 phase 의 K-05 review 에서 HIGH-A finding 발생 시 Builder triage. KICKOFF §3 작성 시 SEVERITY HANDLING 블록에 자동 포함.
**Confidence:** HIGH (Phase 2.8 G_B-1 실전 + spec retrofit 완료)
**Registered:** 2026-04-26 (Phase 2.8 G_B-1 Loop 1 retrofit, KICKOFF v2 §3 patched)

---

### Q-083: 라이브러리 monorepo 의 transitive dep 직접 추가

**Asked context:** Phase 2.8 G_B-3 — `Node.create` / `mergeAttributes` 가 `@tiptap/core` 에 있음. SPEC §7 stack list 는 `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` 3개만 명시. pnpm strict-mode hoisting 으로 transitive 직접 import 차단. 4번째 `@tiptap/*` 추가가 KICKOFF §7 FORBIDDEN "new dep not in SPEC §7 → HALT E_DEP_UNLISTED" 위반인가?
**Question:** SPEC §7 에 명시된 라이브러리 family 의 같은 monorepo 내 sibling package 추가 시 HALT 처리?
**Answer:** NO HALT. 다음 조건 모두 만족 시 "informational addition" 으로 ship + FU 등록:
- 추가하려는 package 가 SPEC §7 명시 package 들과 같은 monorepo / 같은 publisher (예: `@tiptap/*`, `@radix-ui/*`, `@supabase/*`)
- 같은 major.minor 버전 pin (예: 기존 3.22.4 면 새 sibling 도 3.22.4)
- 새 functional dependency 가 아닌 foundation/utility 성격 (다른 공식 package 들의 base)

조건 미충족 (다른 publisher / 다른 product / functional 변경) → KICKOFF §7 FORBIDDEN 그대로 HALT E_DEP_UNLISTED.
**Rationale:** SPEC §7 의 "stack list" 는 라이브러리 family identity 를 정의하는 게 목적. 같은 monorepo sibling 은 같은 라이브러리의 다른 entry point — 기능 확장 아님. Strict reading 은 false-positive HALT 만 양산.
**Applies when:** 향후 모든 phase 의 dep 추가 결정. KICKOFF §7 FORBIDDEN 작성 시 "new dep" 정의에 자동 참조 ("new dep = different publisher OR different product, NOT same-monorepo sibling").
**Confidence:** HIGH (Phase 2.8 G_B-3 실전 + FU-2.8-tiptap-core-spec-amendment 일반화)
**Registered:** 2026-04-26 (Phase 2.8 G_B-3 dep addition decision)

---

### Q-084: Product 정체성 — Workspace 가 아니라 Workshop

**Asked context:** Phase 2.8 SHIPPED 후 product strategy 재정리. 야기가 "YAGI Workspace" 라는 단어 사용 했는데, 이건 Notion/Slack/Linear 의 평등한 멤버십 모델 연상. 우리 product 본질은 비대칭 — YAGI = vendor/host, 클라이언트 = visiting client. "Workshop" 이 더 정확.
**Question:** Product 정체성 / 모든 사용자 노출 라벨을 무엇으로?
**Answer:** **YAGI Workshop**. 다음 라벨링 규칙:
- 회사명 + product 명 일치 (㈜야기워크숍 = YAGI Workshop)
- 영문 라벨 "YAGI Workshop" 한국어 UI 에서도 그대로 (또는 "YAGI 작업실")
- 클라이언트가 만드는 단위 = `Project` (under YAGI Workshop)
- repo / Next.js app 이름 `yagi-workshop` 그대로 (이미 일치)
- 어떤 surface 에서도 "Workspace" 단어 노출 금지

Mental model 명시:
- YAGI = Workshop host (vendor, asymmetric host권한)
- 클라이언트 = visiting client (guest, project-scoped 권한)
- 크리에이터 (Phase 3.0+) = Contest 참여자 (Workshop 본체 미노출)
**Rationale:** "Workspace" 는 평등한 멤버십 SaaS (Notion/Slack/Linear) mental model 강제. 우리 product 는 agency/vendor model (Frame.io/Webflow client portal) 이므로 "Workshop" 단어가 정확한 매핑. 회사명 + product 일치는 마케팅 비용 절감.
**Applies when:** 모든 카피/SPEC/i18n key/마케팅 자료에서 product 라벨링 결정. "Workspace" 단어 등장 시 "Workshop" 또는 "Project" 로 치환.
**Confidence:** HIGH (야기 직접 확정 2026-04-26)
**Registered:** 2026-04-26 (post Phase 2.8 SHIPPED, product strategy realignment)

---

### Q-085: Workshop ↔ Contest 관계 모델

**Asked context:** Phase 3.0+ 에 Contest surface 본격 출시 예정. Workshop 본체와 Contest 의 관계 정의 필요. 두 모델 비교:
- 모델 X: 완전 별 product, schema/UI/auth 강한 분리, Contest winner ↔ Workshop project 자동 binding 없음
- 모델 Y: Workshop이 Contest 의 backend, Contest 자체가 Workshop 합의 cycle 의 한 진입점
**Question:** Workshop ↔ Contest 관계?
**Answer:** **모델 X — 완전 분리.** 함의:
- Workshop 과 Contest 는 별개 product 처럼 운영
- DB 테이블 중첩 없음 (`projects` ↔ `challenges` schema 독립, FK 없음)
- UI 진입 흐름 분리 (사이드바 그룹 분리, navigation 분리)
- Auth/role 모델 분리 (Workshop = workspace_admin/member + yagi_*; Contest = challenge_sponsor + creator + viewer/voter)
- Sponsor 가 Contest 만들 때 Workshop project 자동 생성 X
- Contest winner 가 Workshop project 의 deliverable 로 자동 binding X
- 우연한 사용자 cross (sponsor 가 클라이언트 이기도 하면) 는 같은 user account 쓰지만 surface 는 분리
**Rationale:** 두 product 의 권한/auth 모델이 너무 다름. 통합하면 RLS 복잡도 폭증 + IA 흐림. "AI 제작 합의 시스템" 가치는 Workshop 만으로 충분히 전달 가능. Contest 는 별 카테고리 product (캠페인 marketplace).
**Applies when:** Phase 3.0+ Contest SPEC 작성. Workshop 의 Phase 2.x feature 가 Contest 와 연결될 가능성 검토 시 "별 product" 가정 우선.
**Confidence:** HIGH (야기 직접 확정 2026-04-26)
**Registered:** 2026-04-26 (post Phase 2.8 SHIPPED, Phase 3 prep)

---

### Q-086: monday MVP launch Contest surface 노출

**Asked context:** g3-challenges worktree 의 admin console (`/app/admin/challenges*`) 가 main 에 SHIPPED. main 에 `/app/challenges` (creator-facing public surface) 미존재. 사이드바의 "챌린지" 메뉴는 `yagi_admin only`. monday MVP launch 시 Contest 노출 어떻게?
**Question:** Contest surface MVP launch 노출 정도?
**Answer:** **(c) 일부 surface 작동** — 현재 g3 SHIPPED scope 그대로:
- `/app/admin/challenges*` admin console 작동 (yagi_admin 만 접근)
- 사이드바 "챌린지" 메뉴 yagi_admin only 그대로 (변경 없음)
- 클라이언트 view / creator-facing public surface 는 의도적 hidden (Phase 3.0+ 출시)
- 추가 작업 0 — 현재 상태 그대로 ship
**Rationale:** Workshop 본체와 Contest 의 강한 분리 (Q-085) 에 자연 부합. yagi_admin only 노출은 internal tooling 으로 분류, 클라이언트 view 미노출로 Workshop client portal 정체성 보존. 별 work 추가 없이 ship 가능 = monday launch 일정 압박 0.
**Applies when:** monday MVP launch 직전 사이드바 / admin surface 점검. Phase 3.0+ Contest 본격 SHIPPED 까지 유지.
**Confidence:** HIGH (야기 직접 확정 2026-04-26 + main repo 검증)
**Registered:** 2026-04-26 (Phase 3 prep)

---

### Q-087: Creator Profile MVP 노출

**Asked context:** Creator Profile (`/c/{handle}` public profile pages) 는 Contest 참여자의 공개 정체성. Workshop 본체에 노출 시 "client portal" → "marketplace" 정체성 흔들림. 야기는 Phase 3 까지 빠르게 진행 의도.
**Question:** Creator Profile MVP 포함?
**Answer:** **NO — Phase 3.0+ 에 Contest 와 같이 노출.** 함의:
- main 에 `/c/{handle}` 라우트 미존재 또는 hidden
- Workshop 사이드바에 creator profile 진입 link 없음
- 클라이언트가 크리에이터를 직접 매칭하는 "marketplace" 모델 명시적 거부
- Phase 3 에 Contest 본격 출시 시 같이 노출
- Phase 3 ETA: 야기 의도 "빠르게 진행" → 약 4-6주 (Phase 2.8.1 hardening + Phase 2.10 Workshop 본체 완성 후 곧바로 Phase 3 진입)
**Rationale:** Workshop 의 정체성은 "private 작업실 포탈" (Q-084). Creator Profile 노출은 product 카테고리를 client portal → marketplace 로 자동 이동시킴. MVP 단계에서 이 흔들림 회피 필수.
**Applies when:** MVP launch 까지 모든 카피/UI/사이드바에서 creator profile 또는 "크리에이터 매칭" 단어 노출 결정. Phase 3.0 SPEC 진입 시 이 결정 unlock.
**Confidence:** HIGH (야기 직접 확정 2026-04-26)
**Registered:** 2026-04-26 (Phase 3 prep)

---

### Q-088: ProfileRole 모델 단순화 (4 → 2)

**Asked context:** Phase 2.8.1 G_B1-X (signup 후 manual K-PUX) — 야기가 onboarding role 선택 화면을 보고 4개 로을 "AI 크리에이터/스튜디오 + 의뢰인" 2개로 압축 결정. 결정 근거:
- "스튜디오 + 크리에이터" = 둘 다 제작자 그룹
- "의뢰인" = AI VFX 의뢰하는 해당 계층의 카테고리
- "관찰자 (viewer/voter)"는 가입 강제 자체가 too heavy — 이메일 OTP 으로만 투표 가능해야 함 (Q-089)
**Question:** ProfileRole 모델 재구조 범위 및 방식?
**Answer:** 다음 규칙 적용:
1. UI surface (onboarding role page) 에서 카드 2개만 노출: `creator` (label "AI 크리에이터/스튜디오") + `client`. `studio` / `observer` 카드 제거.
2. TypeScript ProfileRole type은 4개 그대로 유지 (`'creator' | 'studio' | 'observer' | 'client'`) — legacy 프로필 데이터 보호.
3. Legacy 데이터 처리:
   - 기존 `studio` profile: redirect / display 로직에서 `creator` 와 동일하게 취급 (이미 onboarding/role/page.tsx 에 `role === "creator" || role === "studio"` 분기 존재).
   - 기존 `observer` profile: `/challenges` 로 redirect (legacy escape hatch).
   - 새 가입자는 `creator` 또는 `client` 만 선택 가능.
4. DB migration 안 함 — `profiles.role` text column 그대로, legacy 값 보존.
5. Type narrow 는 Phase 3.0 진입 시 — 그 시점에 challenges surface 재구성과 함께 cleanup. 그때까지 challenges/sidebar/email template 등 기존 `studio`/`observer` 분기 코드 12개 파일 그대로 작동.

**Rationale:** "관찰자 가입 강제는 too heavy" 관점 — viewer/voter 는 "일회성 가벼운 사용자" 라 가입 마찰이 signal이 아니라 noise. anonymous OTP 가 맞음. "크리에이터 vs 스튜디오" 분리는 product 레벨에서 의미 있으나 onboarding signup 수준의 의제는 아님 — 둘 다 "제작자" 그룹.

DB migration 안 하는 이유: monday MVP launch 직전에 prod 데이터 터치는 것은 risk too high. Phase 3.0 에서 challenges 재구성과 함께 cleanup 시 가치 회수.

**Applies when:** 향후 onboarding / sidebar / email template 의 role 분기 코드 작성 시. Phase 3.0 진입 시 이 결정 unlock + DB migration + type narrow 일괄 실행.
**Confidence:** HIGH (야기 직접 확정 2026-04-26)
**Registered:** 2026-04-26 (Phase 2.8.1 G_B1-X simplification)

---

### Q-089: viewer/voter (관찰자) 는 anonymous OTP

**Asked context:** Q-088 의 관점 확장 — viewer/voter 에게 가입 강제는 마찰이 높아 product mental cost 과합. Phase 3.0+ Contest 출시 시 투표 surface 의 적절한 auth 패턴은?
**Question:** Contest 투표 사용자 auth 패턴?
**Answer:** Anonymous OTP 패턴:
- 투표 시 이메일 입력 → 6자리 OTP 코드 링크 발송 → 투표
- profile 생성 안 함, `profiles.role` 값 안 넘김
- 대신 `contest_voters` 테이블 도입 예정 (Phase 3.0 SPEC 도입)
  - 필수 컬럼: `email`, `verified_at`, `ip_hash` (rate limit)
  - vote table 은 `contest_voters.id` FK 또는 hashed email
- 관찰 (단순 열람) 은 가입 / 투표 다 불필요 — public read 만으로 충분
- 이메일 rate limit (시간당 5표 / IP), 같은 contest 에 동일 이메일 재사용 차단

**Rationale:** "Role 4 viewer/voter는 후순위" framing 과 일치. Contest sponsor 관점에서도 "투표 수 높이는 게 목표" → 가입 과정 마찰 제거 = 더 많은 vote. anonymous OTP 는 이미 한국 투표 surface (아이돌 투표 등) 에서 증명된 패턴.
**Applies when:** Phase 3.0 Contest SPEC 작성 시 voting auth 설계. profile 기반 투표 완전 차단.
**Confidence:** HIGH (야기 직접 확정 2026-04-26)
**Registered:** 2026-04-26 (Phase 2.8.1 G_B1-X side-effect, Phase 3.0 prep)

