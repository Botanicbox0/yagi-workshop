# Phase 4.x — Wave C.5c v2 Prompt (sub_03 Twin UX 폐기, 5 sub-task)

> Wave A task_01 migration 이미 prod 적용됨.
> 야기 결정: Twin intent UX 재설계 = Phase 5 Briefing Canvas 로 deferred (wizard 자체 재설계 예정).
> sub_01 (PKCE) + sub_02 (resend) + sub_04 (submit copy) + sub_05 (sidebar logo) + sub_06 (talk FAB) 만 진행.
> 5 sub-task sequential. 끝나면 STOP — Wave D ff-merge 직행.

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

**WAVE C.5c v2 — PKCE flow + auth fixes + brand assets. Twin UX 재설계 = Phase 5 deferred. lead Builder 직접 작업 (no spawn). 끝나면 STOP.**

야기 major 결정 (chat 2026-05-02):
- 프로젝트 제출 방식 = wizard form-only paradigm → Phase 5 에서 "Briefing Canvas" (multi-stage briefing-as-conversation) 로 재설계
- C.5c 의 sub_03 (Twin intent UX 재설계) **폐기** — wizard 자체가 곧 재설계되므로 polish 무의미
- C.5c 는 **PKCE / auth / brand asset / submit copy** 만 처리 → Wave D ff-merge → Phase 5 KICKOFF
- Phase 5 swap: 기존 Artist Roster → **Briefing Canvas (의뢰자 협업)** 우선. Artist Roster 는 Phase 6 entry.

## Pre-condition (chat 처리 완료)

- ✅ Wave A task_01 migration prod apply (chat MCP, 2026-05-01)
- ✅ workspaces.kind / projects.twin_intent / projects.kind / project_licenses 모두 존재
- ✅ submit broken root cause = missing twin_intent column → 자동 해결됨
- ✅ YAGI Internal workspace (320c1564-...) → kind='yagi_admin' reclassify 완료

## 야기 결정 (chat lock)

1. PKCE flow 전환 — Gmail crawler 회피
2. 다시 보내기 wiring fix — auth/expired
3. ~~Twin intent UX 재설계~~ — **폐기, Phase 5 Briefing Canvas 로 이전**
4. Submit 버튼 워딩 — "의뢰 보내기" → "프로젝트 의뢰하기" / "Submit project"
5. Sidebar brand logo — icon 28×28 + text height 18, gap 10, 가로 배치
6. Talk FAB right-bottom — 56×56, bg ink-primary, 기존 support panel 재사용

## Codex 5.5 K-05 protocol

- Model = `gpt-5.5`, reasoning effort = `"high"`
- Builder 별도 terminal `codex review`
- LOOP 1 → 2 → 3
- mandatory: sub_01 (PKCE auth security)
- recommended: sub_02 (server action 변경 시)
- skip: sub_04/05/06

## 우선 read

1. `.yagi-autobuild\phase-4-x\_wave_c5b_amendments_v2_result.md` (baseline HEAD 85af274)
2. Supabase PKCE docs: https://supabase.com/docs/guides/auth/sessions/pkce-flow
3. `C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md`
4. `src/lib/supabase/server.ts` + `client.ts`
5. `src/app/[locale]/(auth)/callback/route.ts`
6. `src/app/[locale]/auth/expired/page.tsx`
7. `messages/ko.json` + `en.json` (`projects.wizard.actions.submit`)
8. `src/components/app/sidebar.tsx` (sidebar header)
9. `src/components/support/` (기존 SupportFAB 식별)
10. `Assets/yagi-icon-logo-black.png` (28×28 권장)
11. `Assets/yagi-text-logo-black.png` (height 18 권장)
12. `Assets/yagi-talk-icon.png` (56×56 권장)

## 5 sub-task sequential

각 끝마다 commit. K-05 mandatory sub 는 LOOP 0 HIGH-A 후 진행.

---

### sub_01 — PKCE flow 전환 (🔴 prod blocker, K-05 mandatory)

#### 현상
- Gmail / Outlook / 회사메일 의 link preview crawler 가 자동 GET → Supabase OTP single-use consume
- 사용자 본인 클릭 시 expired error
- 야기 확인: dana.clara0830@gmail.com (14:27:22 가입) → email_confirmed_at = 14:27:50 (28초 후 자동 confirm by bot)
- 모든 Gmail 가입자 영향 = production blocker

#### 해결 — PKCE flow

Email link 클릭 → intermediate `/auth/confirm?token_hash=...&type=signup` page → 사용자가 *그 page 에서 Continue 누를 때* OTP consume. Crawler 영향 0.

#### 작업

**Step 1 — Supabase 클라이언트 flowType 변경**

`src/lib/supabase/server.ts` + `client.ts`:
```ts
import { createServerClient } from '@supabase/ssr';

export async function createSupabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: 'pkce' },
      cookies: { /* ... */ },
    }
  );
}
```

**Step 2 — `/auth/confirm` route 신규**

`src/app/[locale]/auth/confirm/route.ts`:
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
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.redirect(new URL('/auth/expired', request.url));
  }

  return NextResponse.redirect(new URL('/signin', request.url));
}
```

**Step 3 — 기존 `/(auth)/callback/route.ts` 처리**

기존 callback (?code= OAuth code grant) 와 PKCE (token_hash) 둘 다 살리거나 통합 — Builder 검토 후 결정.

**Step 4 — Supabase Dashboard redirect URL allowlist `_followups.md` 등록**

야기가 manual 추가:
- localhost:3003/auth/confirm
- localhost:3003/[locale]/auth/confirm
- studio.yagiworkshop.xyz/auth/confirm
- studio.yagiworkshop.xyz/[locale]/auth/confirm

**Step 5 — signup 의 emailRedirectTo**

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding/workspace`,
  }
});
```

**Step 6 — open-redirect 방지**

`next` param allowlist (예: `/onboarding/workspace`, `/app/dashboard`, `/app/projects`). 외부 URL 또는 unknown path → fallback `/onboarding/workspace`.

#### Codex K-05 LOOP

```bash
codex review src/lib/supabase/server.ts src/lib/supabase/client.ts \
  src/app/[locale]/auth/confirm/route.ts \
  src/app/[locale]/(auth)/callback/route.ts \
  --model gpt-5.5 --reasoning-effort high \
  --focus "PKCE security, token_hash validation, session cookie set, open-redirect via next param, race condition, RLS impact" \
  --output _amend_c5c_sub01_codex_review_loop1.md
```

Focus areas:
1. PKCE 표준 준수 — token_hash + type 외 추가 verify?
2. `next` query param open-redirect vector? (allowlist enforce)
3. SSR cookie set 정확히 동작?
4. 기존 callback 과 충돌? (OAuth code vs PKCE token_hash)
5. `verifyOtp` error 종류 (expired/invalid/consumed) 분기 처리?
6. Crawler GET 시 intermediate page 가 *static HTML* 라 OTP consume 안 됨 verify
7. PKCE code_verifier SSR 환경에서 cookie/session 정확히 저장?

LOOP 2 → 3 same protocol.

#### Acceptance
- 신규 user 가입 → email link 클릭 → /auth/confirm → session set → /onboarding/workspace
- Gmail crawler 의 link preview GET 시 OTP 미consume
- 만료 link → /auth/expired
- 정상 sign-in flow 무영향

#### Commit
`feat(phase-4-x): wave-c5c sub_01 — PKCE flow + /auth/confirm intermediate page (Gmail crawler bypass)`

---

### sub_02 — 다시 보내기 wiring fix (HIGH)

#### 현상
- /auth/expired page "이메일 다시 보내기" → toast "새 인증 링크를 보냈습니다" 표시
- 실제 이메일 안 옴
- 가능성: silent fail 또는 Supabase rate limit (1분 cooldown)

#### 작업

1. /auth/expired page resend handler 식별
2. `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })` 호출 verify
3. error 응답 처리:
   - rate limit (429) → "잠시 후 다시 시도해 주세요" + cooldown countdown
   - invalid email → "이메일을 확인해 주세요"
   - 정상 → "새 인증 링크를 보냈습니다. 메일함을 확인해 주세요."
4. PKCE 도입으로 emailRedirectTo `/auth/confirm` 갱신
5. 60초 cooldown — button disabled + countdown UI

#### Files in scope
- `src/app/[locale]/auth/expired/page.tsx`
- 또는 expired-form 컴포넌트
- 필요 시 server action wrapping resend

#### Codex K-05
- 권장 (server action 추가 시), skip (client-side resend only)

#### Acceptance
- /auth/expired → 이메일 입력 → resend → 정상 도착
- 60초 내 재시도 시 cooldown UI 명확
- error case 별 다른 toast

#### Commit
`fix(phase-4-x): wave-c5c sub_02 — auth/expired resend wiring + rate-limit cooldown UI`

---

### sub_03 — Submit 버튼 워딩 변경 (LOW, i18n only)

(기존 sub_04 → sub_03 으로 번호 변경)

ko.json `projects.wizard.actions.submit`:
- 기존: "의뢰 보내기"
- 변경: **"프로젝트 의뢰하기"**

en.json:
- 변경: **"Submit project"**

K-05 SKIP. JSON parse + tsc + build 통과.

#### Commit
`fix(phase-4-x): wave-c5c sub_03 — submit button copy refined (프로젝트 의뢰하기 / Submit project)`

---

### sub_04 — Sidebar brand logo (icon + text 가로 배치)

(기존 sub_05 → sub_04)

#### 디자인 spec (Linear / Notion / Slack 표준)

- Layout: Flexbox horizontal
- Icon: **28×28** (sidebar header 가독성)
- Text logo: **height 18px** (icon 보다 약간 작게)
- Gap: **10px**
- Padding: sidebar header padding 16-20px
- Vertical alignment: items-center

#### 작업

**Step 1 — Asset 이동**:
```powershell
git mv Assets\yagi-icon-logo-black.png public\brand\
git mv Assets\yagi-text-logo-black.png public\brand\
```

**Step 2 — Sidebar header 갱신** (`src/components/app/sidebar.tsx`):
```tsx
import Image from 'next/image';
import iconLogo from '/public/brand/yagi-icon-logo-black.png';
import textLogo from '/public/brand/yagi-text-logo-black.png';

<div className="flex items-center gap-2.5 px-5 py-4">
  <Image src={iconLogo} alt="YAGI" width={28} height={28} priority className="flex-shrink-0" />
  <Image src={textLogo} alt="YAGI WORKSHOP" width={120} height={18} priority className="h-[18px] w-auto" />
</div>
```

기존 텍스트 logo (`YAGI WORKSHOP / AI NATIVE ENTERTAINMENT STUDIO`) 제거.

**Step 3 — Light mode contrast verify**: light bg (#FAFAFA) 위 black logo 정상 보임 확인.

#### Files in scope
- `public/brand/yagi-icon-logo-black.png` (이동)
- `public/brand/yagi-text-logo-black.png` (이동)
- `src/components/app/sidebar.tsx` (정확한 위치 grep)
- 기존 logo 컴포넌트 deprecated/제거

#### Acceptance
- /ko/app/dashboard sidebar 좌상단 — icon (28×28) + text logo (height 18) 가로 배치, gap 10
- 기존 텍스트 logo 0
- 모든 page sidebar 일관

#### Commit
`feat(phase-4-x): wave-c5c sub_04 — sidebar brand logo (icon + text horizontal layout)`

---

### sub_05 — Talk FAB right-bottom (56×56)

(기존 sub_06 → sub_05)

#### 디자인 spec (Material / Intercom / ChannelTalk 표준)

- Size: 56×56
- Position: fixed bottom-right
- Padding from edge: 24px (mobile 16px)
- z-index: 50-60
- Background: bg.ink.primary `#0A0A0A`
- Hover: lift -2px + opacity 변화
- Click: 기존 support panel 토글 (재사용)
- Icon 안: yagi-talk-icon.png (40×40, FAB 안쪽 padding 8px)

#### 작업

**Step 1 — Asset 이동**:
```powershell
git mv Assets\yagi-talk-icon.png public\brand\
```
(540KB PNG — next/image 자동 WebP 변환 의존)

**Step 2 — 기존 support FAB 식별**:
`src/components/support/` grep — `<SupportFAB>` 또는 유사. 기존 컴포넌트 위치 확인 후 icon swap 또는 props 갱신.

