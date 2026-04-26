# Phase 2.8.1 — Hardening (Workshop polish + product strategy realignment + K-PUX integrity)

**Status:** v2 (web Claude 2026-04-27 00:30 KST, post Codex K-PUX absorption)
**Duration target:** 6–7 working days (single worktree, no parallel)
**Predecessor:** Phase 2.8 G_B SHIPPED (commit a969aa7) + auth/role/RSC catch-up (commit 1273356) + K-PUX findings doc (commit pending)
**Successor:** Phase 2.8.2 (Brief Board 본질 재설계 + 프로젝트 첫 인상 — 별 SPEC 존재)
**Branch:** `g-b-1-hardening` (single worktree, linear)

## v2 changelog (vs v1)

v1 (5d, 7 sub-gates) was scoped before Codex K-PUX-1 ran. After absorbing all 19 K-PUX findings (per founder direction 2026-04-27 00:25 KST), v2 adds three new sub-gates and one bundled polish gate:

- **G_B1-H** (NEW) — Commission flow integrity. Absorbs F-PUX-002 (commission challenge CTA removal), F-PUX-003 (anonymous→signup intent preservation), F-PUX-004 (admin "Create Project Workshop" action — vertical workflow missing link), F-PUX-019 (locale routing inconsistency).
- **G_B1-I** (NEW) — Projects hub IA. Absorbs F-PUX-007 (Contest tab removal from /app/projects) and F-PUX-012 (Brief Board default tab promotion).
- **G_B1-J** (NEW) — Wizard polish bundle. Absorbs F-PUX-010 (deliverable tags raw render), F-PUX-015 (slash hint cleanup), F-PUX-016 (YAGI request modal copy split).
- **G_B1-D** (EXTENDED) — Terminology sweep now also covers F-PUX-005 sidebar group rename (Work → Workshop).

Findings deferred to Phase 2.10 (already covered there): F-PUX-001 (public landing), F-PUX-006 (scope switcher beyond G_B1-D scope), F-PUX-009 (wizard cycle rail), F-PUX-011 (status machine), F-PUX-013 (Host/Client blocks), F-PUX-014 (block-anchored comments), F-PUX-018 (settings cleanup).

Finding deferred to Phase 3.0+: F-PUX-017 (admin challenges i18n).

Finding self-resolved this session (commit 1273356): signup dead-end UX, role 4→2 simplification.

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

| Sub | Theme | Effort | Source |
|---|---|---|---|
| **G_B1-A** | Form action ESLint rule + sweep | 0.5 day | FU-2.8 |
| **G_B1-B** | Wizard Step 3 → BriefBoardEditor (draft mode) 통합 | 1.5 days | FU-2.8, F-PUX-008 |
| **G_B1-C** | SSRF defense-in-depth (3 FU 묶음) | 0.5 day | FU-2.8 (K-05 LOOP3) |
| **G_B1-D** | "Workspace" → "Workshop" terminology sweep + sidebar group rename | 1 day | Q-084, F-PUX-005 |
| **G_B1-E** | Phase 2.7.2 + 2.8 dead code 정리 | 0.5 day | FU-2.7.2 |
| **G_B1-F** | Trivial UX polish (tabs i18n, saveVersion RPC, R2 round-trip test) | 0.5 day | FU-2.8 |
| **G_B1-G** | Korean IME e2e + Playwright wiring | 1 day | FU-2.8 |
| **G_B1-H** ⭐ | Commission flow integrity (CTA + intent + admin convert + locale) | 1.5 days | F-PUX-002/003/004/019 |
| **G_B1-I** | Projects hub IA (Contest tab off + Brief Board default) | 0.5 day | F-PUX-007, F-PUX-012 |
| **G_B1-J** | Wizard polish bundle (deliverable tags + slash hint + modal copy) | 0.5 day | F-PUX-010/015/016 |

**총합:** 8 working days target. SOFT_CAP 9d. HARD_CAP 11d → HALT.

