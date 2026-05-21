# Phase 7 Wave C v2 — Retrospective Lessons (2026-05-11 ~ 2026-05-21)

## L1 — STEP 1 main wrong-branch commit + COMMIT_MSG.txt stale

증상: Builder가 STEP 1 commit을 wave-c-v2-step1 대신 main에 함. Write tool silent fail로 COMMIT_MSG.txt가 이전 phase 내용 stale 상태였음.

Fix:
- Set-Content + Get-Content verify 매 commit (메모리 #13)
- git rev-parse --abbrev-ref HEAD 매 commit 직전
- 또는 BOM-free `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))`

Recovery: wave-c-v2-step1-misplaced tag로 backup, cherry-pick to correct branch.

## L2 — Vercel "Redeploy" 함정

증상: Dashboard "Redeploy" 클릭은 build artifact reuse. NEXT_PUBLIC_* env 변경 후 fresh build 안 됨.

Fix:
- Empty commit push로 fresh build trigger: `git commit --allow-empty --no-verify -m "rebuild: ..."`
- 또는 `vercel --prod --force`
- 진단: deployment metadata `action:'redeploy' + originalDeploymentId` 있으면 reuse, 없으면 fresh

## L3 — Vercel env scope (Production + Preview 양쪽 필수)

증상: NEXT_PUBLIC_SITE_URL은 production scope만 있어도 OK였음 (production branch만 사용). 그러나 일반 env는 Production + Preview 둘 다 필요.

Fix: 신규 env 추가 시 두 scope 양쪽 등록 default.

## L4 — HIGH-7/8/9 locale-free public route 회귀 패턴

증상: campaigns route 신규 도입 시 세 가지 회귀 연속 발생:
- HIGH-7: middleware matcher 누락 → 404
- HIGH-8: getTranslations context 없음 → 500 server
- HIGH-9: layout.tsx 누락 → 500 render

Fix: 신규 locale-free public route 도입 시 4-item checklist (PM v1.9 §AD에 lock):
1. middleware matcher의 negative lookahead에 route segment 추가
2. 자체 layout.tsx 생성 (NextIntlClientProvider wrap)
3. getTranslations({locale, namespace}) 명시 호출
4. curl -I PRE-SHIP smoke verify

Review scope gap:
- K-05 Codex (data/server action): runtime issue catch 못함
- K-06 Opus (design): UI render 도달 못해 visual 검증 잠김
- → K-04 (routing review) 신규 추가 또는 SPEC에 checklist 명시 필수

## L5 — DB migration partial-apply (Wave C v2 critical lesson)

증상: 3개 migration ("applied via Dashboard SQL editor" 메모리 기록) 실태 = 2개 완전 누락, 1개 부분 적용. Production smoke 시점까지 검출 안됨.

발현된 에러:
1. "계정을 만들지 못했어요" — find_user_by_email RPC 없음
2. "워크스페이스를 만들지 못했어요" — workspaces.kind constraint에 'creator' 없음

Fix: 신규 migration 후 다음 verify 의무:
- Supabase MCP execute_sql로 schema/RPC/constraint/policy verify query 결과 paste
- 또는 Web Claude가 Supabase MCP apply_migration으로 direct apply (가장 안전)
- 메모리에 "applied" 만 기록하지 말고 verify query 결과도 함께 기록 (메모리 #28)

## L6 — Wave C v2 onboarding flow gap

증상: sidebar에 creator entry 추가했으나 신규 signup onboarding은 brand/artist만 selectable. Creator workspace는 응모 flow 자동 생성에만 의존.

FU candidate (Wave D 또는 별도): signup onboarding에 creator selector 추가 또는 응모 flow 자동 생성 의도 명문화.

## L7 — R2 lifecycle defer (FU-R1, Phase 8)

증상: tmp/* → published/* migration 미구현으로 lifecycle 즉시 적용 시 production data loss.

Defer: Phase 8 published/* migration ship 후 lifecycle enable.

## L8 — Server action error → client UI silent (2026-05-21 prod smoke 발견)

증상: campaigns/[slug]/submit/_actions/submit-application-action.ts 의 `submitApplicationAction` 이 `{ ok: false, error: "campaign_closed" }` 또는 `{ ok: false, error: "workspace_create_failed" }` 등 정상 반환했는데 client (submit-form.tsx) 에서 toast / inline error 표시 안 됨. 사용자는 button 눌렀는데 페이지 그대로 — "응답이 없는" UX.

진단 방법:
- Playwright `browser_network_request <index> response-body` 로 server action POST 응답 body 직접 확인 가능
- Postgres logs 로 실제 DB 에러 (constraint violation 등) 추적 가능

Fix candidate (FU 또는 Wave D):
- submit-form.tsx 의 mutation onError / onSuccess 분기에서 `result.error` 코드별 message map → Sonner toast
- 최소한 generic fallback toast ("응모 처리 중 문제가 발생했어요") 표시
- error code 별 사용자 메시지: campaign_closed / workspace_create_failed / rate_limited / turnstile_failed 등

Review scope gap: K-06 visual review는 error state까지 검증 안 했음. PRE-SHIP smoke checklist에 "submit error path screenshot 1장" 추가 필요.

## L9 — workspace plan: "free" violates check constraint (2026-05-21 prod smoke 발견)

증상: createCreatorWorkspace (`submit-application-action.ts:228`) 가 `.insert({ kind: "creator", name, slug, plan: "free", brand_guide: {} })` 호출. workspaces_plan_check constraint 는 `('starter', 'growth', 'custom')` 만 허용 — `'free'` 거부 → INSERT 실패 → action returns `workspace_create_failed`.

근본 원인:
- workspaces.plan column 의 default 는 `'starter'` 인데 코드에서 명시적으로 `'free'` 지정
- 'free' 라는 plan tier 는 SPEC / migration / DB 어디에도 정의 없음 — 작성자가 creator 무료 tier 의도였을 듯
- creator kind 가 신규 (base migration 20260506200000) 이므로 plan_check 와의 상호작용 미테스트
- K-05 Codex review (server action 검증) 는 정적 valid → catch 못함
- 응모 flow E2E smoke 없이 ship 됐음

Fix applied (commit 7fef522, 2026-05-21):
- `plan: "free"` 제거 → DB default `'starter'` 적용
- L5 lesson 의 직계 — "applied" 메모리만 보고 verify query 안 한 패턴 재발

Lesson:
- 신규 kind / plan / status 도입 시 모든 check constraint 와 default 의 cross-table impact 검증
- 응모 flow 같은 multi-table mutation path 는 SPEC PRE-SHIP smoke checklist 에 명시 (Playwright 또는 manual user smoke)
- DB constraint 정의 변경 (ALTER TABLE ... ADD CHECK) 후 코드 caller 까지 re-grep 필수

## L10 — Auth invite 메일 미도달 (yagiworkshop.xyz catch-all 미설정 의심)

증상: campaign_submissions 정상 created → Supabase POST /invite 200 응답 → `confirmation_sent_at` timestamp 기록됨. 하지만 yagi@yagiworkshop.xyz Gmail inbox / spam / all-folder 검색해도 메일 없음. invite 대상 `creator-smoke-003@yagiworkshop.xyz` 는 명시적 mailbox 없는 ad-hoc 주소.

가능성:
- yagiworkshop.xyz Google Workspace 에 catch-all 미설정 → 메일이 sender (Resend or Supabase default SMTP) 측 bounce
- Resend 가 도착 처리 못한 unknown recipient 자동 suppress
- DNS / DMARC 정책 으로 spam filter 가 silently drop

Verification today:
- Supabase admin generate_link API 로 우회 → magic link token 직접 받아 navigate 성공 → /app/my-submissions + YouTube iframe HIGH-3 verify 완료

Fix candidate:
- 야기 Google Workspace 콘솔에서 yagiworkshop.xyz 의 catch-all 설정 → yagi@yagiworkshop.xyz 로 forward, OR test email 전용 alias (smoke@) 생성
- Resend dashboard 에서 outbound delivery log 확인하여 bounce/reject 여부 명확화
- Wave C v2 SPEC MED-4 의 `magic_link_sent` 플래그가 campaign_submissions schema 에 실제로 들어가지 않았음 (column list 확인) — SPEC implementation drift 의심, follow-up grep 필요

## Cross-cut FU-discovered today (Wave D 또는 Phase 8 candidate)

1. **L8 fix**: submit-form.tsx error toast handling — high priority (user-facing UX hole)
2. **L9 audit**: cross-table constraint x default audit script (workspaces, campaigns, submissions, distributions)
3. **L10 ops**: Google Workspace catch-all + Resend log access habit
4. **MED-4 drift check**: campaign_submissions.magic_link_sent column 실제 존재 여부 + 적용 logic grep