**Step 3 — FAB 컴포넌트**:
```tsx
import Image from 'next/image';
import talkIcon from '/public/brand/yagi-talk-icon.png';

<button
  type="button"
  onClick={openSupportPanel}
  aria-label="야기 팀에 문의하기"
  className={cn(
    "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50",
    "w-14 h-14 rounded-full",
    "bg-ink-primary text-bg-base",
    "flex items-center justify-center",
    "shadow-lg hover:shadow-xl",
    "transition-all duration-200",
    "hover:-translate-y-0.5"
  )}
>
  <Image src={talkIcon} alt="" width={40} height={40} className="opacity-90" />
</button>
```

#### Files in scope
- `public/brand/yagi-talk-icon.png` (이동)
- `src/components/support/SupportFAB.tsx` (Builder grep)
- `src/components/support/SupportPanel.tsx` (재사용 verify)

#### Acceptance
- 모든 /app/* page 우하단 talk FAB 56×56
- light bg 위 contrast 정상
- 클릭 → 기존 support panel 토글
- mobile responsive
- icon 안쪽 padding 적정

#### Commit
`feat(phase-4-x): wave-c5c sub_05 — talk FAB right-bottom (56x56, reuses support panel)`

---

### Final — 통합 verify + STOP

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

3개 모두 exit 0.

`_wave_c5c_v2_result.md` 작성:
- 5 sub-task 결과
- PKCE Codex K-05 LOOP
- Wave A task_01 prod-applied baseline 명시
- Twin UX 재설계 = Phase 5 Briefing Canvas deferred (sub_03 폐기) 명시

`_followups.md` UPDATE:
- FU-C5c-01: Supabase Dashboard redirect URL allowlist 수동 추가 (PKCE)
- FU-C5c-02: yagi-talk-icon.png + yagi-text-logo-black.png SVG 변환 (Phase 6+)
- FU-C5c-03: yagi_admin workspace (320c1564) 별도 RLS surface (Phase 5+ Artist 작업)
- FU-C5c-04: **Phase 5 Briefing Canvas (briefing-as-conversation paradigm)** — wizard form 폐기, multi-stage briefing workspace 도입. 야기 chat 협업으로 KICKOFF spec 작성 중

`_run.log`:
```
<ISO> phase-4-x WAVE_C5C_V2 SHIPPED sub_count=5 codex_k05_loops=<n> sha=<latest> tsc=ok lint=baseline build=ok
<ISO> phase-4-x WAVE_C5C_V2_END_BEFORE_WAVE_D sha=<latest> awaiting_yagi_visual_review=true
<ISO> NOTE: Wave A task_01 migration prod-applied via chat MCP at 2026-05-01. Wave D D.1 step now superseded.
<ISO> NOTE: sub_03 (Twin UX redesign) DEFERRED to Phase 5 Briefing Canvas. wizard form 폐기 예정.
```

**STOP** — Wave D 진입 X. 야기 visual review 후 Wave D ff-merge 진입 결정.

---

## 사고 처리

- MAJOR (Codex K-05 LOOP 3 후 HIGH-A residual + 야기 confirm) → 그 sub STOP
- MINOR → 진행 + `_hold/issues_c5c.md`
- sub_04/05 의 PNG asset import path 가 Next.js 환경 실패 시 (TypeScript 또는 webpack) → svgr-loader 또는 다른 방식 (Builder 결정)

## 제약 (CRITICAL)

- L-027 BROWSER_REQUIRED gate — main push 절대 X
- main 에 ff-merge 절대 X. g-b-9-phase-4 에만 commit
- spawn 사용 X
- migration 적용 전 Codex K-05 LOOP 0 HIGH-A 필수 (sub_01 PKCE)
- L-001 PowerShell `&&` 금지

## Output expectations

`.yagi-autobuild\phase-4-x\` 안에:
- `_amend_c5c_sub01_codex_review_loop{1,2,3}.md`
- `_wave_c5c_v2_result.md`
- `_followups.md` (UPDATE — FU-C5c-01/02/03/04)
- `_run.log` 추가 라인

## 시작

sub_01 부터 즉시. K-05 LOOP 1 결과 chat 보고.

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆
