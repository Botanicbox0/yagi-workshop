# YAGI Workshop — Handoff

> **갱신:** 2026-04-24 (Phase 2.5 G1~G7 shipped, **G8 HALT** — Codex K-05 verdict HIGH_FINDINGS 6건, branch not merged)
> **목적:** Phase 2.5 G8 hardening 필요. 야기 morning review + hardening migration + re-K-05 후 merge. Phase 2.6 kickoff 블록됨.

---

## 🛑 Phase 2.5 HALT at G8 (2026-04-24 ~04:35 KST)

**Codex K-05 consolidated pass returned HIGH_FINDINGS (6 ship-blockers).** Details: `.yagi-autobuild/phase-2-5/G8_K05_FINDINGS.md`. Telegram halt alert sent (msg #60).

**G1~G7 shipped (branch `worktree-g3-challenges`, commit `90a5b8f` — pushed to origin):**
- G1 schema baseline + 2 hardening migrations
- G2 auth flow + handle RPCs + ADR-009
- G3 public /challenges/* + realtime gallery
- G4 submission flow (R2 signed-URL + Zod + XHR progress)
- G5 admin management (5 routes + CRUD/judge/announce)
- G6 public profile /u/[handle] + settings + avatar crop
- G7 notifications glue (4 kinds + pg_cron reminder — APPLIED to prod DB)

**G8 blockers (all SHIP_BLOCKER):**
- K05-001 HIGH-A: challenge_submissions public SELECT leaks non-ready content
- K05-002 HIGH-A: challenge_votes public SELECT leaks voter identities
- K05-003 HIGH-C: submission content validation bypassable via direct INSERT/UPDATE
- K05-004 HIGH-A: R2 submit move copies+deletes arbitrary existing keys
- K05-005 HIGH-C: state machine bypassable via direct admin UPDATE
- K05-006 HIGH-C: challenge config JSONB stored without server-side Zod

4/6 need migration → ULTRA-CHAIN D forbids further overnight migration → halt.

**Next action (morning):** yagi reviews `G8_K05_FINDINGS.md`, picks remediation strategy, authors hardening migration + app patches, re-runs K-05, merges to main.

**Codex session resume:** `codex resume 019dbbcd-37fe-73d0-8611-d28140ae0ccc`

---

---

## 🌙 Overnight Gate Autopilot 활성 (2026-04-24)

상세 진행: `.yagi-autobuild/phase-2-5/OVERNIGHT_LOG.md`
Stop triggers: Codex HIGH-A / SPEC drift / build|tsc|lint 2회 연속 실패 / R2-Supabase 접근 실패 / 배치 답변 파싱 실패 — 발생 시 즉시 Telegram halt.

---

## ✅ G4 shipped (2026-04-24)
- Submit flow: `/challenges/[slug]/submit` + R2 signed-URL upload + atomic post-upload INSERT + dynamic Zod schema + YouTube strict regex
- R2 bucket CORS + Lifecycle applied via Cloudflare HTTP API
- 상세: `.yagi-autobuild/phase-2-5/G4_CLOSEOUT.md`

---

---

## ✅ 방금 끝난 것 — Phase 2.5 G3 (2026-04-24 closeout)

**Worktree:** `.claude/worktrees/g3-challenges/` (branch `worktree-g3-challenges`)
**첫 Agent Teams 실전 완주.** 5 sub-groups (A/B/B.5/C/D), 9 teammates, ~30 files, ~3h wall clock (SPEC 목표 4-5h — ~40% 단축).

### G3에서 shipped
- Public `/challenges` list + `/challenges/[slug]` detail + `/challenges/[slug]/gallery` (realtime, votes, winners)
- 첫 realtime subscriber in codebase (`gallery-realtime.tsx`)
- Countdown timer + 16:9 thumbnail support + Higgsfield-style archived card grid (B.5 polish round, mid-flight 추가)
- Sitemap + 9-assertion node smoke test
- 자세한 내역: `.yagi-autobuild/phase-2-5/G3_CLOSEOUT.md`

### 열린 follow-ups
- FU-16 (LOW) — header-cta-resolver 리터럴 → useTranslations
- FU-17 (LOW) — B1 인라인 empty-state → B2 `<EmptyState>` 통합

### G3에서 소비된 seed data (테스트용, prod 아님)
6 challenges (`test-*`) + 3 test creators + 6 submissions + 3 winners + 3 votes. 정리 SQL은 CLOSEOUT.md §seed-data 참조.

### 다음
야기 authorization 대기 중:
1. `git push origin worktree-g3-challenges`
2. merge 전략 결정 (직접 main merge vs PR review)
3. G4 (submission flow) 진입

---

## 📚 Archive — Phase 2.5 G3 entry session (2026-04-23 저녁, SHIPPED per above)

---

## 🎯 현재 활성 작업 — Phase 2.5 G3 (2026-04-23 저녁)

**Worktree:** `.claude/worktrees/g3-challenges/` (branch `worktree-g3-challenges`)
**Execution model:** Agent Teams + in-process mode (첫 실전)

### 완료된 것 (이 세션)

- ✅ Agent Teams smoke test PASS (5/5: parallel spawn, mailbox, shutdown, cleanup, synthesis with emergent reconciliation)
- ✅ `~/.claude/settings.json` env wrap 수정 (top-level 키는 env var export 안 됨 — 공식 형식 `{"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}}`)
- ✅ 인프라 문서 3종 신규/개정 완료:
  - `.yagi-autobuild/PARALLEL_WORKTREES.md` (신규, 14.7KB) — Warp Windows + in-process mode 표준
  - `yagi-agent/orchestrator/CLAUDE.md` v2.0 — task_plan `parallel_group` 필드, Agent Team primary spawn path
  - `.yagi-autobuild/ARCHITECTURE.md` v2.0 — stale L2 token-sync pipeline 제거, "gate"→"review step" 용어 정리, §7 parallel 추가, SECURITY DEFINER 톤 다운
- ✅ `DECISIONS_CACHE.md` Q-014~Q-019 append (총 19 entry)
- ✅ Builder triage Green light — §A-§J 중 AUTO 8건 / PROPOSE-DEFAULT 2건 / NEEDS YAGI 11건 / 기타 분류. 브랜드 voice 클러스터 하나의 ADOPT로 copy-derived 9개 항목 cascade 해소 구조 식별.

### 대기 중 (야기 입력 필요)

Builder가 batched yagi question set 작성 후 텔레그램 전송 예정. 예상 질문 수: 최대 12개 (brand voice cluster 1 + UX 5 + product 1 이내).

### 포팅 필요 (Builder 첫 mechanical task)

현재 g3-challenges worktree에는 없고 main worktree에만 있는 pre-G3 infra:
- `react-markdown@10.1.0` + `rehype-sanitize@6.0.0` (audit finding #5)
- `src/lib/ui/status-labels.ts`
- `src/components/challenges/markdown-renderer.tsx`
- Extended `status-pill.ts`
- DP 파일 자체 (`.yagi-autobuild/phase-2-5/G3-ENTRY-DECISION-PACKAGE.md`)

Builder가 G3 task_plan.md 작성 전에 포팅 실행 예정.

### G3 Deliverable (SPEC 기준)

- 3 public routes: `/challenges` (list), `/challenges/[slug]` (detail), `/challenges/[slug]/gallery` (gallery)
- Locale-free routes (middleware matcher 제외 이미 완료 — Phase 2.1 G6)
- First realtime subscriber (gallery INSERT → RSC refresh, 5s SLA)
- Markdown rendering with XSS sanitization
- `status-pill` + `submission-status` helper 공통화
- Stop point: 야기 visual review at `/challenges` + `/challenges/[slug]` 이후 gallery realtime 작업

### FU-14 (2026-04-23 신규 등록)

ROADMAP.md stale (Phase 1.x chain still queued despite Phase 2.x shipped). Phase 2.5 closeout 시 업데이트. Owner: Builder. Status: deferred.

---

## 🚀 Phase 2.5 G1/G2 — SHIPPED (2026-04-23 낮)

G1 (schema) commit `2fcfad4`. G2 (auth + role + handle) with hardening v1 (composite apply, anon grant revoke + structured error contracts) SHIPPED. G2 retro commit `1bef429`.

**Key hardening decisions cached** (DECISIONS_CACHE.md Q-001~Q-013):
- Reserved handles = code-level list (Q-001)
- Role stale data = soft-delete pattern (Q-002)
- Admin audit binding = INSERT only, not UPDATE/DELETE (Q-003)
- Slug regex with citext = `::text` cast 필수 (Q-004)
- RLS public SELECT default rules (Q-005)
- SECURITY DEFINER = `SET search_path = public, pg_temp` always (Q-006)
- RPC NULL input = explicit RAISE with structured ERRCODE (Q-007)
- Migration chain style = composite vs post-apply 분기 (Q-008)
- FORCE RLS = Phase 2.6로 defer (Q-009, FU-13)
- ERRCODE 22023 vs 23514 구분 (Q-010)
- Marketing consent = G7 dispatch layer (Q-011)
- Route structure = `/[locale]/app/*` not group (Q-012)
- Pre-apply stop 완전 제거 — Codex K-05 CLEAN = auto-apply (Q-013)

---

## 🚀 Phase 2.1 진행 상태 (2026-04-23 — SHIPPED)

| Group | 상태 | 비고 |
|-------|------|------|
| G1 Resend DNS verify | ✅ | 야기 가비아 DNS 수정 후 18:00 UTC tick에서 첫 email 발송 확인 |
| G2 H1 realtime publication | ✅ | `20260423020000_h1_preprod_realtime_publication` — `preprod_frame_reactions/comments` 추가. Pass 2 Codex에서 idempotency wrapper 보완 (commit `638ad43`). |
| G3 yagi-internal seed | ✅ | `20260423020100_seed_yagi_internal_workspace` — clean-clone 부트스트랩 |
| G4 POPBILL guard | ✅ | Structured `PopbillNotImplementedError` + bilingual toast |
| G5 triage + FIX_NOW 3 | ✅ | 24 items classified (3 FIX_NOW / 14 DEFER_PHASE_2_5 / 6 DEFER_PHASE_3 / 1 WONTFIX). FIX_NOW: SSRF walker 포트 / 미팅+attendees atomic RPC / media_type server-derive. |
| G6 Smoke + middleware | ✅ | middleware matcher `/showcase/` + `/challenges/` 제외 추가 (locale-free 라우트 지원). SPEC 6 items: 4 PASS/auto (item 4 RLS + 5 showcase 404 + 6 Shorts) + 3 MANUAL_PENDING queue. |
| G7 Codex K-05 | ✅ | 3-pass cycle. Pass 1 HIGH → Pass 2 HIGH (partial) → Pass 3 CLEAN. Final: 바이너리 RFC 5952 IPv6 parser + shared `src/lib/ip-classify.ts`. 22/22 test assertions pass. |
| G8 Closeout | ✅ | `.yagi-autobuild/phase-2-1/CLOSEOUT.md`. 17 commits `4bf7591..484ed09`. |

**남은 carryover (non-blocking for Phase 2.5):**
- `.yagi-autobuild/YAGI-MANUAL-QA-QUEUE.md`: 7 browser smokes (journal locale toggle / timezone save / invoice draft 404 / preprod realtime 2-tab / POPBILL toast i18n / meeting txn rollback / YouTube Shorts end-to-end)
- `.yagi-autobuild/phase-2-2/BACKLOG.md`: 21 DEFER items (14 PHASE_2_5 / 6 PHASE_3 / 1 WONTFIX) + infra seed migrations (cron job seed pending)

---

## Phase 2.0 archive (reference — 이미 SHIPPED)

---

## 🚧 Phase 2.0 진행 상태 (2026-04-23 — SHIPPED)

| Group | 상태 | 비고 |
|-------|------|------|
| G0 — Snapshot backup | ✅ 완료 | 5 snapshot files + ROLLBACK.md + tag pushed |
| G1 — notify-dispatch ops | ⚠️ Setup 완료 / verify pending | Resend domain (yagiworkshop.xyz) DNS records 가비아 입력 완료. DNS 전파 대기 중 (5min~1hr). 자동 verify 완료 시 next cron tick에서 email 도착 — 야기가 inbox 확인 시 G1 closeout |
| G1.5 — Pre-commit secret hook | ✅ 완료 | Husky + 시크릿 패턴 검사 hook (commit `e56c364`) |
| G2 — Migration baseline squash | ✅ **완료 with imperfect baseline** | Single baseline `20260422120000_phase_2_0_baseline.sql` (160KB) replaces 23 historical migrations. **Caveat:** Docker 부재로 raw `pg_dump v18` 사용 + 수동 supplement (5 extensions, 10 storage buckets, 3 realtime publications). Codex K-05 verdict CLEAN. 상세: `.yagi-autobuild/phase-2-0/BASELINE_LIMITATIONS.md` |
| G3 — POPBILL flip docs | ✅ 완료 | `.yagi-autobuild/phase-2-0/POPBILL_LIVE_FLIP.md` (mock→test→production 3-step flip, code locations, blockers). `.env.local.example` POPBILL_* expanded with inline comments. CLAUDE.md note 추가. **Blocker 명시:** `client.ts:97-106` `issueTaxInvoice()` test/production NOT_IMPLEMENTED — 실 발행은 future Phase에서 popbill SDK 통합 필요 |
| G4 — Cross-phase deferred | ✅ 완료 (atomic 10 commits) | Triage (`G4_TRIAGE.md`) → 10 FIX_NOW / 15 DEFER_TO_2_1 / 0 WONT_FIX. Cluster A (#6 createBoard authz, #10 ref-actions `..`, #2 thread-actions admin fan-out leak, #4 sendMessage `..`) + Cluster B (#1 unsubscribe atomic claim, #3 timezone IANA allowlist, #5 markChannelSeen surface errors) + Cluster C (#7 journal locale toggle fallback, #8 Google Calendar requestId dedup, #9 invoice print draft guard). 각 fix 전 `pnpm tsc --noEmit` EXIT:0 통과. Workflow rule: atomic commit per fix (crash safety net). **Full build check (`pnpm build`) deferred until G4 end — run before G5 start.** |
| G5 — Phase 1.9 MEDIUM | ✅ 완료 (atomic 7 commits) | Single migration `20260422130000_phase_1_9_medium_fixes.sql` built incrementally — each commit appends one ALTER. #1 `recalc_invoice_totals` `SET search_path = public, pg_temp`; #2-4 public UPDATE WITH CHECK on `meetings_update` / `showcase_media_update` / `team_channels_update`; #5-7 storage UPDATE WITH CHECK on `avatars_update` / `"showcase-media update"` / `"showcase-og update"`. Migration NOT yet pushed to live DB — apply with `supabase db push` before Phase 2.5 starts. **Post-G4 `pnpm build` verified clean (15.7s, 11 static pages) before entering G5.** |
| G6 — Phase 1.9 LOW + i18n | ✅ 완료 (atomic 6 commits) | L1 `createShowcaseFromBoard` retry-on-23505 for draft slug collision. L2 `requestBadgeRemoval` rationale comment (Vercel log drain acceptable). L3 `renderEmpty` drop unused `locale` param. L4 `buildEmbedUrl` YouTube Shorts `/shorts/` → `/embed/` rewrite. L5 `showcase/[slug]/not-found.tsx` self-contained html/body shell (Next 15.5 dynamic-segment not-found layout-chain bug workaround — revert when upgrading to ≥15.6). i18n: 4 dead keys × 2 locales removed (`team_chat.message_load_more`, `team_chat.error_load_failed`, `team_chat.nav_label`, `showcase.nav_label`). |
| G7 — Cross-phase contracts | ✅ 완료 with 1 deferred investigation | `.yagi-autobuild/contracts.md` (per-phase, 1.1→1.9, ~550 lines). CLAUDE.md pointer + update-policy added. Codex K-05 initial pass: 2 HIGH / 8 MEDIUM / 1 LOW. Option B closeout: all MEDIUM + LOW + H2 (thread_messages RLS wording) fixed in-doc; **H1 (preprod_frame_reactions/comments publication membership vs. UI subscription)** filed as `.yagi-autobuild/phase-2-1/INVESTIGATION-H1-realtime-live.md` with two hypotheses + verification SQL. Codex re-review: all 11 substantive items RESOLVED; one cosmetic label taxonomy finding on the Known-gaps section addressed in final patch. Known external prerequisite documented: `workspaces.slug='yagi-internal'` row is not seeded by any authoritative migration — manual INSERT required on clean-clone before preprod / team-chat paths work. |

**G1 verify 임시 가정 진행 결정:** DNS 전파 대기로 G1.5/G2 등 후속 group이 막히는 게 비효율적. G1 setup은 완료됐고 (secrets/cron/Edge function 모두 active), domain verify만 외부 DNS 의존. G2+ group은 G1 verify와 독립적이라 병렬 진행. G1 closeout는 별도 처리.

---

## 🎉 상태: Phase 1 완주

### Phase 진행 (100%)
- ✅ Phase 1.0 / 1.0.6 / 1.1 / 1.2 / 1.2.5 / 1.3 / 1.4 / 1.5 / 1.6 / 1.7 / 1.8 / 1.9 전부 완료
- ✅ Autopilot 체인 실행 (Phase 1.2 → 1.9 자동 연쇄, Codex gpt-5.4 high reasoning 리뷰 통과)
- ✅ Phase 1.8 운영 세팅 완료 (notify-dispatch Edge Function + cron 10분 간격 + secrets + Vault)
- ✅ Popbill 승인 완료, POPBILL_MODE=test 로 전환됨


---

## 🔑 환경 정보

### Supabase 프로젝트 (⚠️ 중요)
- **정답 프로젝트: `yagi-workshop` (jvamvbpxnztynsccvcmr, ap-southeast-1)**
  - Next.js 앱이 붙는 DB
  - Phase 1.0~1.9 마이그레이션 23건 전부 적용됨
  - notify-dispatch Edge Function 배포됨
  - Cron 10분 간격 active
- **주의 — 혼동 프로젝트:**
  - `YAGI STUDIO` (vvsyqcbplxjiqomxrrew, ap-northeast-1) — 레거시 공개 마켓플레이스, 현재 미사용
  - `openclaw yagi` (ap-south-1) — 현재 paused

### 다중 프로젝트 운영 규칙
Supabase CLI / SQL Editor 작업 시작 전 항상 확인:
1. `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL` 값
2. 스크립트의 `$projectRef` 상수
3. Dashboard 좌상단 프로젝트 드롭다운

이 셋이 전부 `jvamvbpxnztynsccvcmr` 여야 함. 2026-04-22 아침에 `vvsyqcbplxjiqomxrrew` (YAGI STUDIO) 에 secrets/Edge Function/cron 잘못 설치했다가 복구한 사건 있음.

### 환경변수 (`.env.local`)
- Supabase: jvamvbpxnztynsccvcmr.supabase.co
- Google OAuth: refresh token 발급 완료 (Testing 모드라 7일 만료 주의)
- Resend: 운영 키
- Popbill: MODE=test, LINK_ID=YAGIWORKSHOP, SECRET_KEY 채워짐, CORP_NUM 미입력 (사업자등록번호 10자리 넣어야 발행 가능)
- Telegram: Builder 알림 봇
- Anthropic: API 키
- 빌드 설정: AUTOBUILD_MAX_EVAL_LOOPS=2 (Karpathy 모드)

### Codex CLI
- `C:\Users\yout4\.codex\config.toml`: `model = "gpt-5.4"`, `model_reasoning_effort = "high"`
- 인증: ChatGPT Plus (yagi@yagiworkshop.xyz)
- 용도: Phase K-05 adversarial review

---

## 🛠️ 운영 스크립트 (재사용 가능)

`scripts/` 디렉토리에 커밋됨:
- `setup-supabase-secrets.ps1` — .env.local 파싱해서 RESEND/ANTHROPIC/TELEGRAM 키를 Supabase secrets에 등록
- `deploy-edge-functions.ps1` — supabase/functions/ 아래 모든 Edge Function 배포
- `cleanup-wrong-project.ps1` — 엉뚱한 프로젝트에 설치한 리소스 정리용 (복구 작업에 사용)

모두 `$projectRef = "jvamvbpxnztynsccvcmr"` 로 고정.

---

## 🚨 남은 TODO (우선순위 순)

### P1 — Phase 2.0 시작 시 같이 처리
2. ~~**마이그레이션 히스토리 불일치 정리 (deferred)**~~ → ✅ **G2 (2026-04-22) 해결**: 23 historical entries archived to `.yagi-autobuild/archive/migrations-pre-2-0/` (with `MISSING.md` reconciliation), single baseline `20260422120000_phase_2_0_baseline.sql` recorded as 24번째 entry in remote `schema_migrations`. `supabase migration list --linked` cosmetic mismatch (23건 "missing locally") is intentional per Option C — see CLAUDE.md "Migration list cosmetic mismatch" note + `.yagi-autobuild/phase-2-0/BASELINE_LIMITATIONS.md`.

### P1 — Popbill 관련
3. **사업자등록번호 `POPBILL_CORP_NUM` 입력** — 없으면 세금계산서 발행 불가
4. **Mock → test 실발행 테스트** — `.env.local` POPBILL_MODE=test 상태. Admin dashboard "재발행 필요" 섹션에서 기존 mock invoice 재발행 테스트

### P2 — Phase 2.0 계획 시
5. Phase 1.9 deferred MEDIUM/LOW 9개 (caption 영구저장, embed host strict matching, `/work` OOB 클램프 등)
6. Phase 1.2.5 + 1.3 deferred follow-ups (Codex K-05 남은 항목)
7. Google OAuth Testing → Production 승격 (현재 refresh token 7일 후 만료)
8. 테스트 계정 / 시드 데이터 스크립트

---

## 🐙 Git 상태

- **리모트:** https://github.com/Botanicbox0/yagi-workshop (push 완료 2026-04-22)
- **브랜치:** `main`
- **커밋 구조 (3개):**
  1. `7dd3f48` — chore: initial project scaffolding + ops scripts
  2. `e9cba13` — docs: B-O-E autobuild methodology + phase 1.0-1.9 specs
  3. `a914cc6` — feat: phases 1.0-1.9 complete
- **Git identity:** local repo scope로 설정됨 (global 아님)

### 주의할 점 (다음 push 시)
- `public/assets/other/` 안에 15~42MB PNG 5개 있음. GitHub 50MB warning 임계 근접.
- Phase 2.0 때 Git LFS 도입 검토 (대용량 이미지 / 비디오 자산 늘어날 예정이면 필수)

---

## 🔐 보안 인시던트 기록 (2026-04-22)

### 인시던트 1: 잘못된 Supabase 프로젝트에 설치
- 2026-04-22 오전 `YAGI STUDIO` (vvsyqcbplxjiqomxrrew, 레거시) 에 secrets/Edge Function/cron 설치
- `yagi-workshop` (jvamvbpxnztynsccvcmr, 정답 프로젝트) 로 이주 완료
- **원인:** `.env.local` 의 `SUPABASE_URL` 과 스크립트 `$projectRef` 상수 대조 안 함
- **예방:** 이후 모든 스크립트 상단에 `jvamvbpxnztynsccvcmr` 하드코딩, 주석으로 이유 명시

### 인시던트 2: `docs/google-oauth-setup.md` 에 Google OAuth Client Secret 평문 커밋
- GitHub push protection 이 첫 push 시점에 차단 ✅
- 리모트 노출은 없었음
- 로컬 파일 + 이전 commit 트리에만 존재 → `git reset --soft HEAD~2` 로 재작성
- **예방:** `.env.local.example` 에만 placeholder 남기고 문서에는 실제 값 절대 쓰지 않음
- **후속:** Google OAuth Client Secret 회전 권장 (Google Cloud Console → Credentials → yagi-studio → Reset Secret). Testing 모드 + 7일 refresh token 만료로 실제 위험도는 낮지만 이상적으로는 회전 후 `.env.local` 갱신.

### 인시던트 3: `summary-phase-1-8.md` 에 Resend API key 평문
- Builder 가 summary 에 example 명령어 그대로 기록
- 전수 스캔 후 placeholder 로 교체
- **예방:** Phase spec / summary 에는 `re_<your-key>` 형태의 placeholder 만 사용

---

## 📦 2026-04-22 세션 요약

이 세션에서 일어난 일:
1. Phase 1.3 spec 마무리 (E-05 email rendering, parallelism plan, kill-switch 테이블, Codex review prompt)
2. Google OAuth Client 생성 + Calendar API 활성화 + Playground로 refresh token 발급
3. `.env.local` 정리 + `docs/google-oauth-setup.md` 생성 (후속 보안 인시던트 #2)
4. Codex CLI 세팅 (`gpt-5.4` + high reasoning)
5. Autopilot 프롬프트 던짐 → Phase 1.2 → 1.9 전체 완주
6. Phase 1.5 mock 모드 진입 명령 (spec에 ADDENDUM 추가)
7. Supabase 세팅 실수 + 복구 (인시던트 #1)
8. Popbill 승인 나서 `.env.local` POPBILL_MODE=test 로 전환
9. Cron 10분 간격 실행 + notify-dispatch end-to-end 검증 완료
10. Git init → 3커밋 → push (인시던트 #2, #3 발견 + 수정 + 재push)

---

**HANDOFF 최종. Phase 1 완주 + Git 동기화 완료. 다음은 Phase 2.0 계획. 🚀**
