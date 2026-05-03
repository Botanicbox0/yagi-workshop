# Phase 4.x — Wave C.5b Codex K-05 Amendments Prompt

> Codex 5.5 K-05 reviewer + 권한 확장 + amend_05/06 i18n+submit fix + FU-C5b-09 meeting type 등록.
> 6 amend (01-04 schema/auth + 05/06 wizard fix). meeting type = followup only.
> Wave D 진입 전. lead Builder 직접 작업 (no spawn). 끝나면 STOP.

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

**WAVE C.5b CODEX K-05 AMENDMENTS — 6 amend sequential. lead Builder 직접 작업 (no spawn). Codex 5.5 K-05 reviewer + 확장 권한. 끝나면 STOP.**

야기 결정 lock (chat 2026-05-01):

1. **Codex 5.5 K-05 reviewer 활성** — gpt-5.5 (model_reasoning_effort = "high"). DB schema/security critical change 의 review path. Opus 4.7 self-review 는 **fallback only** (Codex 토큰/binary 부재 시).
2. **Codex 권한 확장** — read 무제한 / test 실행 (pnpm test, lint, tsc, build) / migration verify (dry-run) / git read-only / self-review LOOP 3 까지. **여전히 boundary**: migration apply prod, ff-merge, git push, .env.local 노출, destructive SQL 은 야기 + Builder confirm 거쳐야.
3. **6 amend sequential** (이전 4 + 신규 2):
   - amend_01: profile auto-trigger (sub_01 dangling fix)
   - amend_02: artist enum widening + sub_13 script 실행
   - amend_03: yonsei creator → client reclassify
   - amend_04: brand onboarding FU-C5b-08 등록
   - **amend_05 (신규)**: wizard.step3.twin_intent.* i18n keys 추가 (Wave A task_03 i18n drift)
   - **amend_06 (신규)**: submit broken root cause + fix (amend_05 적용 후 yagi 재시도 결과 보고 진행)
4. **Meeting type/duration UX 변경 = NOT in scope** — `_followups.md` 의 FU-C5b-09 로 등록만. Phase 4.x hotfix-1 또는 Phase 5 entry 에서 처리.

## 우선 read

1. `.yagi-autobuild\phase-4-x\_wave_c5b_result.md` (baseline HEAD 5cacf22)
2. `.yagi-autobuild\phase-4-x\_artist_account_created.md` (sub_13 HALT 컨텍스트)
3. `.yagi-autobuild\phase-4-x\_followups.md` (FU-C5b-08 까지 작성됨, FU-C5b-09 추가 위치)
4. `.yagi-autobuild\PRODUCT-MASTER.md` §4
5. 메모리 #16 (Codex gpt-5.5 priority) + #18 (Reviewer Fallback fallback-only protocol)
6. `C:\Users\yout4\.codex\config.toml` — gpt-5.5 + reasoning high 적용 verify

## Codex 5.5 K-05 protocol (이 amendment 의 reviewer)

amend_01 + amend_02 = critical schema/security change → Codex 5.5 review *mandatory*. 적용 전:

### Layer 1 — Codex 5.5 review

1. Builder 가 amend 의 migration SQL + 변경 file diff 를 별도 terminal 에서 codex review:
   ```powershell
   # amend_01 review 예시
   codex review --files supabase/migrations/<ts>_phase_4_x_auto_profile_on_signup.sql
   # 또는 codex 의 정확한 review 명령에 맞춰 (codex --help 참조)
   ```
2. Codex 의 review prompt 는 다음 focus areas adversarial framing:
   - amend_01 (profile trigger): SECURITY DEFINER risk / SQL injection in handle gen / citext cast / retry loop / ON CONFLICT semantic / REVOKE EXECUTE 효과 / 'client' default 와 persona A 일관성
   - amend_02 (enum widen): additive only verify / RLS 영향 / TypeScript ProfileRole 타입 sync / Phase 5 entry artist 작업과 일관성
3. 결과 `.yagi-autobuild\phase-4-x\_amend{NN}_codex_review_loop_1.md` 저장 (raw output 그대로)
4. HIGH-A / HIGH-B finding 모두 fix → 각 fix commit
5. Codex review LOOP 2 → `_amend{NN}_codex_review_loop_2.md` → 0 HIGH-A residual 기대
6. 미달 시 LOOP 3 (Codex 5.5 의 추가 신뢰성 활용 — 기존 Opus fallback 의 LOOP 2 한도 → 3 으로 확장)
7. LOOP 3 후에도 HIGH-A residual 이면 **HALT + 야기 chat 보고**

