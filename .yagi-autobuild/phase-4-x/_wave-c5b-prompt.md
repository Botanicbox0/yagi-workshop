# Phase 4.x — Wave C.5b Prompt v2 (Dark mode foundation + Persona A + Auth fixes + Artist account)

> 야기 결정 5 항목 + 시각 review 새 issue 정리해서 15 sub-task 처리.
> **sub_00 신규 = root layout dark mode 전환 (가장 큰 변경, 모든 page 영향)**.
> Wave D 진입 전. lead Builder 직접 작업 (no spawn).
> 끝나면 STOP — 야기가 *모든 page* 다시 시각 review 후 Wave D 진입 결정.

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

**WAVE C.5b — Dark mode foundation + Persona A + Auth flow fixes + Artist account. lead Builder 직접 작업 (no spawn). 끝나면 STOP.**

야기 시각 review 결과 *fundamental* gap 발견: **모든 page 가 light mode** 인데 design system v1.0 = "editorial dark + sage". `globals.css` 의 `:root` 가 Phase 2.7.1 잔재 light token 으로 깔려있고 `.dark` 도 v1.0 spec 과 다름. + persona drift + auth bug + 추가 visual fix = 15 sub-task.

## 야기 결정 (chat lock, 2026-05-01)

- **Q1 (persona)**: A — PRODUCT-MASTER 보전, 의뢰인 (Brand) only. 크리에이터 흐름 폐기.
- **Q2 (scope)**: ① — Wave C.5b 통합 ship (g-b-9-phase-4 안).
- **Q3 (handle)**: (b) — profiles.handle 컬럼 살림, UI 노출 0.
- **Q4 (post-signup)**: (b) — 회사명 1-step 폼 (이미 구현됨, 워딩만 조정).
- **Empty state "+50개"**: (a) — placeholder 그대로 살림 (야기가 Phase 7+ 에 진짜 로고로 교체 예정). design system token 으로 다듬기만.
- **Design mode (NEW)**: **X** — 전체 dark editorial. design system v1.0 (`C:\Users\yout4\.claude\skills\yagi-design-system`) 100% 따름.

## 우선 read

1. `.yagi-autobuild\phase-4-x\KICKOFF.md`
2. `.yagi-autobuild\phase-4-x\_decisions_locked.md`
3. `.yagi-autobuild\phase-4-x\_wave_c5a_result.md` (baseline = sha=83e9a39)
4. `.yagi-autobuild\PRODUCT-MASTER.md` §0/§3/§4/§5
5. `C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md` ⬅ 이게 source of truth
6. `C:\Users\yout4\.claude\skills\yagi-design-system\references\tokens.json`
7. `C:\Users\yout4\.claude\skills\yagi-design-system\references\globals.css` ⬅ ENTRY for sub_00
8. `C:\Users\yout4\.claude\skills\yagi-design-system\references\tailwind.preset.cjs`
9. `C:\Users\yout4\.claude\skills\yagi-design-system\references\DESIGN-flora.md`
10. 현재 repo 의 `src/app/globals.css` (Phase 2.7.1 잔재, sub_00 에서 교체 대상)

## 작업 sequence (15 sub-task sequential)

각 sub-task 끝마다 commit. lint baseline 유지. tsc 빠른 verify 권장.

---

### sub_00 — Root layout dark mode foundation (CRITICAL, 가장 큰 변경)

#### 현상
- `src/app/globals.css` 의 `:root` = Phase 2.7.1 P12 light token (off-white background `0 0% 98%`)
- `.dark` 정의되어 있으나 *opt-in*, 어디서도 활성화 X
- design system v1.0 = "editorial dark + sage #71D083 단일 액센트" 명시
- 결과: 모든 page light mode → v1.0 적용 0%
- Wave A/B/C/C.5a 의 모든 surface 가 light 위에 만들어짐

#### 작업

**1) globals.css 전면 교체** — yagi-design-system skill 의 reference globals.css 기준으로 재작성.

작업 sequence:
1. `C:\Users\yout4\.claude\skills\yagi-design-system\references\globals.css` 정독
2. 현재 repo 의 `src/app/globals.css` 의 light token (`:root`) 을 dark editorial token 으로 교체:
   - `--background: 0 0% 0%` (bg.base = #000000)
   - `--foreground: 0 0% 93%` (ink.primary = #EEEEEE)
   - `--card: 0 0% 100%` 의 알파 0.10 (bg.card = rgba(255,255,255,0.10))
   - `--card-foreground: 0 0% 93%`
   - `--popover: 0 0% 10%` (bg.raised = rgba(25,25,25,0.9))
   - `--popover-foreground: 0 0% 93%`
   - `--primary: 0 0% 93%` (CTA bg)
   - `--primary-foreground: 0 0% 0%` (CTA text)
   - `--secondary: 0 0% 100%` 의 알파 0.05 (bg.card-deep)
   - `--secondary-foreground: 0 0% 70%` (ink.secondary = #B4B4B4)
   - `--muted: 0 0% 100%` 알파 0.05
   - `--muted-foreground: 0 0% 48%` (ink.tertiary = #7B7B7B)
   - `--accent: 132 53% 63%` (sage #71D083 — HSL 변환)
   - `--accent-foreground: 0 0% 0%`
   - `--destructive: 0 65% 55%`
   - `--destructive-foreground: 0 0% 98%`
   - `--border: 0 0% 100% / 0.11` (border.subtle 형식 — Tailwind 호환 위해 별도 색 + opacity utility 사용 가능)
   - `--input: 0 0% 100% / 0.11`
   - `--ring: 132 53% 63%` (sage focus ring)
   - `--radius: 1.5rem` (24px = card radius)
3. status semantic token (`--success` / `--warning` / `--info`) — dark 톤으로 변경 (이미 .dark 에 있는 값 재사용)
4. `.dark` selector 도 같은 값으로 통일 (또는 `.dark` 자체 제거, default 가 dark)
5. light mode 가 *완전히 제거되지는 않게* — `.light` class 로 future-proof (admin 또는 special context 가 light 필요 시 opt-in 가능)
6. `body` 의 `font-family` 그대로 유지 (Pretendard Variable 우선)
7. `font-display` 도 v1.0 의 Redaction (display-en) 또는 Pretendard fallback 으로 정렬

**2) tailwind.config 또는 tailwind.preset 갱신** — yagi-design-system skill 의 `tailwind.preset.cjs` 정독 후 prepend 또는 merge
- 현재 repo 의 tailwind config 가 yagi preset 을 import 하는지 확인
- 안 하면 import 추가
- 색 utility 가 design system token 과 1:1 매핑되도록 (예: `bg-sage`, `text-sage`, `border-subtle`, `text-ink-primary`, `text-ink-secondary`, `text-ink-tertiary`)

**3) 신규 utility class 추가**
- `.bg-base` `.bg-raised` `.bg-card` `.bg-card-deep`
- `.ink-primary` `.ink-secondary` `.ink-tertiary` `.ink-disabled` `.ink-muted`
- `.border-subtle` `.border-soft`
- `.accent-sage` `.bg-sage` `.bg-sage-soft`
- `.font-mono-ko` (Mona12 fallback chain)
- `.lh-display-ko` `.lh-display-en` `.lh-heading` `.lh-body` `.lh-tight`

**4) Sidebar 작업 — 야기 client review 5번 issue (sub_04 of C.5a) 후속**
- Sidebar bg 가 light → dark 전환 시 깨질 가능성 — sub_00 마지막에 sidebar 시각 verify

**5) Visual sanity test (Builder 가 head-less browser 또는 manual log 작성)**
- `pnpm dev` 시작 (또는 가정) → 야기 시각 review 시 어디 page 가 dark editorial 적용되는지 list 작성
- `_sub00_visual_audit.md` 작성

#### Files in scope
- `src/app/globals.css` (대규모 rewrite)
- `tailwind.config.ts` 또는 `tailwind.config.js` (preset import 또는 token merge)
- 필요 시 `src/app/layout.tsx` (root html 의 className 에 `dark` 추가 — 만약 default class 방식으로 가는 경우)
- 또는 `:root` 자체를 dark 로 전환 (class 없이)

#### Acceptance
- /ko/app/dashboard 접속 → bg.base #000000 (검은 배경) 확인
- /ko/onboarding/workspace 접속 → 같은 dark editorial
- /ko/auth/verify (이메일 확인 page) → 같은 dark
- /ko/signin → 같은 dark
- /ko/app/projects/* → 같은 dark
- /ko/app/projects/[id] → 같은 dark
- /ko/app/settings → 같은 dark
- /ko/app/meetings → 같은 dark
- Sage #71D083 액센트 정상 (CTA / 검토 중 status pill)
- 무채색 ink primary/secondary/tertiary 정상
- /en parity (모든 page 의 dark mode 동일)
- 텍스트 contrast 무손상 (WCAG AA 최소)

#### Risk

이게 적용되면 Wave A/B/C/C.5a 의 모든 component 가 dark mode 위에서 *시각 검증 안 된 상태*. Builder 가 *추측* 으로 색 매핑한 부분 (예: hard-coded `text-black` 또는 `bg-white`) 이 broken visual 야기 가능. 그 경우:
- `_sub00_breakage_log.md` 작성 (모든 broken visual 기록)
- 사고 처리 = MAJOR (sub-task 폐기 X, 진행하되 log 누적)
- 야기 시각 review 시 Wave C.5c 에서 일괄 fix

#### Commit
`feat(phase-4-x): wave-c5b sub_00 — root layout dark mode foundation (design system v1.0 globals.css)`

---

### sub_01 — Role selection page 폐기 + signup → /onboarding/workspace 직접 redirect

(이전과 동일)

#### 현상
- Image 4: `/role` 에서 "크리에이터/스튜디오" + "의뢰인" 2 카드 노출
- PRODUCT-MASTER §4 = Brand + Artist + YAGI Admin 의 3-persona model
- "크리에이터/스튜디오" = Phase 2.x 잔재. Artist Roster 영입은 *야기 직접* (Phase 5+).

#### 작업
1. Role selection page 위치 식별
2. 이메일 confirm callback (Supabase Auth) 의 redirect 처리: confirm → `/onboarding/workspace` 직접
3. Role selection page route 자체 **삭제**
4. Signup form 후 자동 sign-in 시 navigate target 도 `/onboarding/workspace`
5. 이미 가입한 user 가 `/role` 직접 접근 시 → `/app/dashboard` 또는 `/onboarding/workspace`
6. `_followups.md` 에 기록: "Phase 5 entry 시 Artist Roster 영입 surface 새 설계"

#### Files in scope
- `src/app/[locale]/role/page.tsx` (위치 식별 후 DELETE)
- `src/app/[locale]/(auth)/signup/page.tsx` 또는 `signup/actions.ts`
- `src/app/[locale]/(auth)/callback/route.ts`
- `src/middleware.ts` (필요 시)
- `messages/ko.json` + `en.json` (sub_09 일괄)

#### Acceptance
- `/ko/role` 또는 `/en/role` 접근 → 404 또는 redirect
- 이메일 confirm 클릭 → 바로 `/onboarding/workspace`
- Signup form 제출 → 자동 sign-in → `/onboarding/workspace`

#### Commit
`refactor(phase-4-x): wave-c5b sub_01 — drop role selection page, post-signup → /onboarding/workspace direct`

---

### sub_02 — `/u/handle` 또는 크리에이터 프로필 폼 폐기 + Image 6 runtime error 자동 fix

#### 작업
1. `/app/[locale]/u/` 디렉토리 전체 삭제
2. 폼 컴포넌트 삭제
3. 사용처 grep — link 있으면 제거
4. Verify: `/ko/u/handle` → 404
5. Server actions 삭제 또는 archive

#### Acceptance
- `/ko/u/handle` 또는 `/ko/u/handle/setup` → 404
- runtime error "Missing <html>/<body>" 재현 안 됨
- 깨진 link 0

#### Commit
`refactor(phase-4-x): wave-c5b sub_02 — drop creator handle setup flow + auto-fix Missing html/body runtime error`

---

### sub_03 — `/onboarding/workspace` 워딩 조정 + URL slug auto-generation

#### 야기 spec (i18n 변경)

| 위치 | 현재 | 변경 |
|---|---|---|
| H1 | "워크스페이스를 만들어 주세요" | "워크스페이스 만들기" |
| Subtitle | "회사 단위로 팀을 초대하고 프로젝트를 관리합니다" | "프로젝트를 함께 관리할 팀 공간을 설정합니다." |
| Field 1 label | "워크스페이스 이름" | (그대로) |
| Field 2 label | "URL" | "워크스페이스 주소" |
| URL placeholder | (현재) | "your-workspace" |
| Submit | "계속" | (그대로) |

EN:
- H1: "Create your workspace"
- Subtitle: "Set up a shared space to manage projects with your team."
- Field 2 label: "Workspace address"

#### URL slug auto-generation
- 이름 input → URL field 자동 derive (kebab-case, lowercase)
- URL field 수정 가능 유지
- 한글 이름 → 경고 + 사용자 직접 입력 유도
- Slug 충돌 검사 (workspaces.url_slug unique 가정)
- Validation: 알파벳/숫자/하이픈만, 빈 값 X

#### Acceptance
- 워딩 변경 정확
- Slug 자동 동기화 + slug-safe validation
- /en parity
- **dark mode 위에서 정상 렌더 (sub_00 효과)**

#### Commit
`fix(phase-4-x): wave-c5b sub_03 — onboarding/workspace copy refined + URL slug auto-generation`

---

### sub_04 — OTP expired callback flow fix (🔴 critical bug)

#### 작업
1. Auth callback handler 위치 식별
2. OTP expired 케이스 명시적 처리 → `/auth/expired` (NEW) 로 redirect
3. Supabase config 확인 — `supabase/config.toml` 의 redirect URLs allowlist (production: studio.yagiworkshop.xyz, dev: localhost:3003)
4. OTP expiry 시간 (기본 1시간 → 24시간 dev 환경) — config.toml `[auth.email]` 섹션
5. Hash fragment error 처리 (`signin/page.tsx`)

#### Files in scope
- `src/app/[locale]/(auth)/callback/route.ts`
- `src/app/[locale]/(auth)/signin/page.tsx`
- `src/app/[locale]/auth/expired/page.tsx` (NEW)
- `supabase/config.toml`
- `messages/ko.json` + `en.json`

#### i18n 키 (NEW)
```
auth.expired.headline: "이메일 링크가 만료되었어요"
auth.expired.headline.en: "Your email link has expired"
auth.expired.subtitle: "보안을 위해 링크는 일정 시간 후 만료됩니다. 새 링크를 받아주세요."
auth.expired.subtitle.en: "For security, links expire after a while. Please request a new one."
auth.expired.cta: "이메일 다시 보내기"
auth.expired.cta.en: "Resend email"
auth.expired.back_to_signin: "로그인으로 돌아가기"
auth.expired.back_to_signin.en: "Back to sign in"
```

#### Acceptance
- 만료 link → `/auth/expired` (signin hash error 가 아닌 자체 page)
- 정상 link → confirm → `/onboarding/workspace`
- /ko + /en parity
- **dark editorial 적용 (sub_00 효과)**

#### Commit
`fix(phase-4-x): wave-c5b sub_04 — auth callback handles expired OTP gracefully + dedicated expired page`

---

### sub_05 — 이메일 링크 클릭 → 자동 세션 set (다시 로그인 강제 X)

#### 작업
1. Callback route 의 `code` query param → `supabase.auth.exchangeCodeForSession(code)` 호출 verify
2. Session cookie 정상 저장 verify (`@supabase/ssr` 의 `createServerClient` 사용)
3. Email confirm 후 redirect 시 session 살아있는지 check

#### Acceptance
- 정상 email link 클릭 → session 자동 set → `/onboarding/workspace` 직접 진입
- 다시 로그인 강제 X
- Cookie set 정확 (DevTools 확인 가능)

#### Commit
`fix(phase-4-x): wave-c5b sub_05 — email confirm link auto-creates session (no re-login)`

---

### sub_06 — Supabase Auth email template — YAGI brand HTML

#### 작업

**Email template 디자인** (sub_00 dark editorial 과 일치):

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>YAGI Studio · 이메일 인증</title>
</head>
<body style="margin: 0; padding: 0; background: #000000; font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 80px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 64px;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: #71D083; margin-bottom: 8px;">
                YAGI WORKSHOP
              </div>
              <div style="font-size: 12px; letter-spacing: 0.05em; color: #7B7B7B;">
                AI NATIVE ENTERTAINMENT STUDIO
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 30px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; color: #EEEEEE;">
                이메일 인증을 완료해 주세요
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #B4B4B4;">
                YAGI Studio 가입을 시작해 주셔서 감사합니다.<br>
                아래 버튼을 눌러 이메일을 인증해 주세요.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background: #71D083; color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                이메일 인증하기
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                버튼이 동작하지 않으면 아래 링크를 복사해 주세요:<br>
                <span style="color: #B4B4B4; word-break: break-all;">{{ .ConfirmationURL }}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.11); padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7B7B7B;">
                이 이메일은 YAGI Studio 가입 요청에 따라 발송되었습니다.<br>
                본인이 요청하지 않은 경우 무시하셔도 됩니다.
              </p>
              <p style="margin: 0; font-size: 11px; color: #7B7B7B;">
                © YAGI Workshop · studio.yagiworkshop.xyz
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Files in scope
- `supabase/templates/email/confirm.html` (NEW)
- `supabase/templates/email/recovery.html` (NEW — 비밀번호 재설정)
- `supabase/templates/email/magic_link.html` (NEW)
- `supabase/config.toml` ([auth.email.template] 섹션)
- `_followups.md` — Supabase Dashboard 의 Email Template 수동 동기화 필요 여부

#### Acceptance
- 신규 가입 시 이메일 template 이 야기 brand 적용 디자인
- Subject 적절 ("YAGI Studio · 이메일 인증을 완료해 주세요")
- {{ .ConfirmationURL }} 동작
- "powered by Supabase" 노출 0

⚠️ Limitation 명시: Supabase CLI push 가 dashboard 에 자동 반영 안 될 가능성. 야기 manual paste 필요할 수 있음.

#### Commit
`feat(phase-4-x): wave-c5b sub_06 — branded Supabase Auth email templates (YAGI design system v1.0)`

---

### sub_07 — "이메일을 확인해주세요" page 디자인 시스템 적용

#### 작업
1. Page 위치 식별 (`/app/[locale]/(auth)/signup/check-email/page.tsx` 또는 `/auth/verify/page.tsx`)
2. 디자인 시스템 v1.0 적용 (sub_00 dark editorial 위에 자연스럽게 정렬):
   - 배경 transparent (sub_00 의 bg.base 가 자동 적용)
   - 헤드라인 30px Pretendard 600 lh 1.2 ls -0.02em ink.primary
   - 서브카피 16px ink.secondary
   - 받는 이메일 box: bg.card-deep, border.subtle, radius 24, padding 24
   - 3-bullet 14px ink.secondary
   - "이메일 다시 보내기" CTA: primary button (sage 권장 또는 ink.primary 검토)
   - footer link sage hover

#### Acceptance
- /ko/auth/verify 디자인 시스템 v1.0 정확 적용
- 무채색 + sage CTA
- Pretendard Variable
- /en parity

#### Commit
`fix(phase-4-x): wave-c5b sub_07 — email verify page applies design system v1.0`

---

### sub_08 — profiles.handle 컬럼 internal-only 처리

#### 작업
1. 코드 grep: `profiles.handle` 또는 `\.handle` 또는 `data.handle` 사용 위치 식별
2. UI 노출 위치 모두 제거
3. DB 데이터 cleanup: `c_xxxx` handle 그대로 두되 (data integrity) UI 비노출 보장
4. RPC 의 handle 자동 생성 로직 유지
5. Type 에 `internal: true` 코멘트

#### Acceptance
- UI 어디에도 `c_xxxx` handle 노출 0
- DB column 살아있음
- Phase 5+ 재설계 가능 상태

#### Commit
`refactor(phase-4-x): wave-c5b sub_08 — profiles.handle internal-only (UI-hidden, DB-retained)`

---

### sub_09 — i18n cleanup

#### 작업
1. ko/en grep 후 사용처 0 인 키 제거: `role.select.*`, `creator.profile.*`, `studio.profile.*`, handle 폼 라벨 등
2. 키 rename 또는 namespace 정리 (필요 시)

#### Acceptance
- 미사용 i18n key 0
- ko/en key 동기화

#### Commit
`chore(phase-4-x): wave-c5b sub_09 — i18n cleanup (creator/role-select keys removed)`

---

### sub_10 — DB 데이터 cleanup

#### 작업
1. `profiles` 의 `role='creator'` 또는 `role='studio'` rows 식별
2. 있으면 archive 또는 reclassify migration
3. 0 rows 면 SKIP (most likely)
4. `_wave_c5b_sub10_db_audit.md` 작성

#### Commit (있을 때만)
`chore(phase-4-x): wave-c5b sub_10 — archive legacy creator profile rows`

---

### sub_11 — PRODUCT-MASTER §4 갱신

#### 작업

`.yagi-autobuild\PRODUCT-MASTER.md` §4 append-only:

```markdown
## §4 amendment — 2026-05-01 (Phase 4.x Wave C.5b)

**Persona model A 채택** — PRODUCT-MASTER §4 의 3-persona model (Brand / Artist / YAGI Admin) 보전.

- "크리에이터 / 스튜디오" (independent creator) persona = **Phase 4 에서 명시적 deferred**
  - Phase 2.x 에서 도입된 self-registration flow (`/role` + `/u/handle`) 폐기
  - 이유: 큐레이션 부티크 positioning 과 self-registration 양립 X
- Artist Roster 영입 = **Phase 5 entry 에서 새 설계** (셀럽/엔터에이전시 — 야기 직접 영입)
- Independent creator 자체-등록 = **Phase 9+ 또는 영구 deferred**

현시점 Phase 4 SHIPPED 시 활성 persona = **Brand (의뢰인) only** + YAGI Admin (내부).

## §11 (NEW) — Design System v1.0 적용 결정 (Wave C.5b sub_00)

- Phase 2.7.1 잔재 light mode token (`globals.css :root` 의 off-white) 폐기
- yagi-design-system v1.0 (flora.ai-inspired editorial dark + sage #71D083) **전체 적용**
- 모든 page (auth / onboarding / app / admin) 가 same dark editorial
- light mode 는 `.light` opt-in class 로 future-proof (admin 또는 special context 만)
```

ROADMAP.md 도 갱신, ARCHITECTURE.md 에 decision append (Q-109 또는 새 ID).

#### Commit
`docs(phase-4-x): wave-c5b sub_11 — persona A locked, design system v1.0 applied (PRODUCT-MASTER amendment)`

---

### sub_12 — `/app/projects` empty state — "+50개 이상" placeholder design system 다듬기 (야기 결정 a)

#### 야기 결정
- Placeholder 그대로 살림 (Phase 7+ 에 진짜 brand 로고로 교체 예정)
- design system v1.0 token 으로 다듬기만

#### 현상 (Image 2)
- "+50개 이상의 고객사가 YAGI와 함께하고 있어요" 문구 유지
- 동그라미 4개 — generic 회색 placeholder → bg.card-deep + border.subtle 로 정렬

#### 작업
1. 동그라미 4개 visual:
   - Size: 40×40 또는 48×48 circle
   - bg: `bg.card-deep` rgba(255,255,255,0.05)
   - border: `border.subtle` rgba(255,255,255,0.11) 1px
   - 겹침: 각 원이 8-12px overlap (typical brand-logo-cluster 패턴)
   - hover: 미세 lift 또는 opacity 변화 (선택)
2. Copy "+50개 이상의 고객사가 YAGI와 함께하고 있어요":
   - 14px regular ink.tertiary
   - 동그라미 cluster 옆 정렬
3. `_followups.md` 등록: "Phase 7+ Reveal Layer 시점에 brand logo 4개 (실제 client 의 동의 받은 후) 교체. 진짜 client 수가 4개 이상이면 cluster 확장 또는 cycle."

#### Acceptance
- /ko/app/projects empty state 의 동그라미 4개 + copy 정상 (sub_00 dark mode 위에서)
- design system v1.0 token 정확 적용
- 무채색 + 자연스러운 visual
- /en parity

#### Commit
`fix(phase-4-x): wave-c5b sub_12 — projects empty state social proof placeholder polished (design system v1.0)`

---

### sub_13 — Artist 계정 manual 생성 (artist@yagiworkshop.xyz)

#### 야기 spec
- Email: `artist@yagiworkshop.xyz`
- Password: `yagiworkshop12#$`
- Role: `artist` (PRODUCT-MASTER §4)
- Test/demo 계정 (Phase 5 entry 의 Artist Roster 영입 surface 도입 전 manual 생성)

#### 작업

**먼저 profiles.role enum 에 'artist' 가 있는지 확인 필수**:
```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'role';

-- 또는 enum value 확인
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'profile_role'::regtype;  -- 또는 정확한 enum 타입명
```

'artist' 가 없으면 야기에게 chat 보고 (Phase 5 의 Artist workspace 작업 의존성).

**계정 생성** — `scripts/create-artist-account.ts` (NEW):
```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: 'artist@yagiworkshop.xyz',
    password: 'yagiworkshop12#$',
    email_confirm: true,
    user_metadata: { display_name: 'Artist Demo' }
  });

  if (authErr) throw authErr;
  const userId = authData.user.id;

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ role: 'artist' })
    .eq('id', userId);

  if (profileErr) throw profileErr;

  console.log('Artist account created:', userId);
}

main().catch(console.error);
```

실행: `npx tsx scripts/create-artist-account.ts`

#### Acceptance
- artist@yagiworkshop.xyz 생성 + email_confirmed
- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
- Login test 가능
- `_artist_account_created.md` 작성 (user_id + verify SQL)

#### Files in scope
- `scripts/create-artist-account.ts` (NEW)
- `_artist_account_created.md` (작성 후)

#### Commit
`chore(phase-4-x): wave-c5b sub_13 — manual artist account created (artist@yagiworkshop.xyz, demo)`

---

### sub_14 — Wave C.5b 통합 verify

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

3개 모두 exit 0 (lint baseline 유지) 확인.

`_wave_c5b_result.md` 작성:
- 15 sub-task 결과 요약 (commit SHA, files changed, acceptance pass/fail)
- sub_00 의 dark mode 적용 결과 + 발견된 visual breakage (있으면 list)
- Persona model A 적용 verify
- Auth flow critical bug fix 결과 (sub_04 + sub_05)
- Email template 작업 결과 + 야기 manual action 필요 여부
- Artist account 생성 결과
- **CRITICAL Visual review 권장 (야기에게)**:
  - dark mode 가 *모든* page 에 정확히 적용됐는지 시각 verify (sub_00 의 effect)
  - sub_00 으로 인한 깨진 visual 있으면 chat 보고
  - 신규 user signup → email confirm → /onboarding/workspace → /app/dashboard 전 flow
  - artist@yagiworkshop.xyz 로그인 시 동작
  - /app/projects empty state 의 cluster placeholder
  - 이메일 template 도착 확인 (가능하면)

`_run.log` 기록:
```
<ISO> phase-4-x WAVE_C5B SHIPPED sub_tasks=15 sha=<latest> tsc=ok lint=baseline build=ok
<ISO> phase-4-x WAVE_C5B_END_BEFORE_WAVE_D sha=<latest> awaiting_yagi_full_visual_review=true
<ISO> WARN: sub_00 dark mode 적용으로 모든 page visual review 필수
```

---

### STOP — Wave D 결정 대기 + 야기 *전체 page* visual review

Wave C.5b SHIPPED 후 즉시 STOP. Wave D 진입 X.

야기는:
1. `pnpm dev` 로 **모든 page 시각 review** (dark mode 정상 적용 여부 + breakage 발견):
   - /ko/signin
   - /ko/signup (또는 회원가입 흐름)
   - /ko/auth/verify (이메일 확인)
   - /ko/auth/expired (NEW)
   - /ko/onboarding/workspace
   - /ko/app/dashboard
   - /ko/app/projects (list + empty state)
   - /ko/app/projects/new (wizard 3 step)
   - /ko/app/projects/[id] (detail page)
   - /ko/app/meetings
   - /ko/app/settings (3 tabs)
   - /ko/app/inbox (있으면)
   - /ko/app/admin/* (yagi_admin 만)
2. **artist@yagiworkshop.xyz 로그인** → workspace 없는 상태 동작 review (Phase 5 entry signal)
3. **이메일 다시 받아서 template 도착 확인** (가능하면)
4. 발견 issue → chat 보고 → Wave C.5c prompt
5. 추가 issue 없음 → chat 에 "C.5b clean → Wave D" → Wave D prompt 작성

---

## 사고 처리

각 sub-task:
- **MINOR** → 진행 + `_hold/issues_c5b.md` 기록
- **MAJOR** (tsc/build fail, RLS spec drift, supabase config 손상) → STOP, sub-task `_wave_c5b_halt.md`, 야기 chat 보고

**sub_00 의 visual breakage 는 MAJOR 가 아닌 expected** — `_sub00_breakage_log.md` 에 누적 기록만, 진행. Wave C.5c 에서 일괄 fix.

## 제약 (CRITICAL)

- **L-027 BROWSER_REQUIRED gate** — main push 절대 X
- main 에 ff-merge 절대 X. g-b-9-phase-4 에만 commit
- spawn 사용 X
- 디자인 시스템 v1.0 token = SKILL.md + tokens.json + globals.css source of truth
- L-001 PowerShell `&&` 금지

## Output expectations

`.yagi-autobuild\phase-4-x\` 안에:
- `_sub00_visual_audit.md`
- `_sub00_breakage_log.md` (있으면)
- `_wave_c5b_sub10_db_audit.md`
- `_artist_account_created.md`
- `_wave_c5b_result.md` (15 sub-task 통합)
- `_run.log` 추가 라인
- `_hold/issues_c5b.md` (MINOR 발생 시)
- `_followups.md` (Supabase Dashboard manual sync, Phase 5 Artist Roster 영입, Phase 7+ brand logo 교체 등)

## 시작

sub_00 부터 즉시. STOP point = sub_14 이후. 의문점 발생 시 즉시 chat 보고.

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆
