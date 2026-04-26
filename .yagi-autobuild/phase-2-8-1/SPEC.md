# Phase 2.8.1 — Hardening (Workshop polish + product strategy realignment)

**Status:** v1 draft (web Claude 2026-04-26, post Phase 2.8 SHIPPED)
**Duration target:** 4–5 working days (single worktree, no parallel)
**Predecessor:** Phase 2.8 G_B SHIPPED (commit a969aa7) + post-SHIPPED form-action fix (current commit)
**Successor:** Phase 2.10 (Workshop 본체 완성 — status machine + 승인/마감 flow)
**Branch:** `g-b-1-hardening` (single worktree, linear)

---

## §0 — Why this phase

Phase 2.8 G_B (Brief Board) SHIPPED 직후 발견된 두 종류의 갭:

1. **기능 갭 11개** — Phase 2.8 worktree FOLLOWUPS.md에 등록된 deferred items. 대부분 cosmetic / informational 이지만, **wizard Step 3 통합** 과 **SSRF redirect rewrite** 두 개는 사용자 가치 / 보안 임팩트 명확.
2. **Product strategy realignment** — 야기 결정 (DECISIONS_CACHE Q-084 ~ Q-087) 으로 product 정체성을 "Workspace" 에서 "Workshop" 으로 표준화. 코드/카피/SPEC 전반에 잠재된 "Workspace" 단어 sweep 필요.

추가로:
- Phase 2.8 SHIPPED 후 admin smoke 에서 발견된 **form action RSC anti-pattern** (이미 핫픽스 적용, 영구 차단 메커니즘 필요)
- Phase 2.7.2 wizard 정리 시 남긴 **dead code** (proposalSchema, intake_mode_* / proposal_* / nav.commission i18n keys)

이 phase는 **Workshop 본체의 v1 완성도** 를 끌어올리는 정리 phase. v2 새 feature 추가는 Phase 2.10에서.

---

## §1 — Scope (sub-gates)

| Sub | Theme | Effort |
|---|---|---|
| **G_B1-A** | Form action ESLint rule + sweep | 0.5 day |
| **G_B1-B** | Wizard Step 3 → BriefBoardEditor (draft mode) 통합 | 1.5 days |
| **G_B1-C** | SSRF defense-in-depth (3 FU 묶음) | 0.5 day |
| **G_B1-D** | "Workspace" → "Workshop" terminology sweep | 0.5 day |
| **G_B1-E** | Phase 2.7.2 + 2.8 dead code 정리 | 0.5 day |
| **G_B1-F** | Trivial UX polish (tabs i18n, saveVersion RPC, R2 round-trip test) | 0.5 day |
| **G_B1-G** | Korean IME e2e + Playwright wiring | 1 day |

**총합:** 5 days. Phase 2.10 진입 직전 buffer 0 (한 주 안에 SHIPPED).

---

## §2 — G_B1-A — Form action ESLint rule + sweep

### Trigger
Phase 2.8 SHIPPED 직후 admin 진입 시 Server Component 의 `<form action={async (fd) => await fn(fd)}>` 패턴이 Next.js 15 RSC 직렬화 깨짐 → Runtime Error. 2개 파일 발견 (page.tsx, reference-grid.tsx), 핫픽스 적용. tsc는 통과하지만 runtime 에서만 발현 → defense-in-depth 필요.

### Scope
1. ESLint custom rule 작성 — Server Component (no `"use client"` directive) 안의 JSXAttribute `action={ArrowFunctionExpression(async)}` 패턴 차단.
2. CI step 추가 — `grep -r 'action=\{async' src/` exit code != 0 시 build fail.
3. 전체 `src/` sweep 1회 (현재 0건이지만 baseline 박음).

### EXIT
- [ ] `eslint.config.mjs` 에 custom rule 추가 또는 `eslint-plugin-react-server-components` 도입
- [ ] `pnpm lint` 가 새 rule 검증 (안티 패턴 시도 시 error)
- [ ] CI grep step 작성 (`scripts/check-rsc-form-action.sh` + GitHub Actions step)
- [ ] tsc + lint exit 0

### FAIL on
- ESLint rule false-positive 다수 (10+ legitimate occurrences 차단)
- CI grep step이 정상 server action을 false flag

### Rationale
이 anti-pattern은 type-check 통과하지만 runtime에서만 깨짐. dev/staging 에서 그 surface 안 들어가면 prod 까지 sneak in. 기계적 차단 필수.

---

## §3 — G_B1-B — Wizard Step 3 → BriefBoardEditor 통합

### Trigger
Phase 2.8 G_B-7 EXIT 에서 partial integration ship — wizard Step 3 는 여전히 "기획 보드 — 준비 중" placeholder, brief 편집은 project 생성 후에만 가능. FU-2.8-wizard-step3-draft-pattern 에 deferred. 사용자 가치 90% → 100% 끌어올리는 작업.

### Scope
1. `ensureDraftProject(workspaceId, brandId?)` server action 추가 — INSERT projects with `status='draft'` if no draft exists, else return existing draft id.
2. Wizard Step 3 mount 시 `ensureDraftProject` 호출, draft project_id 반환받아 `<BriefBoardEditor mode='wizard' projectId={...} />` 렌더.
3. Wizard submit 흐름 변경: createProject INSERT 대신 `submitDraftProject(projectId, allFields)` UPDATE + `status='submitted'` flip.
4. Wizard Step 3 의 "건너뛰기" 버튼 → "다음" 으로 라벨 변경 (placeholder 시절 일부러 skip CTA 였음).
5. Draft cleanup cron (FU-2.8-draft-gc): 7일 이상 빈 content draft project 자동 archive.

### EXIT
- [ ] `ensureDraftProject` server action 작동 (RLS 검증: 본인 workspace 만 draft 생성 가능)
- [ ] Wizard Step 3 에서 image/file/embed 직접 입력 가능
- [ ] Wizard submit 시 draft → submitted 전환 (새 row INSERT 아님)
- [ ] e2e: wizard 시작 → Step 3 에서 텍스트 + 이미지 1장 + youtube embed 1개 입력 → submit → `/app/projects/[id]?tab=brief` 에서 동일 내용 보임
- [ ] Draft cleanup cron 작동 (또는 FU 로 deferred)
- [ ] tsc + lint + build exit 0

### FAIL on
- 같은 user 가 여러 draft 동시 생성 (race condition)
- wizard submit 실패 시 draft 가 zombie 로 남음

### Rationale
Brief Board 의 핵심 가치는 "기획을 처음부터 자유롭게 담는 공간". 현재 v1 은 "프로젝트 만든 후에야 가능" 이라는 두 단계 분리가 UX 갭. 이 통합으로 Phase 2.8 의 본질이 wizard 진입부터 작동.

---

## §4 — G_B1-C — SSRF defense-in-depth

### Trigger
Phase 2.8 K-05 review loop 1 (K05-PHASE-2-8-03), loop 3 (LOOP3-01, LOOP3-02) 에서 발견된 3개 SSRF 갭 — 모두 MED severity 로 ship 됐지만 정리 가치 명확.

### Scope (FU-2.8-ssrf-redirect-rewrite + FU-2.8-ssrf-cgn-prefix + FU-2.8-ssrf-ipv6-compat-hex)
1. `fetchOgFallback`: `redirect: 'follow'` → `redirect: 'manual'`. 각 redirect target에 `isHostnameSafe` 재실행. 5 hop cap.
2. `isPrivateIpv4Octets`: CGN range 정확화. `/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./` regex.
3. `isPrivateIp` (IPv6 compat hex): `::a:b` 형태 hex IPv4-compatible 도 차단.

### EXIT
- [ ] 3개 fix 적용
- [ ] `scripts/test-ssrf-defense.mjs` 추가 — 각 케이스 unit test
- [ ] redirect chain 5 hop attack vector 차단 검증
- [ ] CGN range edge cases (100.65.0.1, 100.127.255.255) 차단 검증
- [ ] IPv4-compat IPv6 (`::7f00:1`) 차단 검증
- [ ] tsc + lint + build exit 0

### FAIL on
- redirect manual mode 가 정상 OG fetch 깨뜨림 (false-positive)
- CGN regex 가 RFC 6598 범위 벗어남