### Layer 1 fallback (Codex 부재 시만)

토큰 소진 / binary 미가용 / config 손상 시:
- Opus 4.7 self-review (메모리 #18 protocol)
- LOOP 2 한도 (Codex 의 LOOP 3 권한 X)
- 결과 `_amend{NN}_self_review_loop_N.md`

### Layer 2 — manual verify (변경 없음)

- 야기 manual SQL verify (psql 또는 Supabase MCP execute_sql)
- Claude this-chat second-opinion (야기가 chat 에 diff paste)

Codex Layer 1 PASS + Layer 2 PASS 후에만 migration 적용 (`npx supabase db push --linked`).

### Codex 권한 확장 boundary

✅ Codex 단독 가능 (확장 권한):
- 모든 file read (src/, supabase/, .yagi-autobuild/, scripts/, messages/, .env 제외)
- pnpm test, pnpm lint, pnpm exec tsc --noEmit, pnpm build
- Migration dry-run / debug (`npx supabase db push --linked --debug` 또는 dry-run flag)
- git log, diff, branch list, blame, status
- Self-review LOOP 3 까지 (LOOP 1 → 2 → 3 자동 진행)

❌ Codex 단독 X (야기 + Builder confirm 필수):
- `npx supabase db push --linked` 실제 실행 (apply to prod)
- ff-merge to main
- git push origin <any branch>
- `.env.local` read 또는 service_role key 노출
- DELETE/DROP/TRUNCATE SQL (audit 만 가능)
- destructive cleanup script 실행

## 작업 sequence (6 amend sequential)

각 amend 끝마다 commit. 각 amend 의 **Codex Layer 1 결과** chat 보고 (야기 + this-chat Layer 2 검토).

---

### amend_01 — Profile auto-creation DB trigger

#### 현상 + 작업
이전 amendment prompt 의 amend_01 spec 그대로 (`.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md` Step 1-5 참조).

핵심:
- `supabase/migrations/<ts>_phase_4_x_auto_profile_on_signup.sql` (NEW)
- `handle_new_user()` SECURITY DEFINER trigger function
- handle = 'c_<8-char-md5>', display_name = email local part, role = 'client', locale = 'ko' default
- REVOKE EXECUTE FROM authenticated/anon
- ON CONFLICT (id) DO NOTHING

#### Codex 5.5 review LOOP

- Layer 1 LOOP 1 → `_amend01_codex_review_loop_1.md`
- HIGH-A/B fix → commit each
- LOOP 2 → `_amend01_codex_review_loop_2.md`
- (필요 시 LOOP 3)
- 0 HIGH-A residual 후 chat 보고

야기 + this-chat Layer 2 검토 PASS 후:
```powershell
npx supabase db push --linked
```

Verify (psql 또는 Supabase MCP):
- pg_proc 의 handle_new_user 존재
- pg_trigger 의 on_auth_user_created 존재
- 새 test user 가입 → profile auto-create
- 기존 user (yagi@yagiworkshop.xyz) profile 무영향

#### Commit
`fix(phase-4-x): wave-c5b amend_01 — auto-create profiles row on signup via DB trigger`

---

### amend_02 — Artist enum widening + sub_13 script 실행

#### 현상 + 작업
이전 amendment prompt 의 amend_02 spec 그대로.

핵심:
- `supabase/migrations/<ts>_phase_4_x_widen_profile_role_enum.sql` (NEW)
- ALTER profiles_role_check: 기존 ['creator', 'studio', 'observer', 'client'] + 'artist' 추가
- additive only — 기존 row 영향 0

#### Codex 5.5 review LOOP

- Layer 1 LOOP 1 → `_amend02_codex_review_loop_1.md`
- Focus: additive verify, RLS 영향, ProfileRole TypeScript sync, Phase 5 entry artist 작업과 일관성
- LOOP 2 → 0 HIGH-A residual
- chat 보고

야기 + this-chat Layer 2 후 migration 적용 → script 실행:
```powershell
npx supabase db push --linked
$env:NEXT_PUBLIC_SUPABASE_URL = "https://jvamvbpxnztynsccvcmr.supabase.co"
# SUPABASE_SERVICE_ROLE_KEY 는 .env.local 에서 (Codex 가 read X — Builder 가 직접)
npx tsx scripts/create-artist-account.ts
```

Verify:
```sql
SELECT u.id, u.email, p.role, p.display_name, p.handle
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'artist@yagiworkshop.xyz';
```

`_artist_account_created.md` UPDATE (HALTED → CREATED, user_id 기록).

#### Commit (분할)
- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
- `chore(phase-4-x): wave-c5b amend_02b — bootstrap artist demo account`

---

### amend_03 — Yonsei 'creator' → 'client' reclassify

#### 작업
이전 amendment prompt amend_03 그대로:
- audit 'creator'/'studio' rows
- yonsei (UUID 73be213d-1306-42f1-bee4-7b77175a6e79) role='client'
- 다른 rows 발견 시 chat 보고

Codex review SKIP (data correction 만, schema 변경 X).

#### Commit
`chore(phase-4-x): wave-c5b amend_03 — reclassify legacy 'creator' profile to 'client'`

---

### amend_04 — Brand onboarding FU-C5b-08 등록

#### 작업
이전 amendment prompt amend_04 그대로 — `_followups.md` 에 FU-C5b-08 추가.

Codex review SKIP (doc only).

#### Commit
`docs(phase-4-x): wave-c5b amend_04 — register FU-C5b-08 (brand onboarding rework)`

---

### amend_05 — Wizard step3.twin_intent.* i18n keys 추가 (Wave A task_03 drift)

#### 현상
야기 visual review (`/ko/app/projects/new` Step 3) 에서 raw i18n key 노출:
- `projects.wizard.step3.twin_intent.label`
- `projects.wizard.step3.twin_intent.option.undecided`
- `projects.wizard.step3.twin_intent.option.specific`
- `projects.wizard.step3.twin_intent.option.no_twin`
- (tooltip ⓘ click) `projects.wizard.step3.twin_intent.tooltip`

#### 원인
- 코드 (`src/app/[locale]/app/projects/new/new-project-wizard.tsx` line 715 부근): `t("wizard.step3.twin_intent.label")` 호출
- ko.json + en.json 의 `projects` namespace: `wizard.field.twin_intent.*` 만 존재. `wizard.step3.twin_intent.*` 없음
- → key 위치 mismatch (Wave A task_03 의 spec drift)

#### 해결 (옵션 B 채택)

`messages/ko.json` + `messages/en.json` 의 `projects.wizard.step3` 안에 `twin_intent` namespace 추가. 기존 `projects.wizard.field.twin_intent.*` 는 그대로 살림 (sub_09 cleanup audit 시 deprecated 검토).

KO (기존 `wizard.field.twin_intent` 그대로 복사):
```json
"step3": {
  "eyebrow": "STEP 3 / 3",
  "title": "최종 확인",
  "sub": "프로젝트의 마무리 정보를 입력해주세요.",
  "twin_intent": {
    "label": "Digital Twin 활용을 원하시나요?",
    "tooltip": "Digital Twin 은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다. YAGI 가 라이선스를 보유한 인물의 Twin 을 광고/콘텐츠 제작에 활용하는 걸 제안드릴 수 있습니다. Digital Twin 없이 가상 인물 / VFX 만으로도 진행 가능합니다.",
    "tooltip_aria": "Digital Twin 정보",
    "option": {
      "undecided": "Twin 활용 의향 있음",
      "specific": "정해진 인물이 있다",
      "no_twin": "Twin 활용 안 함 (가상 인물 / VFX 만)"
    }
  }
}
```

EN:
```json
"step3": {
  ...,
  "twin_intent": {
    "label": "Would you like to use a Digital Twin?",
    "tooltip": "Digital Twin is an AI asset based on real persons (artists, actors, musicians). YAGI may suggest using a Twin from our licensed roster for your project. You can also proceed without a Twin (virtual character / VFX only).",
    "tooltip_aria": "Digital Twin information",
    "option": {
      "undecided": "Open to using a Twin",
      "specific": "I have a specific person in mind",
      "no_twin": "No Twin (virtual character / VFX only)"
    }
  }
}
```

#### 작업
1. `messages/ko.json` 의 `projects.wizard.step3` 안에 위 spec 추가
2. `messages/en.json` 의 `projects.wizard.step3` 안에 위 spec 추가
3. tsc + build verify (i18n 타입 자동 generate 라면)
4. 기존 `wizard.field.twin_intent.*` 는 그대로 (다른 곳 reference 가능, 추후 audit)

#### Codex review
SKIP (i18n only, schema 변경 X). Builder self-verify (build PASS + 야기 visual re-check).

#### Files in scope
- `messages/ko.json` (UPDATE)
- `messages/en.json` (UPDATE)

#### Acceptance
- /ko/app/projects/new Step 3 → Twin intent label/option/tooltip 모두 한글 정확 표시
- /en/app/projects/new → 영문 정확
- raw i18n key 노출 0
- Tooltip ⓘ click 정상 표시

#### Commit
`fix(phase-4-x): wave-c5b amend_05 — wizard step3.twin_intent.* i18n keys added (sub_03 drift fix)`

---

### amend_06 — Submit broken root cause + fix

#### 현상
Step 3 의 "의뢰 보내기" 클릭 → 제출 안 됨. Wave A task_02 가 fix 했다고 보고했지만 여전히 broken.

#### 가능성 후보
1. amend_05 의 i18n missing 으로 Step 3 render 자체가 throw → submit handler 안 동작 (가장 가능성 높음 — amend_05 fix 시 자동 해결 가능)
2. validateStep3Fields(["deliverable_types", "budget_band"]) 거절 (필드 누락)
3. server action 의 zod 거절 (twin_intent 새 enum + meeting_preferred_at 새 field)
4. RLS 또는 RPC 거절

#### 작업 순서

**Step 1 — amend_05 적용 후 야기 chat 보고**
- amend_05 commit 후 chat 에 "amend_05 SHIPPED. /ko/app/projects/new Step 3 raw key 사라짐 verify 부탁" 보고
- 야기가 dev 환경에서 다시 wizard Step 1 → 2 → 3 진행 → 제출 시도
- 결과 chat 에 보고 (정상 or 여전히 broken)

**Step 2A — 정상 작동 시**
- amend_06 = no-op
- `_amend06_submit_diagnostic.md` 작성 ("amend_05 fix 로 자동 해결. submit 정상 작동.")
- commit `chore(phase-4-x): wave-c5b amend_06 — submit auto-resolved by amend_05 i18n fix`

**Step 2B — 여전히 broken 시**
- Builder 가 야기에게 chat 으로 추가 정보 요청:
  - Browser DevTools Console 의 에러 메시지
  - Network 탭의 submitProjectAction request 발생 여부 + status code
  - `console.error("[wizard.submit] failed:", result)` 출력 (line 970 부근)
- 정보 받은 후 root cause 분석 + fix
- Files in scope: 가능성에 따라 다름:
  - validation 거절 → wizard.tsx 의 validateStep3Fields 또는 zod schema
  - RPC 거절 → actions.ts 의 submitProjectAction zod 또는 RPC call
  - RLS 거절 → migration audit (Phase 4.x 의 새 column workspaces.kind / projects.twin_intent 의 RLS 영향)
- Codex review (RLS/zod schema 변경 시): Layer 1 LOOP 1 → `_amend06_codex_review_loop_1.md`
- Fix commit + verify

#### Acceptance
- Step 3 "의뢰 보내기" 클릭 → 정상 submit
- 성공 시 detail page 로 redirect
- 실패 case → user-friendly toast (정확한 i18n key)
- /ko + /en parity

#### Commit
`fix(phase-4-x): wave-c5b amend_06 — submit broken precise fix (root cause: <X>)`
또는 amend_05 자동 해결 시 `chore(phase-4-x): wave-c5b amend_06 — submit auto-resolved by amend_05`

---

### Final — 통합 verify + STOP

```powershell
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

3개 모두 exit 0 (lint baseline 유지).

`_wave_c5b_amendments_result.md` 작성:
- 6 amend 결과 요약
- amend_01/02 의 Codex 5.5 review LOOP 결과
- amend_05 의 i18n drift fix
- amend_06 의 submit 결과 (auto-resolved or precise fix)
- amend_03/04 결과
- 야기 visual re-review 권장 사항

**FU-C5b-09 신규 등록** (`_followups.md` 에 추가):

```markdown
## FU-C5b-09 — Meeting type/duration UX rework (Phase 4.x hotfix-1 또는 Phase 5 entry)

야기 visual review (2026-05-01) 발견:
- /ko/app/meetings/new 의 "소요 시간" (30/45/60/90분) = client 에게 의미 없음
- 모든 client 미팅 = 자연스럽게 1시간. duration 은 야기 admin side 정보
- 더 의미 있는 변경: "소요 시간" → "선호 미팅 방식" (온라인 / 대면)
- 대면 선택 시 conditional input ("선호 장소가 있으신가요?") 자연스러움

### Spec (Phase 4.x hotfix-1 시 적용)
- meetings 테이블 schema 변경:
  - `meeting_type` text column 추가 ('online' / 'offline', default 'online')
  - `location_preference` text column 추가 (nullable)
  - `duration_minutes` 그대로 두되 server-side default 60 enforce (column 자체는 admin 측 활용 위해 살림)
- UI 변경 (`/app/meetings/new` 또는 modal):
  - 소요 시간 radio 폐기 (UI hide)
  - 신규: "선호 미팅 방식" radio (온라인/대면)
  - 대면 선택 시 conditional input (선호 장소, 선택)

### 영향
- 신규 migration (`meeting_type` + `location_preference` ADD)
- meetings/new form + meeting create RPC zod
- /ko + /en i18n
- google calendar sync 영향 0 (meeting_type 은 metadata only)

### 처리 시점
Phase 4.x hotfix-1 (FU-C5b-08 brand onboarding 과 함께 묶음 권장) 또는 Phase 5 entry IA 정리 시.

### 등록자
야기 (chat 2026-05-01), Wave C.5b amendment 결정.
```

`_run.log` 기록:
```
<ISO> phase-4-x WAVE_C5B_CODEX_AMENDMENTS SHIPPED amend_count=6 sha=<latest> tsc=ok lint=baseline build=ok codex_reviews_loops_total=<N>
<ISO> FU-C5b-09 registered (meeting type/duration UX rework, deferred to hotfix-1 or Phase 5)
```

**STOP** — Wave D 진입 X. 야기 visual re-review 후 다음 wave 결정.

---

## 사고 처리

- **MAJOR** (Codex review HIGH-A finding LOOP 3 후에도 residual / tsc/build fail / supabase config 손상) → 그 amend STOP, 야기 chat 보고
- **MINOR** → 진행 + `_hold/issues_c5b_codex_amend.md`
- amend_03 audit 에서 *예상 외 'creator'/'studio' rows* 발견 시 즉시 chat 보고

## 제약 (CRITICAL)

- **L-027 BROWSER_REQUIRED gate** — main push 절대 X
- main 에 ff-merge 절대 X. g-b-9-phase-4 에만 commit
- spawn 사용 X
- Codex 권한 확장 boundary 명시 (위 §"Codex 권한 확장 boundary" 참조)
- Codex 가 destructive 작업 (DELETE/DROP/TRUNCATE/push/apply prod) 시도 시 즉시 STOP
- L-001 PowerShell `&&` 금지

## Output expectations

`.yagi-autobuild\phase-4-x\` 안에:
- `_amend01_codex_review_loop_1.md` (LOOP 1 raw output)
- `_amend01_codex_review_loop_2.md` (LOOP 2)
- (필요 시) `_amend01_codex_review_loop_3.md`
- `_amend01_test_log.md` (functional test 결과)
- `_amend02_codex_review_loop_*.md`
- `_artist_account_created.md` (UPDATE — HALTED → CREATED)
- `_wave_c5b_sub10_db_audit.md` (UPDATE — amend_03 결과)
- `_followups.md` (UPDATE — FU-C5b-09 추가)
- `_amend05_i18n_audit.md` (변경 결과)
- `_amend06_submit_diagnostic.md` (auto-resolved or root cause)
- `_wave_c5b_amendments_result.md` (6 amend 통합)
- `_run.log` 추가 라인

## 시작

amend_01 부터 즉시. Codex Layer 1 LOOP 1 결과 chat 보고 (야기 + this-chat Layer 2 검토 위해). 의문점 발생 시 즉시 chat 보고.

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆
