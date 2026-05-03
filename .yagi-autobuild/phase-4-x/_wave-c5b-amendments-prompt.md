# Phase 4.x — Wave C.5b post-rollback amendment Prompt

> sub_00 light rollback 끝난 후 야기 추가 fix 4건.
> sub_01.amendment (profile auto-trigger) + sub_13.amendment (artist enum widening + 실행) + sub_10.amendment (yonsei creator reclassify) + brand onboarding followup.
> Wave D 진입 전. lead Builder 직접 작업 (no spawn). 끝나면 STOP.

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

**WAVE C.5b POST-ROLLBACK AMENDMENT — sub_01.amendment + sub_13.amendment + sub_10.amendment + brand onboarding followup. lead Builder 직접 작업 (no spawn). 끝나면 STOP.**

야기 시각 review (sub_00 rollback 후) 결과 추가 issue 4건 발견. Wave D 진입 전 처리.

## 야기 결정 (chat lock, 2026-05-01)

1. **profile auto-creation** — DB trigger 방식 (옵션 C, 가장 robust). 새 user 가입 시 profiles row 자동 생성.
2. **artist enum widening** — Phase 5 까지 안 미룸. Phase 4.x 안에서 처리. 야기가 *지금* artist 시각 review 필요.
3. **brand onboarding step** — 즉시 fix X. `_followups.md` 등록만 (야기가 "건너뛰기" 눌러서 dashboard 진입 가능).
4. **profiles role 'creator'/'studio' archive** — sub_10 follow-up. yonsei 계정 재분류.

K-05 reviewer fallback (Codex 토큰 부재 시):
- enum widening 같은 schema 변경 = critical, Reviewer Fallback Layer 1 (Opus 4.7 self-review adversarial) 적용
- profile auto-trigger = SECURITY DEFINER function 이라 critical, 같은 fallback
- migration 적용 전 review LOOP 1 + 야기 + this-chat second-opinion (Layer 2)

## 우선 read

1. `.yagi-autobuild\phase-4-x\_wave_c5b_result.md` (현 상태 baseline = HEAD 5cacf22)
2. `.yagi-autobuild\phase-4-x\_artist_account_created.md` (sub_13 HALT 컨텍스트)
3. `.yagi-autobuild\PRODUCT-MASTER.md` §4
4. 메모리 #18 — Codex 부재 시 Reviewer Fallback protocol

## 작업 sequence (4 sub-task sequential)

각 sub-task 끝마다 commit.

---

### amend_01 — Profile auto-creation DB trigger (sub_01 의 dangling fix)

#### 현상
- Wave C.5b sub_01 가 role selection page (`/role`) 폐기했지만, *profile 생성 step 을 새 위치로 옮기지 않음*
- 결과: 새 user 가입 → email confirm → workspace 만들기 시 `profile_required` toast 발생
- 야기 manual 조치: yout40204020@gmail.com 의 profile SQL INSERT 직접 (handle='c_a2df55bf', role='client')
- 정확한 fix: DB trigger 로 auth.users INSERT → profiles auto-create

#### 작업

**Step 1 — Migration 작성**

`supabase/migrations/<ts>_phase_4_x_auto_profile_on_signup.sql` (NEW):

```sql
-- Phase 4.x Wave C.5b amend_01 — auto-create profiles row on auth.users INSERT
-- Replaces the role-selection-page-driven profile creation that was removed
-- in sub_01 when the /role surface was dropped (persona model A).
--
-- Default role = 'client' since persona A = Brand-only active persona.
-- Phase 5 entry will revisit when 'artist' enum + Artist intake surface
-- come online (DECISIONS Q-094).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handle citext;
  v_display_name text;
  v_locale text;
  v_attempt int := 0;
BEGIN
  -- handle: c_<8-char-md5> (matches profiles_handle_check ^[a-z0-9_-]{3,30}$)
  -- Retry on collision (extremely rare with md5 + uuid input)
  LOOP
    v_handle := ('c_' || substr(md5(NEW.id::text || COALESCE(NEW.email, '') || v_attempt::text), 1, 8))::citext;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE handle = v_handle);
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      RAISE EXCEPTION 'profile handle generation failed after 5 attempts for user_id=%', NEW.id;
    END IF;
  END LOOP;

  -- display_name: email local part fallback ('user' if no email)
  v_display_name := COALESCE(split_part(NEW.email, '@', 1), 'user');

  -- locale: prefer raw_user_meta_data, else 'ko'
  v_locale := COALESCE(NEW.raw_user_meta_data->>'locale', 'ko');
  IF v_locale NOT IN ('ko', 'en') THEN
    v_locale := 'ko';
  END IF;

  INSERT INTO public.profiles (id, handle, display_name, role, locale)
  VALUES (NEW.id, v_handle, v_display_name, 'client', v_locale)
  ON CONFLICT (id) DO NOTHING;  -- idempotent if profile already exists

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permissions: trigger uses SECURITY DEFINER so it runs as definer.
-- Function owner should be a high-privilege role (postgres or supabase_admin).
-- DO NOT grant EXECUTE to authenticated/anon — trigger fires server-side only.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
```

**Step 2 — Reviewer Fallback Layer 1 (Opus 4.7 self-review)**

별도 컨텍스트 (clean Claude Code session 또는 Builder 의 별도 사고) 에서 adversarial review:

```
Adversarial review target: 위 migration SQL.

Focus areas:
1. SECURITY DEFINER risk — function 의 search_path 가 'public' 으로 고정됐는데,
   v_handle 의 'c_' prefix concatenation 에서 SQL injection vector 가 있나?
   (NEW.email 이 user input 이지만 supabase auth 가 sanitize 하지만, defense in depth)
2. citext cast — NEW.email 이 citext-incompatible 이면 silent fail 가능?
3. 5-attempt retry — md5 collision 가능성 0 에 가깝지만, attempt 변수 inject 후
   여전히 collision 시 정확히 raise? infinite loop 위험은?
4. ON CONFLICT (id) DO NOTHING — id 는 PK 라 UNIQUE 보장됨. 만약 다른 unique
   constraint (예: handle UNIQUE) 가 conflict 면? → handle 은 retry loop 가
   처리하지만 INSERT 시점에 또 collision 가능성?
5. raw_user_meta_data->>'locale' — JSON path 가 NULL 이면? cast 안전?
6. Trigger AFTER INSERT — auth.users INSERT 가 실패하면 profile 도 안 만들어짐
   (정상). 하지만 trigger 가 raise 하면 auth.users INSERT 도 rollback 되나?
7. REVOKE EXECUTE — supabase 의 trigger 는 internal 하게 정의자 권한으로
   실행되므로 REVOKE 가 trigger fire 막지 않음. 검증.
8. 'client' default role — persona A 결정과 일치하나? PRODUCT-MASTER §4 참조.

Each finding: HIGH-A (security-critical) / HIGH-B (high-impact bug) /
MEDIUM (defense-in-depth) / LOW (style).
```

결과 `_amend01_self_review.md` 저장.

**Step 3 — Layer 2 manual verify (Builder 가 야기에게 chat 보고)**

Builder 가 self-review 결과 chat 보고. 야기 + this-chat (Claude) 가 추가 검토.

Layer 1 + Layer 2 모두 0 HIGH-A residual 확인 후 Step 4.

**Step 4 — Migration 적용**

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
npx supabase db push --linked
```

Verify (psql 또는 Supabase MCP `execute_sql`):
- `SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';` → 1 row
- `SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';` → 1 row

**Step 5 — Functional test (Builder 가 manual 또는 dev 시뮬레이션)**

Test 1: 새 user 가입 시 profile auto-create
- Supabase Auth admin API 또는 Dashboard 로 test user 생성 (test-amend01@yagiworkshop.xyz)
- profiles 테이블 SELECT 후 row 존재 확인:
  - handle ~ '^c_[a-f0-9]{8}$'
  - display_name = 'test-amend01'
  - role = 'client'
  - locale = 'ko'
- Cleanup: 그 test user 삭제 (cascade 안전 SQL)

Test 2: handle collision retry
- (선택) v_attempt loop 가 동작하는지 확인 — 어려우면 SKIP (md5 collision 은 사실상 불가능)

Test 3: 기존 user 영향 없음
- yagi@yagiworkshop.xyz, yout40204020@gmail.com 둘 다 profile 그대로 유지 확인

#### Files in scope
- `supabase/migrations/<ts>_phase_4_x_auto_profile_on_signup.sql` (NEW)
- `_amend01_self_review.md` (NEW, Layer 1 결과)
- `_amend01_test_log.md` (NEW, Step 5 결과)

#### Acceptance
- Migration 적용 + verify PASS
- Layer 1 self-review 0 HIGH-A residual
- Layer 2 야기 + this-chat 검토 PASS
- Test 1 PASS (새 user → profile auto-create + 모든 field 정확)
- Test 3 PASS (기존 user 무영향)

#### Commit
`fix(phase-4-x): wave-c5b amend_01 — auto-create profiles row on signup via DB trigger (sub_01 dangling fix)`

---

### amend_02 — Artist enum widening + sub_13 실제 실행

#### 야기 결정 변경
- 기존: 'artist' enum widening = Phase 5 entry migration 에서 처리 (sub_13 HALT)
- 변경: Phase 4.x 안에서 처리. 야기가 *지금* artist demo 계정으로 시각 review 필요.

이유:
- enum widening 자체는 *additive* 변경 (기존 row 영향 0)
- artist 계정 = visual smoke 의 prerequisite (Phase 5 entry 의 prerequisite 가 아님)
- sub_13 의 script 가 idempotent 라 enum 만 widen 하면 즉시 실행 가능

#### 작업

**Step 1 — Migration 작성**

`supabase/migrations/<ts>_phase_4_x_widen_profile_role_enum.sql` (NEW):

```sql
-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'
--
-- Additive only: existing rows unaffected. PRODUCT-MASTER §4 persona model
-- includes 'artist' as first-class persona. Demo account creation
-- (sub_13) requires this enum value.
--
-- Phase 5 entry will introduce Artist Roster intake surface; this
-- migration unblocks the demo account ahead of that surface design.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    (role IS NULL) OR
    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
  );
```

**Step 2 — Reviewer Fallback Layer 1**

```
Adversarial review target: 위 enum widening migration.

Focus areas:
1. Additive only verify — 기존 row 의 role 값 ('client', 'creator', 'studio',
   'observer', NULL) 모두 새 CHECK 통과? 위반되는 row 0 인지 audit?
2. RLS policy 가 role 값을 enum 으로 strictly 사용하는 곳 있나?
   ('artist' 추가 시 의도치 않은 RLS bypass?)
3. Server-side action / RPC 가 role 검증할 때 'artist' 미인지 시 fail-safe?
4. Application code 의 ProfileRole TypeScript 타입이 'artist' 빠져있으면
   compile error 나는 곳? (Builder 가 type 갱신 필요?)
5. 기존 'creator' / 'studio' role 처리 — persona A 결정으로 deprecated 지만
   row 살아있음. Application 이 unknown role 에 graceful 한지?
6. Phase 5 entry 의 Artist intake surface 가 별도 migration 으로 enum 추가
   계획이었는데, 지금 추가하면 Phase 5 의 다른 작업 (예: artist_profiles
   table 또는 workspaces.kind='artist') 이 stale spec 되지 않나?

Output format: 동일.
```

결과 `_amend02_self_review.md`.

**Step 3 — Layer 2 manual verify**

야기 + this-chat 검토. 특히 *Phase 5 entry 의 다른 artist 작업과의 일관성* 확인.

**Step 4 — Migration 적용 + verify**

```powershell
npx supabase db push --linked
```

Verify:
```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'profiles_role_check';
-- 결과에 'artist' 포함 확인
```

기존 row audit:
```sql
SELECT role, count(*) FROM profiles GROUP BY role ORDER BY role;
-- 'creator' / 'studio' / 'observer' / 'client' / NULL 분포 확인
```

**Step 5 — sub_13 script 실행 (artist 계정 생성)**

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://jvamvbpxnztynsccvcmr.supabase.co"
# SUPABASE_SERVICE_ROLE_KEY 는 .env.local 에서 읽거나 manual set
npx tsx scripts/create-artist-account.ts
```

Verify:
```sql
SELECT u.id, u.email, p.role, p.display_name, p.handle
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'artist@yagiworkshop.xyz';
-- role='artist', display_name='Artist Demo', handle='artist_demo_<6char>'
```

#### Files in scope
- `supabase/migrations/<ts>_phase_4_x_widen_profile_role_enum.sql` (NEW)
- `scripts/create-artist-account.ts` (이미 있음, 변경 X)
- `_amend02_self_review.md` (NEW)
- `_artist_account_created.md` (UPDATE — HALTED 상태 → CREATED 로 변경, user_id + verify SQL 결과 기록)
- 필요 시 TypeScript ProfileRole 타입 갱신 (`src/types/profile.ts` 또는 유사) — Builder 가 grep 후 결정

#### Acceptance
- Migration 적용 + CHECK constraint 'artist' 포함
- 기존 row 무영향 (audit)
- self-review 0 HIGH-A
- artist@yagiworkshop.xyz 계정 생성 + email_confirmed + role='artist'
- Login test 가능 (야기가 시각 review 시 사용)
- TypeScript build exit 0

#### Commit (분할)
- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
- `chore(phase-4-x): wave-c5b amend_02b — bootstrap artist demo account (sub_13 unblocked)`

---

### amend_03 — Yonsei 계정 'creator' role reclassify (sub_10 follow-up)

#### 현상
- yout40204020@yonsei.ac.kr (user_id=73be213d-1306-42f1-bee4-7b77175a6e79) profiles.role = 'creator'
- 야기 결정 A (persona model) = 'client' / 'observer' 만 active. 'creator' / 'studio' deprecated.
- yonsei 계정은 야기 본인의 testing 계정 (메모리 + chat 컨텍스트)
- Persona A 와 정합 위해 'client' 로 reclassify

#### 작업

**Step 1 — Audit 다시 (혹시 다른 'creator' / 'studio' rows 있는지)**

```sql
SELECT id, role, display_name, created_at
FROM profiles
WHERE role IN ('creator', 'studio')
ORDER BY created_at;
```

**Step 2 — Reclassify**

옵션 A (권장): role = 'client'
옵션 B: role = NULL (then onboarding-flow re-init 강제)

야기 결정: **A** (yonsei 는 야기 본인 testing 계정, 'client' 로 일관 처리). 다른 'creator'/'studio' rows 있으면 야기 chat 보고 후 case-by-case.

```sql
UPDATE profiles
SET role = 'client', updated_at = now()
WHERE id = '73be213d-1306-42f1-bee4-7b77175a6e79'
RETURNING id, role;
```

다른 rows 발견 시: Builder 가 chat 보고 → 야기 결정 후 처리.

**Step 3 — Verify**

```sql
SELECT role, count(*) FROM profiles GROUP BY role ORDER BY role;
-- 'creator' / 'studio' 가 0 인지 확인 (또는 야기가 살리기로 결정한 row 만 남음)
```

#### Files in scope
- `_wave_c5b_sub10_db_audit.md` (UPDATE — reclassify 결과 기록)
- 필요 시 migration 으로 묶을 수도 있지만, *one-off data correction* 이라 SQL 직접 실행이 더 자연스러움. Migration 으로 묶을 경우: `supabase/migrations/<ts>_phase_4_x_reclassify_legacy_creator_profiles.sql` (NEW, idempotent INSERT/UPDATE 형태)

#### Acceptance
- yonsei 계정 role='client'
- 다른 'creator'/'studio' rows 처리 결정 + 적용
- profiles 테이블 audit clean

#### Commit
`chore(phase-4-x): wave-c5b amend_03 — reclassify legacy 'creator' profile to 'client' (persona A consistency)`

---

### amend_04 — Brand onboarding step `_followups.md` 등록

#### 야기 결정
- /onboarding/brand step (signup → workspace 만들기 후 강제 진입) = multi-brand agency 가정 surface
- 의뢰자의 90%+ = 1 workspace = 1 brand → step 자체 redundant
- 즉시 fix 안 함, `_followups.md` 등록만

#### 작업

`.yagi-autobuild\phase-4-x\_followups.md` 에 append:

```markdown
## FU-C5b-08 — Brand onboarding step model 재검토 (Phase 4.x hotfix-1 또는 Phase 5 entry)

야기 시각 review (2026-05-01 sub_00 rollback 후) 발견:
- /onboarding/brand step = multi-brand agency 가정 surface (Phase 2.x 잔재)
- 의뢰자의 90%+ = 1 workspace = 1 회사 = 1 brand → step 자체 redundant
- "건너뛰기" 가 default flow 가 되어버린 어색함
- Phase 4.x Wave C.5b 야기 결정: 즉시 fix 안 함 (Wave C.5b scope creep 방지),
  Phase 4.x ff-merge 후 hotfix-1 또는 Phase 5 entry 에서 IA 정리와 함께 처리

### 3 옵션
a. 유지 + default skip 권장 표시 강화 (가장 작은 변경)
b. 1 workspace = 1 brand 모델 단순화 (brands 테이블 → workspace 의 column 통합)
c. brand onboarding step 폐기, brand 관리는 settings 안으로 이전 (multi-brand 광고대행사만 활성)

### 권장 (chat 분석)
**c (UX 가장 깨끗, 광고대행사는 minority case)**

### 영향
- /onboarding/brand route 폐기 (또는 settings 으로 이동)
- workspace 생성 후 자동 brand 1개 default 생성 (workspace.name = brand.name)
- /app/settings/workspace 안에 "brand 관리" 섹션 추가 (multi-brand 활성)
- brands 테이블 RLS 영향 없음 (이미 workspace_id 기반)

### 처리 시점
Phase 4.x ff-merge 후 hotfix-1 또는 Phase 5 entry (Artist Roster 와 함께 IA 정리)
```

#### Acceptance
- `_followups.md` 에 FU-C5b-08 추가
- 추가 file 변경 0 (즉시 fix 안 함)

#### Commit
`docs(phase-4-x): wave-c5b amend_04 — register brand onboarding step model rework as FU-C5b-08`

---

### Final — 통합 verify + STOP

```powershell
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

3개 모두 exit 0 (lint baseline 유지).

`_wave_c5b_amendments_result.md` 작성:
- 4 amend 결과 요약
- amend_01 의 self-review + manual verify 결과
- amend_02 의 enum widening + artist 계정 생성 결과
- amend_03 의 reclassify 결과 (다른 rows 있었는지 포함)
- amend_04 의 followup 등록

`_run.log` 기록:
```
<ISO> phase-4-x WAVE_C5B_AMENDMENTS SHIPPED amend_count=4 sha=<latest> tsc=ok lint=baseline build=ok
<ISO> phase-4-x WAVE_C5B_END_BEFORE_WAVE_D sha=<latest> awaiting_yagi_full_visual_review=true (post-rollback + post-amendments)
```

**STOP** — Wave D 진입 X. 야기 visual re-review 후 다음 wave 결정.

---

## 사고 처리

- **MAJOR** (self-review 가 HIGH-A finding 발견 + 야기 confirm 시) → 그 amend STOP, 다음 amend 진입 X, 야기 chat 보고
- **MINOR** → 진행 + `_hold/issues_c5b_amend.md` 기록
- amend_03 에서 audit 결과 *예상 외 'creator'/'studio' rows* 발견 시 → 즉시 chat 보고 (data 영향 평가 필요)

## 제약 (CRITICAL)

- **L-027 BROWSER_REQUIRED gate** — main push 절대 X
- main 에 ff-merge 절대 X. g-b-9-phase-4 에만 commit
- spawn 사용 X
- migration 적용 전 self-review LOOP 1 + 야기/this-chat second-opinion 필수 (critical schema change)
- L-001 PowerShell `&&` 금지

## Output expectations

`.yagi-autobuild\phase-4-x\` 안에:
- `_amend01_self_review.md` (NEW)
- `_amend01_test_log.md` (NEW)
- `_amend02_self_review.md` (NEW)
- `_artist_account_created.md` (UPDATE — HALTED → CREATED)
- `_wave_c5b_sub10_db_audit.md` (UPDATE)
- `_followups.md` (UPDATE — FU-C5b-08 추가)
- `_wave_c5b_amendments_result.md` (NEW, 4 amend 통합)
- `_run.log` 추가 라인

## 시작

amend_01 부터 즉시. self-review LOOP 1 결과는 chat 으로 보고 (야기 + this-chat Layer 2 검토 위해). 의문점 발생 시 즉시 chat 보고.

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆
