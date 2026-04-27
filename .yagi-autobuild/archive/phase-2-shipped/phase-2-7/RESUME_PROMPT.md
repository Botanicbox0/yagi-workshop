# Phase 2.7 — Resume Prompt v2

**Status:** READY TO PASTE into Builder (현재 G1 halt 상태)

야기는 이걸 그대로 복사해서 Builder 창에 붙여넣음. 한 번에.

---

## Paste 시작 ↓↓↓

SPEC v1 폐기. v2 작성 완료. 야기 결정: Option 1 (축소 + 월요일 soft launch).

### 변경 핵심 요약

**v1 → v2 차이:**
- 9 gates → 5 gates
- 7 새 테이블 → 2 새 테이블 + 1 컬럼 (`clients`, `commission_intakes`, `challenges.sponsor_client_id`)
- Full marketplace → Intake form (admin manual response)
- Premium redesign 풀 → Landing + /commission 2 페이지만
- 33-46h → 18-25h (월요일 SHIPPED 가능)

**Schema drift 해결:**
- `projects` 테이블 NOT created (Phase 1.x 충돌). 대신 `commission_intakes` 새로 생성.
- `project_milestones` / `project_deliverables` / `project_proposals` / `project_contracts` / `project_messages` 모두 **NOT created in Phase 2.7** — Phase 2.8+ 로 deferred.
- 기존 Phase 1.2 `projects` workspace-scoped 그대로 유지.

**비즈니스 모델 재정확:**
- AI VFX 의뢰 = 단순 intake form (영상 URL + brief markdown + timestamp 텍스트 메모). Interactive timeline annotation player는 Phase 2.8.
- Sponsored challenge = 기존 Phase 2.5 challenges 인프라 + `sponsor_client_id` 컬럼 1줄. 별도 mechanism 없음.

### 즉시 read 필수

1. `.yagi-autobuild/phase-2-7/SPEC.md` (v2, 511 lines)
2. `.yagi-autobuild/phase-2-7/IMPLEMENTATION.md` (v2, 396 lines)
3. v1은 archive (`v1-archive/SPEC_v1_archived.md`) — 참고 X

### Gate 구조 (5 gates)

- **G1** — Schema + RLS + Sidebar adapter (3-4h)
- **G2** — Client signup + intake form (5-6h)
- **G3** — Admin queue + sponsor challenge + landing redesign (6-8h)
- **G4** — Polish + integration smoke (2-3h)
- **G5** — Codex K-05 + closeout (2-4h + hardening loops)

Total: 18-25h. ULTRA-CHAIN MODE. 월요일 새벽 공개 목표.

### 전제 확인 (자동 실행 first thing)

```bash
# Phase 2.5/2.6 landing
test -f src/lib/app/scopes.ts && grep -q "export function getUserScopes" src/lib/app/scopes.ts
grep -q "ADR-010" docs/design/DECISIONS.md
test -f src/lib/challenges/queries.ts

# Existing projects table (Phase 1.2) MUST exist (NOT to be touched)
# 단, Builder는 schema audit 시 이걸 'Phase 1.x용 보존 대상'으로 인식해야 함

# main 브랜치 상태
git status --short
git log --oneline -5

# R2 commission bucket
grep -q "CLOUDFLARE_R2_COMMISSION_BUCKET" .env.local || echo "WARNING: yagi-commission-files bucket 미설정 — G2 upload 단계까지 유예 가능"
```

EXIT=0 만족 시 G1 진행. R2 누락은 G2까지 유예.

### G1 task plan (cleared from previous halt)

**FILES TO CREATE:**
- `supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql` (SPEC v2 §3 SQL 그대로)
- `src/lib/commission/types.ts` (IMPLEMENTATION §2 type definitions)
- `src/lib/commission/schemas.ts` (Zod schemas)

**FILES TO MODIFY:**
- `src/components/app/sidebar.tsx` — items 배열에 client role / admin commission 노드 추가 (IMPLEMENTATION §4 패턴)
- `src/lib/supabase/database.types.ts` — `pnpm supabase gen types` 후 regen

**SQL 적용 방법:**
- Supabase MCP `execute_sql` 또는 migration apply
- 적용 후 verify:
  - `\d clients` shape 정확
  - `\d commission_intakes` shape 정확
  - `\d challenges` 에 `sponsor_client_id` column 추가됨
  - RLS policy listing 으로 8개 policy 확인 (clients 3개 + commission_intakes 4개 + state trigger 1개)

**Acceptance:**
- `pnpm exec tsc --noEmit` EXIT=0
- `pnpm lint` EXIT=0
- Sidebar render 시 client role / admin role / 기타 role 모두 정상

**Commit:** `feat(phase-2-7 g1): commission intake schema + sidebar adapter`

### ULTRA-CHAIN policy

1. Gate SHIPPED (barrier PASS + closeout committed) 즉시 다음 Gate 자동 진입, 야기 승인 불필요
2. SPEC v2 + IMPLEMENTATION v2 가 source of truth. Cache는 Phase 2.5/2.6 Q-001~045 + Q-046~080 (v1 흔적, 일부 v2에 무효 — 새 구조와 충돌 시 v2 우선)
3. Cache MISS 시 SPEC/IMPLEMENTATION default recommendation 채택
4. 승인 요청 문구 금지

### Codex K-05 loop budget (G5)

- Loop 1-2: finding → hardening → re-run
- Loop 3 (hard stop): 잔존 HIGH 시 자동 Downgrade (FU 등록 후 ship)

### MVP context severity triage

HIGH-C self-corruption only / no cross-user leak / no privilege escalation / app-layer validation 존재 → MED auto-downgrade 허용.

**Phase 2.7 특별 주의 영역 (downgrade 금지):**
- Client PII (email, phone, company info) cross-tenant leak
- Commission intake content leak (한 client의 brief를 다른 client가 봄)
- Sponsor 정보 cascade 오작동 (challenge 가 잘못된 sponsor 참조)
- signup role 'client' bypass (아무나 client role 행세)

### Stop triggers

- Codex G5 K-05 HIGH-A
- SPEC v2 drift (예: G2에서 `projects` 테이블 또 건드림 — v1 폐기 사유 재발)
- build/tsc/lint fail 2회 연속
- G1 migration apply 실패 → 즉시 halt
- R2 bucket 미생성 + G2 upload 단계 도달 시 → halt + 야기 알림

### Telegram

- Gate SHIPPED: 한 줄
- Halt: 즉시 + reason
- G3 Landing redesign 완료 시 visual review 요청 (Telegram + screenshot 권장)

### 체인 종료

G5 closeout → Phase 2.7 SHIPPED → chain STOP → 야기 visual review:

1. `/` landing 재구성
2. `/commission` sales page
3. Client signup → intake form 전체 flow
4. Admin queue → response flow
5. Sponsor challenge create + public 표시
6. Phase 2.5/2.6 regression (challenges + sidebar/scope)
7. Mobile <768px 모든 새 surface

Visual PASS → MVP launch 준비 (월요일 새벽).

### Execution policy

- 파일 생성/수정/삭제: SPEC v2 + IMPLEMENTATION v2 범위 내면 승인 불필요
- Dep 추가 금지 (기존 react-markdown / framer-motion / lucide-react / R2 client 활용)
- Schema 변경: G1만 허용 (외 추가 migration 시도 → halt)
- Git commit: `feat(phase-2-7 g{K}): <summary>` or `chore(phase-2-7 g{K}): <summary>`

### 시간표

- 토 오전 (지금): G1 (3-4h) → SHIPPED 점심 전후
- 토 오후: G2 (5-6h) → SHIPPED 저녁
- 토 밤: G3 시작 (6-8h)
- 일 새벽-아침: G3 완료 + G4
- 일 오후: G5 Codex
- 일 저녁: Phase 2.7 SHIPPED 기대
- 일 밤: MVP final polish + 런칭 자료
- 월 새벽: 🚀 공개

기존 G1 task plan 무효화. 새 v2 plan 으로 즉시 재시작. 

실행 개시.

---

## ↑↑↑ Paste 끝
