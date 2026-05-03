# Phase 4.x — Wave C.5c Prompt (PKCE + auth fixes + Twin UX redesign + brand assets)

> Wave A task_01 migration 이미 prod 적용됨 (chat 에서 야기 GO + apply_migration MCP).
> submit broken 자동 해결됨 (twin_intent column 존재).
> 6 sub-task sequential. lead Builder 직접 작업 (no spawn). 끝나면 STOP.

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

**WAVE C.5c — PKCE flow + auth fixes + Twin intent UX redesign + brand assets. lead Builder 직접 작업 (no spawn). 끝나면 STOP.**

야기 시각 review (sub_00 rollback + amendments-v2 후) 결과 추가 issue 6건 발견.

## Pre-condition (chat 에서 미리 처리됨)

- ✅ Wave A task_01 migration prod apply 완료 (chat MCP, sha=N/A — direct apply, not via supabase CLI). DB 상태:
  - workspaces.kind text (5 rows = 'brand', 1 reclassified to 'yagi_admin' for `YAGI Internal` ws)
  - projects.twin_intent text NOT NULL DEFAULT 'undecided' CHECK 3-enum
  - projects.kind constraint = 6-enum
  - project_licenses 테이블 + RLS + indexes + trigger
- ✅ submit broken root cause = missing twin_intent column → 자동 해결됨

## 야기 결정 (chat lock, 2026-05-01)

1. **PKCE flow 전환** — Gmail crawler 회피 (Supabase 공식 권장)
2. **다시 보내기 wiring fix** — auth/expired 의 resend 가 silent fail 또는 rate limit
3. **Twin intent UX 재설계** — 2-step conditional + 옵션 워딩 + tooltip 짧게 + 위치 구분선
4. **Submit 버튼 워딩**: "의뢰 보내기" → "프로젝트 의뢰하기"
5. **Brand asset sidebar logo** — icon (24×24) + text logo (height 18-20) 가로 배치, gap 10
6. **Brand asset talk FAB** — 56×56 fixed bottom-right, padding 24, 기존 support panel 재사용

## Codex 5.5 K-05 protocol

- Model = `gpt-5.5`, reasoning effort = `"high"`
- Builder 별도 terminal `codex review` spawn
- LOOP 1 → 2 → 3 까지
- 권한 확장: read/test/migration verify/git read-only/self-review LOOP 3
- Boundary: prod migration apply 야기 confirm / ff-merge 야기 / push origin main 야기 / .env.local X / destructive SQL X

K-05 mandatory:
- sub_01 (PKCE flow — auth security-critical)
- sub_03 (Twin intent zod schema 변경 + persistence path)

K-05 skip:
- sub_02 (다시 보내기 wiring — server action 변경 시 review 권장)
- sub_04 (i18n only)
- sub_05/06 (UI only)

## 우선 read

1. `.yagi-autobuild\phase-4-x\_wave_c5b_amendments_v2_result.md` (baseline HEAD 85af274)
2. `.yagi-autobuild\PRODUCT-MASTER.md` §4
3. `C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md`
4. `C:\Users\yout4\.codex\config.toml` (gpt-5.5)
5. Supabase Auth docs (PKCE flow): https://supabase.com/docs/guides/auth/sessions/pkce-flow
6. `src/lib/supabase/server.ts` + `src/lib/supabase/client.ts` (createSupabase 클라이언트 진입점)
7. `src/app/[locale]/(auth)/callback/route.ts` (auth callback handler)
8. `src/app/[locale]/auth/expired/page.tsx` (Wave C.5b sub_04 신규)
9. `src/app/[locale]/app/projects/new/new-project-wizard.tsx` line 715 부근 (Twin intent UI)
10. `src/app/[locale]/app/projects/new/actions.ts` (SubmitInputSchema)
11. `messages/ko.json` + `messages/en.json` (`projects.wizard.actions.submit`)
12. `src/components/app/sidebar.tsx` (또는 sidebar header 위치)
13. `src/components/support/` (기존 support FAB/panel 식별)
14. `Assets/yagi-icon-logo-black.png` (24-28 size 권장, 실제 PNG 124KB)
15. `Assets/yagi-text-logo-black.png` (height 18-20 권장, 실제 PNG 480KB)
16. `Assets/yagi-talk-icon.png` (56×56 권장, 실제 PNG 540KB — large, next/image 자동 최적화 의존)