**왜 길어졌나:** v1 의 5d 는 K-PUX 전 추정. F-PUX-004 (Admin "Create Project Workshop" — L effort) 단독으로 1.5d 추가. 나머지 신규 gate 들은 XS-S effort 라 묶어서 1d. Total +3d.

**Phase 2.8.2 ETA:** Phase 2.8.1 SHIPPED 후 즉시 진입. Phase 3 ETA = Phase 2.8.1 (8d) + Phase 2.8.2 (5-6d) + Phase 2.10 (~7d) + buffer = **약 3.5주 후 Phase 3 진입.**

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

## §8.5 — G_B1-H — Commission flow integrity ⭐

### Trigger
Codex K-PUX 가 vertical workflow 의 결정적 갭 4개를 잡음. 모두 commission intake → project workshop 진입 path 깨짐 또는 Workshop ↔ Contest 분리 위반. monday MVP launch 까지 반드시 ship.

### Scope

#### F-PUX-002 — `/commission` 의 challenge CTA 제거 (XS)
- `src/app/[locale]/commission/page.tsx` 의 "Browse challenges" 보조 CTA 삭제
- 해당 위치 → "Workshop 작품 사례 보기" 또는 비워두기 (일관된 hero focus)

#### F-PUX-003 — Anonymous → signup → intent preservation (M)
- `/commission` 에서 anonymous user 가 "의뢰하기" 클릭 시 `/{locale}/signup?next=/app/commission/new` 로 redirect
- signup page 에서 `next` query 보존 (기존 useSearchParams 패턴)
- 이메일 confirm callback 후 `/app/commission/new` 로 직진 (현재 `/onboarding` 으로만 가짐)
- onboarding role 선택 → client 만 가는 경우는 자동 skip 후 commission 진입 (이미 의도 있음)
- 이메일 confirm 안 되면 "이메일 확인 후 의뢰서 작성하기" 안내 (현재 만든 check-email panel 에 next URL 보존)

#### F-PUX-004 ⭐ — Admin "Create Project Workshop" action (L)
- `src/app/[locale]/app/admin/commissions/[id]/page.tsx` 에 새 server action `convertCommissionToProject(commissionId)`:
  - `commissions` row → `projects` INSERT (status='draft' 또는 'submitted', workspace_id 클라이언트 workspace, brand_id 자동 매핑)
  - `commissions.title/description/budget/deadline` → `project_briefs` INSERT 으로 mapping (TipTap content_json, 텍스트는 paragraph node)
  - `commissions.references[]` → `project_references` INSERT bulk
  - `commissions.client_id` → `projects.client_id`
  - 기존 `commissions.status` → `'converted'` flip + `commissions.converted_to_project_id` FK 저장 (새 column 필요, migration 작성)
- Admin UI 에 "Workshop 생성" primary button 추가 (response 보내기 보다 위쪽). 결과: `/app/projects/[id]?tab=brief` 로 redirect
- 클라이언트에게 자동 알림 (`notifications` row): "YAGI 가 의뢰를 받고 작업실을 열었습니다 → [link]"
- RLS: yagi_admin only

#### F-PUX-019 — Locale routing 일관성 (S)
- `/commission` 의 challenge link 제거 (F-PUX-002 와 함께 사라짐)
- `src/middleware.ts` 의 locale-free `/challenges` exclude 그대로 유지 (Phase 3.0+ 까지 deferred 의도)
- `src/app/challenges/layout.tsx` Korean-only message seeding 은 informational FU 로 deferred (Phase 3.0)

### EXIT
- [ ] `/commission` 에서 challenge CTA 사라짐
- [ ] anonymous user → submit click → signup → confirm → `/app/commission/new` 자동 도착
- [ ] admin queue 에서 commission 1건 → "Workshop 생성" 클릭 → projects/project_briefs/project_references row 정상 생성
- [ ] 생성된 project 의 Brief Board 에 commission 원본 텍스트 + reference 모두 보임
- [ ] 클라이언트에게 알림 도착
- [ ] migration `add commissions.converted_to_project_id` 적용 + rollback 검증
- [ ] tsc + lint + build exit 0
- [ ] e2e 1개 추가 (commission intake → admin convert → client view)