### Rationale
세 갭 모두 signed-in user only 라 blast radius 작지만, defense-in-depth 원칙 + 1줄 fix 들이라 한 번에 정리. K-05 review가 잡은 발견을 wasted 하지 않게.

---

## §5 — G_B1-D — "Workspace" → "Workshop" terminology sweep

### Trigger
DECISIONS_CACHE Q-084 결정 — product 정체성 라벨 "Workshop" 표준화. 기존 코드/카피/SPEC 에 "Workspace" 단어 잠복 가능성.

### Scope
1. 전체 `src/` sweep — `Workspace` 단어 grep, 컨텍스트 별 분류:
   - **DB column / type 이름** (`workspace_id`, `workspace_admin`, `workspace_member`) → 그대로 유지 (RLS / migration 영향, 내부 구현 용어로 OK)
   - **사용자 노출 라벨** (UI 카피, i18n key value) → "Workshop" 또는 "Project" 로 치환
   - **i18n key 이름** → 키 이름은 유지, 값만 변경 (브레이킹 변경 회피)
   - **변수명 / function 이름** → 그대로 유지
2. `messages/ko.json` + `messages/en.json` 의 모든 "Workspace" / "워크스페이스" value 검토 → "Workshop" / "워크샵" 으로 치환
3. `.yagi-autobuild/` 내 마케팅/SPEC 문서의 "Workspace" 출현 → "Workshop" 으로 치환 (단 archive/* 는 historical artifact 유지)
4. 사이드바 / 헤더 / footer 의 "yagi workshop" 표기 일관성 (sentence case "YAGI Workshop")

### EXIT
- [ ] `grep -ri 'workspace' src/components src/app messages` 결과 → DB/internal 만 남고 UI 카피 0건
- [ ] i18n consistency: ko/en 같은 key 의 value pair 검토 완료
- [ ] 사이드바 / footer / breadcrumb 모두 "YAGI Workshop" 또는 "Workshop" 표기
- [ ] tsc + lint + build exit 0
- [ ] 시각 검증: 야기가 모든 주요 surface 한번씩 클릭 → 일관성 확인

### FAIL on
- DB column name 실수로 변경 (migration 깨짐)
- i18n key 자체 rename (비호환 변경)

### Rationale
Q-084 결정의 mechanical 적용. UI 노출만 변경, internal 구현 용어는 보존.

---

## §6 — G_B1-E — Phase 2.7.2 + 2.8 dead code 정리

### Trigger
Phase 2.7.2 wizard 흐름 정리 시 의도적으로 보존한 dead code들. Phase 2.8 SHIPPED 직후 정리 가치 명확.

### Scope
1. `messages/ko.json` + `messages/en.json` 에서 dead i18n keys 삭제:
   - `intake_mode_*` (Step 0 picker 제거 후 사용 안 함)
   - `proposal_*` (proposal_request 흐름 제거)
   - `nav.commission` (사이드바에서 제거)
2. `src/app/[locale]/app/projects/new/actions.ts` 단순화:
   - `proposalSchema` + `discriminatedUnion` 제거
   - `briefSchema` only path
3. `projects.intake_mode` DB column 처리:
   - 결정: **C (그대로 유지)** — legacy proposal_request 데이터 손실 방지
4. `src/app/[locale]/app/projects/[id]/page.tsx` 의 `intake_mode === 'proposal_request'` 분기:
   - read-only legacy banner ("이 프로젝트는 이전 proposal mode 로 생성됨") 추가, 새 작성 path 없음

### EXIT
- [ ] dead i18n keys 삭제 + tsc 통과 (사용처 0)
- [ ] actions.ts 의 proposalSchema 제거, briefSchema only
- [ ] page.tsx 의 proposal_request 분기 read-only banner 적용
- [ ] tsc + lint + build exit 0

### FAIL on
- i18n key 삭제 후 사용처 1개 이상 발견 (i18n runtime error)
- proposal_request 가진 legacy project 가 페이지 깨짐

### Rationale
Phase 2.7.2 cleanup followup (Phase 2.8 SPEC §11). 새 contributor가 dead code 보면 confusion 유발.

---

## §7 — G_B1-F — Trivial UX polish

### Trigger
Phase 2.8 FU 중 1줄 ~ 2시간 이내 fix 들 묶음. 한 commit 으로 ship.

### Scope (FU-2.8-tabs-i18n + FU-2.8-saveversion-rollback + FU-2.8-r2-presign-roundtrip-test)
1. **tabs i18n**: `BriefTabsNav` 의 "Overview" / "Brief board" 하드코드 → `useTranslations('projects')`. 새 i18n key `tab_overview`, `tab_brief` 추가 (ko/en).
2. **saveVersion RPC**: server action 의 INSERT + UPDATE 두 단계를 `pg LANGUAGE plpgsql SECURITY DEFINER` RPC `save_brief_version(project_id, content_json, label)` 으로 단일 트랜잭션화.
3. **R2 round-trip test**: `scripts/test-r2-brief-asset.mjs` — service-role + fixture user 로 5MB JPEG upload + signed URL fetch 검증.

### EXIT
- [ ] 3개 fix 적용
- [ ] tabs i18n: ko/en 양쪽 작동
- [ ] saveVersion RPC: race condition test 통과 (동시 save 2회 → 충돌 0)
- [ ] R2 test: exit 0, latency < 5s
- [ ] tsc + lint + build exit 0

### FAIL on
- saveVersion RPC migration이 production data 깨뜨림 (rollback plan 필수)

### Rationale
모두 작은 fix 지만 user-visible. 한 phase 에서 묶어서 ship 하면 후속 phase 가 가벼워짐.

---

## §8 — G_B1-G — Korean IME e2e + Playwright wiring

### Trigger
Phase 2.8 FU-2.8-ime-smoke-manual + FU-2.8-playwright-e2e 묶음. 야기 manual 5분 smoke 했지만, 자동화 인프라 없으면 미래 회귀 발견 못 함.

### Scope
1. `@playwright/test` devDependency 추가 (1 new dep, SPEC §7 self-amend 허용)
2. `e2e/brief-board.spec.ts` 작성:
   - signin as client
   - wizard create + Step 3 입력 (한국어 텍스트 "안녕하세요" + image + youtube embed)
   - submit → `/app/projects/[id]?tab=brief` 도착 확인
   - admin user 로 로그인 → 같은 URL 에서 동일 내용 + 코멘트 작성
   - client 로 다시 로그인 → 알림 도착 확인
3. **한국어 IME 자동화**: Playwright `page.keyboard.insertText()` 또는 clipboard paste 로 한글 자모 결합 시뮬레이션 (real IME composition 은 OS 레벨이라 100% 자동화 불가, 90% coverage 목표)
4. `pnpm test:e2e` script 추가
5. CI step 에 e2e 추가 (optional, slow → nightly 권장)

### EXIT
- [ ] Playwright 설치 + 첫 spec 작동
- [ ] e2e 6개 step 모두 통과 (수동 실행)
- [ ] 한국어 텍스트 입력 시 자모 누락 0
- [ ] CI 에서 e2e 자동 실행 (또는 nightly cron)
- [ ] tsc + lint + build exit 0

### FAIL on
- Playwright 가 production build에서 깨짐 (dev-only 의존 추가 위반)
- e2e step 중 flaky (3회 연속 실행 시 1회 이상 실패)

### Rationale
Manual smoke는 1회성. 자동화 인프라가 다음 phase 의 회귀 catch.

---

## §9 — Out of scope (deferred)

### → Phase 2.10
- **Status machine 완성** — draft → submitted → in_discovery → in_production → delivered → approved → archived 모든 transition + UI
- **Brief Board status='locked' UX 강화** — lock 후 변경 요청 → fork 패턴
- **Approval flow** — 클라이언트의 명시 승인 action + 알림
- **Invoicing surface** — `invoices` 테이블 + UI (existing skeleton)
- **글로벌 search 에 brief 본문 인덱싱**
- **Block 단위 inline comment** (TipTap stable block id + threads anchor_block_id)

### → Phase 3.0
- Contest surface 본격 (admin console 외 클라이언트 view + creator-facing public surface)
- Creator Profile (`/c/{handle}` public pages)
- Workshop ↔ Contest **별 product** 운영 인프라

### → Phase 3.1+
- Real-time co-editing (Yjs / Liveblocks)
- AI-assisted brief generation
- Frame.io 풍 영상 timestamp annotation
- Mobile-optimized editor

---

## §10 — Risks & open questions

### R1 — Wizard Step 3 통합 시 기존 createProject 흐름 회귀
`new-project-wizard.tsx` 가 `createProject` 직접 호출. `ensureDraftProject` + `submitDraftProject` 로 분기 시 기존 path 가 깨질 위험.
**Mitigation:** feature flag `WIZARD_DRAFT_MODE` 환경 변수로 두 path 병행, 검증 후 default 전환.

### R2 — saveVersion RPC migration 시 zero-downtime
`saveVersion` server action 이 RPC 호출로 변경. RPC 함수 먼저 deploy → server action 변경 deploy 순서 보장.
**Mitigation:** migration 두 단계 분리. (1) RPC 함수 INSERT, server action 그대로. (2) server action 이 RPC 호출.

### R3 — Workspace → Workshop sweep 시 i18n 키 변경 실수
i18n key value 변경은 안전하지만 key 이름 자체 변경은 비호환.
**Mitigation:** key 이름 보존 강제. value만 변경.

### R4 — Playwright 추가가 SPEC §7 stack 위반?
이번 phase 에서 self-amend 허용 (HALT 안 함). Playwright 는 single-publisher new dep 이지만 testing infra 라 functional 변경 0. 이 phase 의 SPEC §7 amendment 자체에 Playwright 명시.

### Q1 — Feature flag 사용 방향성?
야기 의도: Phase 3 까지 빠르게. feature flag 도입은 maintenance cost.
- (a) feature flag 없이 G_B1-B 한 번에 배포 (속도 우선, 회귀 위험 수용)
- (b) feature flag 짧게 (1 sprint) 사용 후 제거 (안전 우선)

**추천:** **(a)** — Phase 2.10 진입 가속.

### Q2 — Phase 2.10 직후 Phase 3 진입 시 SPEC writer?
Phase 3 = Contest 본격 = 별 product. SPEC 분량 큼.
**추천:** Phase 2.10 SHIPPED 시점에 web Claude 가 Phase 3 SPEC v1 초안 + 야기 review.

---

## §11 — Definition of Done

전체 7개 sub-gate EXIT 모두 통과 + Codex K-05 review 통과 + main merge.

- [ ] G_B1-A: ESLint rule + sweep
- [ ] G_B1-B: wizard 통합
- [ ] G_B1-C: SSRF 3개
- [ ] G_B1-D: terminology sweep
- [ ] G_B1-E: dead code 정리
- [ ] G_B1-F: tabs i18n + saveVersion RPC + R2 test
- [ ] G_B1-G: Playwright e2e
- [ ] tsc + lint + build exit 0 (전체)
- [ ] Codex K-05 (gpt-5.5) PASS, 0 HIGH-A, 0 unhandled HIGH-B
- [ ] manual smoke (5분)

---

## §12 — Timeline budget

```
TARGET   = 5 working days
SOFT_CAP = 6 days
HARD_CAP = 8 days → HALT E_TIMELINE_OVERRUN

PER GATE (target h):
  G_B1-A = 4
  G_B1-B = 12
  G_B1-C = 4
  G_B1-D = 4
  G_B1-E = 4
  G_B1-F = 4
  G_B1-G = 8
  REVIEW = 2 (+ 4 per loop)
```

Total ≈ 42h work + 2h review = 5.5d. Buffer 0.5d → 5d 안에 SHIPPED 가능.

---

## §13 — END

```
ON SHIPPED: Phase 2.10 SPEC 즉시 작성 시작 (web Claude)
            Phase 2.10 = Workshop 본체 정의 100% 도달
            Phase 3.0 = Contest 본격 (별 product, 별 SPEC, 별 worktree)
```

Phase 3 ETA: Phase 2.8.1 (5d) + Phase 2.10 (~7d) + buffer = **약 3주 후 Phase 3 진입.**