## 작업 sequence (6 sub-task sequential)

각 sub 끝마다 commit. K-05 mandatory sub 는 LOOP 0 HIGH-A residual 후 진행.

---

### sub_01 — PKCE flow 전환 (🔴 prod blocker, K-05 mandatory)

#### 현상
- Gmail / Outlook / 회사 메일 클라이언트 가 link preview 위해 자동 GET → Supabase OTP single-use consume → 사용자 본인 클릭 시 expired error
- 야기 확인: dana.clara0830@gmail.com (14:27:22 가입) → email_confirmed_at = 14:27:50 (28초 후 자동 confirm, last_sign_in_at = null = bot crawler)
- 모든 Gmail 가입자 영향 = production blocker

#### 해결 (Supabase 공식)

**PKCE flow** = OAuth 2.0 PKCE. Email link 클릭 → intermediate `/auth/confirm?token_hash=...&type=signup` page 보여주고, 사용자가 *그 page 에서 Continue 누를 때* OTP consume. Crawler 영향 0.

#### 작업 sequence

**Step 1 — Supabase 클라이언트 flowType 변경**

`src/lib/supabase/server.ts` + `client.ts` 의 createSupabase* 함수에 `flowType: 'pkce'` 추가:

```ts
// server.ts (예시 — 실제 codebase 패턴 맞춰)
import { createServerClient } from '@supabase/ssr';

export async function createSupabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',  // ⬅ 추가
      },
      cookies: { /* ... */ },
    }
  );
}
```

`client.ts` 도 동일.

**Step 2 — Email template 의 `{{ .ConfirmationURL }}` 처리 변경**

PKCE 시 Supabase 의 `{{ .ConfirmationURL }}` 가 자동으로 `/auth/confirm?token_hash=...&type=signup&next=...` 형태로 생성됨. Email template 자체는 그대로 (Wave C.5b sub_06 의 brand HTML 유지).

**Step 3 — `/auth/confirm` route 신규 (또는 기존 callback 변경)**

`src/app/[locale]/auth/confirm/route.ts` (NEW) — token_hash + type 받아서 verifyOtp 호출:

```ts
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/onboarding/workspace';

  if (token_hash && type) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Session set in cookie via SSR helper. Redirect to onboarding.
      return NextResponse.redirect(new URL(next, request.url));
    }
    // OTP invalid or expired
    return NextResponse.redirect(new URL('/auth/expired', request.url));
  }

  return NextResponse.redirect(new URL('/signin', request.url));
}
```

**Step 4 — 기존 `/[locale]/(auth)/callback/route.ts` 처리**

기존 callback 은 `?code=` (OAuth code grant) 받음. PKCE 도 *동일한 path* 로 동작 가능 (`exchangeCodeForSession`). `/auth/confirm` 와 `/(auth)/callback` 둘 다 살리거나 통합 — Builder 가 검토 후 결정.

**Step 5 — Supabase Dashboard 의 redirect URL allowlist 추가**

`_followups.md` 에 등록 (Builder 가 직접 dashboard 변경 못 함):
- localhost:3003/auth/confirm
- localhost:3003/[locale]/auth/confirm
- studio.yagiworkshop.xyz/auth/confirm
- studio.yagiworkshop.xyz/[locale]/auth/confirm
- (기존 callback URL 들 유지)

**Step 6 — Email template 의 redirect_to 명시**

Supabase Auth 의 signup signOut 에서 `emailRedirectTo` 옵션 명시:

```ts
// signup action
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding/workspace`,
  }
});
```

#### Codex K-05 LOOP

```bash
codex review src/lib/supabase/server.ts src/lib/supabase/client.ts \
  src/app/[locale]/auth/confirm/route.ts \
  src/app/[locale]/(auth)/callback/route.ts \
  --model gpt-5.5 --reasoning-effort high \
  --focus "PKCE security, token_hash validation, session cookie set, redirect open-redirect, race condition, RLS impact" \
  --output _amend_c5c_sub01_codex_review_loop1.md