### FAIL on
- commission → project conversion 시 reference 손실
- RLS 누락으로 비-admin 이 convert 호출 가능
- migration이 기존 commissions 데이터 깨뜨림

### Rationale
야기 framing 의 핵심 vertical workflow: "클라이언트가 의뢰 → YAGI 가 받음 → 작업실 열림 → 협업 시작". 현재 v1 은 "받음" 까지만 ship 됨. "작업실 열림" 은 admin 이 손으로 SQL INSERT 해야 함 = 야기 본인 손맛 떨어짐 + monday launch 후 첫 클라이언트 받았을 때 위기. 이 gate 가 Phase 2.8.1 의 가장 큰 사용자 가치.

---

## §8.6 — G_B1-I — Projects hub IA

### Trigger
F-PUX-007 + F-PUX-012. `/app/projects` 가 Workshop ↔ Contest 분리 위반 + Brief Board 가 보조 tab.

### Scope
1. `src/app/[locale]/app/projects/page.tsx` 에서 "Contest brief" tab 제거. Phase 3.0+ 까지 admin/challenges 안에서만 contest 관리.
2. `src/app/[locale]/app/projects/[id]/page.tsx` default tab 을 `tab=overview` → `tab=brief` 로 변경 (`searchParams.tab ?? 'brief'`).
3. Overview tab 자체는 유지하되 simplify: project metadata + status badge + cycle position (Phase 2.10 에서 채울 자리). 현재 Overview 안에 있는 brief text / references / preprod / thread 는 brief tab 이 메인이 되므로 중복 제거.

### EXIT
- [ ] `/app/projects` 에 "Contest brief" tab 안 보임
- [ ] `/app/projects/[id]` 진입 시 default 가 Brief Board
- [ ] Overview tab 은 metadata-only 로 slim
- [ ] tsc + lint + build exit 0

### FAIL on
- legacy bookmark `?tab=overview` 가 깨짐 (URL 자체는 동작해야 함)
- 기존 사용자가 Overview 내용 못 찾음 (UX regression)

### Rationale
Brief Board 가 Phase 2.8 의 본질. 보조 tab 으로 두면 product framing 깨짐.

---

## §8.7 — G_B1-J — Wizard polish bundle

### Trigger
F-PUX-010 + F-PUX-015 + F-PUX-016. 모두 XS effort, 한 commit.

### Scope
1. **F-PUX-010 deliverable tags raw render**: `src/app/[locale]/app/projects/[id]/page.tsx` 의 `t(\`deliverable_${dt}\`)` → 사용자 입력 raw 그대로 렌더 (free-text chips). i18n key `deliverable_*` 들 deprecated.
2. **F-PUX-015 slash hint cleanup**: `src/components/brief-board/editor.tsx` 의 "Type / to insert a block" 빈 상태 카피 → "이미지 / 파일 / 링크를 끌어다 놓으세요" (실제 작동하는 interaction 만 안내).
3. **F-PUX-016 YAGI request modal copy split**: `messages/*.json` 에 새 key `yagi_request_explainer` 추가 ("YAGI 가 이 의뢰를 검토하고 1-2 영업일 내 답변 드립니다"). modal description 은 explainer 사용. submit 후 toast 만 `yagi_request_sent` 사용.

### EXIT
- [ ] deliverable tags 가 사용자 입력 그대로 보임
- [ ] Brief Board 빈 상태 카피가 작동하는 interaction 만 안내
- [ ] YAGI request modal 의 description = explainer, submit toast = sent
- [ ] tsc + lint + build exit 0

### Rationale
3개 모두 1-2 줄 변경 / i18n key 1개 추가. 한 commit 으로 정리.

---

## §9 — Out of scope (deferred)

### → Phase 2.8.2 (Brief Board 본질 재설계 — 별 SPEC 존재)
- 사이드바 채팅 우선순위 (야기 manual K-PUX)
- Comment author visual hierarchy (avatar + role badge — 야기 manual K-PUX)
- /app/projects 첫 인상 (카테고리 워크플로우 안내 + admin delete + 3-day undelete — 야기 manual K-PUX)
- Brief Board toolbar + slash command discoverability
- Canvas mode evaluation (TipTap stay vs tldraw/excalidraw)
- /ko/commission 전체 deletion 검토

### → Phase 2.10
- **F-PUX-001 Public landing rewrite** — Workshop OS framing
- **F-PUX-006 Scope switcher rename** — Workshop / Client Portal / YAGI Host (G_B1-D 의 sidebar 만 처리, scope switcher 는 Phase 2.10)
- **F-PUX-009 Wizard 5-action cycle rail** — 시각적 cycle position 표시
- **F-PUX-011 Status model AI collaboration cycle 노출**
- **F-PUX-013 Participants → Host/Client blocks**
- **F-PUX-014 Block-anchored comments** (TipTap stable block id + threads.anchor_block_id)
- **F-PUX-018 Settings cleanup** (creator profile fields 게이트 + Workshop 라벨)
- **Status machine 완성** — draft → submitted → in_discovery → in_production → delivered → approved → archived 모든 transition + UI
- **Brief Board status='locked' UX 강화** — lock 후 변경 요청 → fork 패턴
- **Approval flow** — 클라이언트의 명시 승인 action + 알림
- **Invoicing surface** — `invoices` 테이블 + UI (existing skeleton)
- **글로벌 search 에 brief 본문 인덱싱**

### → Phase 3.0
- Contest surface 본격 (admin console 외 클라이언트 view + creator-facing public surface)
- **F-PUX-017 admin challenges console i18n + 위치 정리**
- Creator Profile (`/c/{handle}` public pages)
- Workshop ↔ Contest **별 product** 운영 인프라
- ProfileRole type narrow (4 → 2) + DB migration + studio/observer 분기 코드 12개 파일 cleanup (Q-088 deferred work)
- Anonymous OTP voting infrastructure (Q-089) + `contest_voters` table

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

전체 10개 sub-gate EXIT 모두 통과 + Codex K-05 review 통과 + main merge.

- [ ] G_B1-A: ESLint rule + sweep
- [ ] G_B1-B: wizard 통합
- [ ] G_B1-C: SSRF 3개
- [ ] G_B1-D: terminology sweep + sidebar group rename
- [ ] G_B1-E: dead code 정리
- [ ] G_B1-F: tabs i18n + saveVersion RPC + R2 test
- [ ] G_B1-G: Playwright e2e
- [ ] G_B1-H: ⭐ Commission flow integrity (CTA + intent + admin convert + locale)
- [ ] G_B1-I: Projects hub IA
- [ ] G_B1-J: Wizard polish bundle
- [ ] tsc + lint + build exit 0 (전체)
- [ ] Codex K-05 (gpt-5.5) PASS, 0 HIGH-A, 0 unhandled HIGH-B
- [ ] manual smoke (10분 — G_B1-H 변환 흐름 포함)

---

## §12 — Timeline budget

```
TARGET   = 8 working days
SOFT_CAP = 9 days
HARD_CAP = 11 days → HALT E_TIMELINE_OVERRUN

PER GATE (target h):
  G_B1-A =  4
  G_B1-B = 12
  G_B1-C =  4
  G_B1-D =  8 (extended w/ sidebar group rename)
  G_B1-E =  4
  G_B1-F =  4
  G_B1-G =  8
  G_B1-H = 12 ⭐ (admin convert is L effort)
  G_B1-I =  4
  G_B1-J =  4
  REVIEW =  2 (+ 4 per loop)
```

Total ≈ 64h work + 2h review = 8d. Buffer 0d → 8d 안에 SHIPPED 가능. SOFT_CAP 까지 1d buffer.

---

## §13 — END

```
ON SHIPPED: Phase 2.10 SPEC 즉시 작성 시작 (web Claude)
            Phase 2.10 = Workshop 본체 정의 100% 도달
            Phase 3.0 = Contest 본격 (별 product, 별 SPEC, 별 worktree)
```

Phase 3 ETA: Phase 2.8.1 (5d) + Phase 2.10 (~7d) + buffer = **약 3주 후 Phase 3 진입.**