```

Focus areas:
1. PKCE 표준 준수 — token_hash + type 외 추가 verify?
2. `next` query param — open-redirect vector? (allowlist 필요)
3. SSR cookie set — 정확히 동작?
4. 기존 callback 과 충돌? (OAuth code vs PKCE token_hash 둘 다 GET?)
5. `verifyOtp` 의 error 종류 (expired / invalid / consumed) 분기 처리?
6. Crawler GET 시 intermediate page 가 *static HTML* 라 OTP consume 안 됨 verify
7. PKCE code_verifier 가 SSR 환경에서 cookie 또는 session 에 정확히 저장?

LOOP 2 → 3 same protocol.

#### Migration

PKCE flow 전환은 *Supabase 클라이언트 설정 변경* + *route handler 변경* 이라 SQL migration 0. 단 기존 가입 user 영향 없음 (이미 confirmed 상태).

#### Acceptance
- 신규 user 가입 → email link 클릭 → /auth/confirm intermediate page → session set → /onboarding/workspace
- Gmail crawler 가 link preview GET 해도 OTP 미consume (intermediate page 가 사용자 액션 대기)
- 만료된 link 클릭 → /auth/expired 정상 redirect
- 정상 sign-in flow 무영향

#### Commit
`feat(phase-4-x): wave-c5c sub_01 — PKCE flow + /auth/confirm intermediate page (Gmail crawler bypass)`

---

### sub_02 — 다시 보내기 wiring fix (HIGH)

#### 현상
- /auth/expired page 의 "이메일 다시 보내기" 클릭 → toast "새 인증 링크를 보냈습니다" 표시
- 실제 이메일 안 옴
- 가능성: silent fail (success toast UI 만 표시) 또는 Supabase rate limit (1분 cooldown)

#### 작업

1. /auth/expired page (Wave C.5b sub_04 신규) 의 resend handler 식별
2. `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: ... } })` 호출 verify
3. error 응답 처리:
   - rate limit (429) → toast "잠시 후 다시 시도해 주세요" + cooldown countdown UI
   - invalid email → toast "이메일을 확인해 주세요"
   - 정상 → toast "새 인증 링크를 보냈습니다. 메일함을 확인해 주세요."
4. PKCE flow 도입으로 emailRedirectTo 도 `/auth/confirm` 로 갱신
5. cooldown (60초) — button disabled 동안 countdown 표시

#### Files in scope
- `src/app/[locale]/auth/expired/page.tsx`
- 또는 expired-form 컴포넌트
- 필요 시 server action wrapping resend (클라이언트 직접 호출 시 RLS 영향 X 라 client side OK)

#### Acceptance
- /auth/expired → 이메일 입력 → "이메일 다시 보내기" → 정상 이메일 도착
- 60초 내 재시도 시 cooldown UI 명확
- error case 별 다른 toast

#### Codex K-05
- 권장 (server action 추가 시), skip (client-side resend only)
- Builder 가 구현 후 결정

#### Commit
`fix(phase-4-x): wave-c5c sub_02 — auth/expired resend wiring + rate-limit cooldown UI`

---

### sub_03 — Twin intent UX 재설계 (MEDIUM, K-05 mandatory)

#### 현상 (야기 visual review)
- 현 위치: budget/date 직후 → 너무 붙어있음
- 워딩 어려움: "Digital Twin 활용을 원하시나요?" — 일반 client 이해 X
- 옵션 애매함: "Twin 활용 의향 있음" / "정해진 인물이 있다" / "Twin 활용 안 함"
- Tooltip 너무 길어 읽기 싫음

#### 야기 결정 = 2-step conditional

**Step 1: 결과물 인물 포함 여부**
- 위치: budget/date 위 또는 wizard step 자체 분리 *X* (step 3 안 sub-section)
- Label: "결과물에 인물(아티스트/배우/모델 등)이 포함되나요?"
- Type: Radio 2-option
- Options:
  - "예 — 인물이 포함됩니다"
  - "아니오 — 인물 없는 작업입니다 (제품샷/모션그래픽/풍경 등)"

**Step 2: Digital Twin (조건부 노출, Step 1 = "예" 일 때만)**
- Label: "Digital Twin 활용 (선택)"
- Type: Radio 3-option
- Options:
  - "YAGI Twin 활용 (추천)"
  - "자체 인물 기반 제작"
  - "아직 결정 안 됨"
- Tooltip (짧게):
  > "Digital Twin은 실제 아티스트의 IP를 기반으로 생성된 AI 자산입니다. 희망 시 광고, 콘텐츠 제작에 활용을 제안드리고 있습니다."

#### Persistence (zod + RPC + DB)

**zod schema 변경** (`src/app/[locale]/app/projects/new/actions.ts` SubmitInputSchema):

기존:
```ts
twin_intent: z.enum(["undecided", "specific_in_mind", "no_twin"]).optional().default("undecided"),
```

변경 (2 field):
```ts
includes_person: z.enum(["yes", "no"]).default("no"),
twin_intent: z
  .enum(["yagi_twin", "self_owned", "undecided", "no_twin"])
  .optional()
  .default("undecided"),
```

**Mapping rule** (서버측 normalization):
- `includes_person = "no"` → `twin_intent = "no_twin"` 강제 (UI 안 보임)
- `includes_person = "yes"` + `twin_intent = "yagi_twin"` → DB 'yagi_twin' (또는 기존 'specific_in_mind' 매핑 검토)
- `includes_person = "yes"` + `twin_intent = "self_owned"` → DB 'self_owned' (신규)
- `includes_person = "yes"` + `twin_intent = "undecided"` → DB 'undecided'

**DB enum 확장 필요?**:
- 현재 `projects.twin_intent CHECK ('undecided', 'specific_in_mind', 'no_twin')`
- 야기 신규 옵션: `yagi_twin`, `self_owned`, `undecided`, `no_twin`
- → CHECK 확장 migration 필요. 또는 기존 enum 매핑:
  - `yagi_twin` → 기존 `'specific_in_mind'` 활용 (의미 가까움)
  - `self_owned` → **신규 추가 필요** OR `'specific_in_mind'` (자체 인물 = 본인 IP, 의미 비슷)
  - `undecided` → 기존
  - `no_twin` → 기존

**권장**: enum 확장 migration 추가 (의미 명확 분리). Codex K-05 가 검토.

```sql
-- supabase/migrations/<ts>_phase_4_x_widen_twin_intent.sql
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_twin_intent_check;
ALTER TABLE projects ADD CONSTRAINT projects_twin_intent_check CHECK (
  twin_intent IN ('undecided', 'specific_in_mind', 'no_twin', 'yagi_twin', 'self_owned')
);
```

기존 'specific_in_mind' rows 보존 (legacy 데이터).

**Conditional rendering** (wizard.tsx):
- Step 1 radio (`includes_person`) 항상 노출
- Step 2 radio (`twin_intent`) 는 `includes_person === 'yes'` 일 때만 노출 (애니메이션 fade-in 권장)
- `includes_person === 'no'` 시 자동으로 `twin_intent = 'no_twin'` 설정 (form watch)

#### 디자인 — 위치 + 구분선

야기: "살짝 더 아래로 내려서 구분된 느낌"
- 미팅 희망 일자 (meeting_preferred_at) 와 인물 여부 사이에 `<div class="border-t pt-8 mt-8">` 구분
- 또는 `space-y-12` 로 충분 spacing
- 디자인 시스템 v1.0: border-subtle rgba(0,0,0,0.08), padding 32px

#### i18n 키 (NEW, ko + en)

ko.json `projects.wizard.step3` 안에 추가:
```json
"includes_person": {
  "label": "결과물에 인물(아티스트/배우/모델 등)이 포함되나요?",
  "option": {
    "yes": "예 — 인물이 포함됩니다",
    "no": "아니오 — 인물 없는 작업입니다 (제품샷/모션그래픽/풍경 등)"
  }
},
"twin_intent": {
  "label": "Digital Twin 활용 (선택)",
  "tooltip": "Digital Twin은 실제 아티스트의 IP를 기반으로 생성된 AI 자산입니다. 희망 시 광고, 콘텐츠 제작에 활용을 제안드리고 있습니다.",
  "tooltip_aria": "Digital Twin 정보",
  "option": {
    "yagi_twin": "YAGI Twin 활용 (추천)",
    "self_owned": "자체 인물 기반 제작",
    "undecided": "아직 결정 안됨"
  }
}
```

en.json:
- includes_person.label: "Does the deliverable include a person (artist / actor / model)?"
- includes_person.option.yes: "Yes — a person is included"
- includes_person.option.no: "No — no person (product shot / motion graphics / landscape, etc.)"
- twin_intent.label: "Digital Twin (optional)"
- twin_intent.tooltip: "Digital Twin is an AI asset based on a real artist's IP. We may suggest using a Twin for your campaigns and content."
- twin_intent.option.yagi_twin: "Use YAGI Twin (recommended)"
- twin_intent.option.self_owned: "Use my own person/IP"
- twin_intent.option.undecided: "Not decided yet"

#### Codex K-05 LOOP (mandatory — schema 변경 + persistence path)

```bash
codex review supabase/migrations/<ts>_phase_4_x_widen_twin_intent.sql \
  src/app/[locale]/app/projects/new/actions.ts \
  src/app/[locale]/app/projects/new/new-project-wizard.tsx \
  --model gpt-5.5 --reasoning-effort high \
  --focus "twin_intent enum widening additive verify, zod schema sync, includes_person→twin_intent normalization rule, RLS impact, legacy specific_in_mind preservation" \
  --output _amend_c5c_sub03_codex_review_loop1.md
```

#### Files in scope
- `supabase/migrations/<ts>_phase_4_x_widen_twin_intent.sql` (NEW)
- `src/app/[locale]/app/projects/new/actions.ts` (SubmitInputSchema)
- `src/app/[locale]/app/projects/new/new-project-wizard.tsx` (Step 3 conditional rendering)
- `messages/ko.json` + `messages/en.json`
- TypeScript types (Project / ProjectInsert) 갱신 필요 시

#### Acceptance
- /ko/app/projects/new Step 3 — 인물 포함 여부 radio 노출
- "예" 선택 시 → Twin intent radio 자동 노출 (fade-in)
- "아니오" 선택 시 → Twin intent radio 사라짐 + DB persistence = 'no_twin'
- Tooltip 짧게 + 정보 명확
- Submit 정상 (twin_intent enum widening 적용 + 정확한 값 INSERT)
- /en parity

#### Commit (분할)
- `feat(phase-4-x): wave-c5c sub_03a — widen twin_intent enum (yagi_twin / self_owned)`
- `feat(phase-4-x): wave-c5c sub_03b — wizard step3 includes_person + twin_intent conditional UI`
- `chore(phase-4-x): wave-c5c sub_03c — i18n step3 includes_person + twin_intent reworded`

---

### sub_04 — Submit 버튼 워딩 변경 (LOW, i18n only)

ko.json `projects.wizard.actions.submit`:
- 기존: "의뢰 보내기"
- 변경: **"프로젝트 의뢰하기"**

en.json:
- 기존: "Submit"
- 변경: **"Submit project"** 또는 더 자연스럽게 "Send request"

야기 권장 = "Submit project" (의뢰하기 = 정중한 톤, project 강조).

K-05 SKIP. JSON parse + tsc + build 통과.

#### Commit
`fix(phase-4-x): wave-c5c sub_04 — submit button copy refined ("프로젝트 의뢰하기")`

---

### sub_05 — Brand asset sidebar logo (icon + text 가로 배치)

#### 디자인 spec (일반 service 관행 — Linear / Notion / Slack / Vercel)

- **Layout**: Flexbox horizontal (icon + text)
- **Icon**: 24×24 또는 28×28px. 야기 결정 = **28×28** (sidebar header 가독성 더 좋음)
- **Text logo**: height 18-20px (icon 보다 약간 작게). 야기 결정 = **height 18px**
- **Gap**: icon ↔ text = **10px**
- **Padding**: sidebar header padding 16-20px
- **Vertical alignment**: items-center

#### 작업

**Step 1 — Asset 이동**

```powershell
# next/image 가 자동 최적화하려면 public/ 안 위치
mkdir public\brand
cp Assets\yagi-icon-logo-black.png public\brand\
cp Assets\yagi-text-logo-black.png public\brand\
```

또는 Builder 가 git mv (history 보존). 권장 = `git mv Assets/yagi-*-logo-black.png public/brand/`.

**Step 2 — Sidebar header 컴포넌트 갱신**

`src/components/app/sidebar.tsx` (또는 정확한 위치 식별) 의 header 영역:

```tsx
import Image from 'next/image';
import iconLogo from '/public/brand/yagi-icon-logo-black.png';
import textLogo from '/public/brand/yagi-text-logo-black.png';

<div className="flex items-center gap-2.5 px-5 py-4">
  <Image
    src={iconLogo}
    alt="YAGI"
    width={28}
    height={28}
    priority
    className="flex-shrink-0"
  />
  <Image
    src={textLogo}
    alt="YAGI WORKSHOP"
    width={120}  // 또는 자동 — height 만 강제
    height={18}
    priority
    className="h-[18px] w-auto"
  />
</div>
```

기존 텍스트 logo (`YAGI WORKSHOP / AI NATIVE ENTERTAINMENT STUDIO`) 제거.

**Step 3 — Asset path import 검증**

Next.js 의 static asset import 가 정상 동작 확인. 만약 `next.config.ts` 가 image domains 제한 있으면 추가 필요 (public/ 안 file 은 보통 자동 OK).

**Step 4 — Light mode contrast verify**

Light bg (#FAFAFA) 위에 black logo 잘 보이는지 시각 확인. 만약 contrast 약하면 light variant 또는 wrapper background 추가 — 단 PNG file 이 *black* 로 명시 → light mode 위 정상.

#### Files in scope
- `public/brand/yagi-icon-logo-black.png` (이동)
- `public/brand/yagi-text-logo-black.png` (이동)
- `src/components/app/sidebar.tsx` (또는 sidebar header 정확한 위치)
- 기존 logo 컴포넌트 (있으면 deprecated 처리 또는 제거)

#### Acceptance
- /ko/app/dashboard sidebar 좌상단 — icon (28×28) + text logo (height 18) 가로 배치
- gap 10px, padding 정확
- 기존 텍스트 logo 0
- 모든 page sidebar 일관 적용

#### Commit
`feat(phase-4-x): wave-c5c sub_05 — sidebar brand logo (icon + text horizontal layout)`

---

### sub_06 — Brand asset talk FAB (right-bottom 56×56)

#### 디자인 spec (일반 service 관행 — Intercom / Crisp / ChannelTalk)

- **Size**: 56×56px (Material Design 표준 FAB)
- **Position**: fixed bottom-right
- **Padding from edge**: 24px (mobile: 16px)
- **z-index**: 50-60 (sidebar 위, modal 아래)
- **Background**: 야기 design 시스템 v1.0 — bg.ink.primary `#0A0A0A` 또는 sage `#71D083` (액센트). **권장 = 무채색 (ink.primary)** — 채팅 위젯은 차분한 색이 표준
- **Hover**: 미세 lift (translate-y -2px) + opacity 변화
- **Click**: 기존 support panel 토글 (Wave 2.x 의 `<SupportFAB>` + `<SupportPanel>` 재사용)
- **Icon 안**: yagi-talk-icon.png (40×40, FAB 안쪽 padding 8px)

#### 작업

**Step 1 — Asset 이동**

```powershell
cp Assets\yagi-talk-icon.png public\brand\
```

PNG 540KB — next/image 자동 최적화 (WebP 변환 + lazy loading) 의존. 후속 SVG 변환은 야기 backlog.

**Step 2 — 기존 support FAB 식별**

`src/components/support/` 디렉토리 grep — `<SupportFAB>` 또는 유사. 기존 컴포넌트 위치 확인 후:
- (a) 기존 컴포넌트의 icon 만 yagi-talk-icon.png 로 교체
- (b) 기존 컴포넌트 props 갱신 (size 56, position bottom-right 24px)

기존 spec 이 다른 size 면 Builder 가 결정 — **변경 후 visual consistency 우선**.

**Step 3 — FAB 컴포넌트 갱신**

```tsx
import Image from 'next/image';
import talkIcon from '/public/brand/yagi-talk-icon.png';

<button
  type="button"
  onClick={openSupportPanel}
  aria-label="야기 팀에 문의하기"
  className={cn(
    "fixed bottom-6 right-6 z-50",
    "w-14 h-14 rounded-full",
    "bg-ink-primary text-bg-base",
    "flex items-center justify-center",
    "shadow-lg hover:shadow-xl",
    "transition-all duration-200",
    "hover:-translate-y-0.5"
  )}
>
  <Image
    src={talkIcon}
    alt=""
    width={40}
    height={40}
    className="opacity-90"
  />
</button>
```

또는 기존 SupportFAB 의 Image src 만 swap — Builder 가 기존 코드 보고 결정.

**Step 4 — Mobile responsive**

`bottom-4 right-4` (16px) on mobile, `bottom-6 right-6` (24px) on desktop. Tailwind: `bottom-4 right-4 md:bottom-6 md:right-6`.

#### Files in scope
- `public/brand/yagi-talk-icon.png` (이동)
- `src/components/support/SupportFAB.tsx` (또는 정확한 위치 — Builder 가 grep)
- 필요 시 `src/components/support/SupportPanel.tsx` (재사용 verify)

#### Acceptance
- 모든 /app/* page 우하단에 talk FAB 56×56 표시
- light bg 위 contrast 정상 (black FAB + sage hover 또는 기존 디자인 일관)
- 클릭 시 기존 support panel 토글 정상
- mobile responsive
- icon 안쪽 padding 적정 (40×40 inside 56×56)

#### Commit
`feat(phase-4-x): wave-c5c sub_06 — talk FAB right-bottom (56x56, reuses support panel)`

---

### Final — 통합 verify + STOP

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

3개 모두 exit 0.

`_wave_c5c_result.md` 작성 — 6 sub-task 결과:
- PKCE flow + Codex K-05 LOOP 결과
- 다시 보내기 wiring fix
- Twin intent UX 재설계 + enum widening + Codex K-05
- Submit 버튼 워딩
- Brand sidebar logo
- Brand talk FAB
- Wave A task_01 migration prod 적용 (chat 처리, baseline noted)

`_followups.md` UPDATE:
- FU-C5c-01: Supabase Dashboard redirect URL allowlist 수동 추가 (PKCE)
- FU-C5c-02: yagi-talk-icon.png + yagi-text-logo-black.png SVG 변환 (Phase 5+ asset optimization)
- FU-C5c-03: yagi_admin workspace (320c1564) 의 *별도 RLS surface* (Phase 5+ Artist 작업과 함께)

`_run.log`:
```
<ISO> phase-4-x WAVE_C5C SHIPPED sub_count=6 codex_k05_loops=<n> sha=<latest> tsc=ok lint=baseline build=ok
<ISO> phase-4-x WAVE_C5C_END_BEFORE_WAVE_D sha=<latest> awaiting_yagi_visual_review=true
<ISO> NOTE: Wave A task_01 migration prod-applied via chat MCP at 2026-05-01 (pre-condition for c5c). Wave D D.1 step now superseded.
```

**STOP** — Wave D 진입 X. 야기 visual re-review 후 결정.

---

## 사고 처리

- **MAJOR** (Codex K-05 LOOP 3 후 HIGH-A residual + 야기 confirm) → 그 sub STOP, 다음 진입 X
- **MINOR** → 진행 + `_hold/issues_c5c.md`
- sub_03 의 enum widening 가 *기존 'specific_in_mind' rows* 깨면 → 즉시 chat 보고 (data integrity)
- sub_05/06 의 PNG asset import path 가 Next.js 환경에서 실패 시 (TypeScript 또는 webpack) → svgr-loader 또는 다른 방식 권장 (Builder 결정)

## 제약 (CRITICAL)

- **L-027 BROWSER_REQUIRED gate** — main push 절대 X
- main 에 ff-merge 절대 X. g-b-9-phase-4 에만 commit
- spawn 사용 X
- migration 적용 전 Codex K-05 LOOP 0 HIGH-A 필수 (sub_01 PKCE + sub_03 enum widen)
- L-001 PowerShell `&&` 금지

## Output expectations

`.yagi-autobuild\phase-4-x\` 안에:
- `_amend_c5c_sub01_codex_review_loop{1,2,3}.md`
- `_amend_c5c_sub03_codex_review_loop{1,2,3}.md`
- `_wave_c5c_result.md`
- `_followups.md` (UPDATE — FU-C5c-01/02/03)
- `_run.log` 추가 라인

## 시작

sub_01 부터 즉시. K-05 LOOP 1 결과 chat 보고. 의문점 즉시 chat 보고.

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆
