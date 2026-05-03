# Wave C.5d sub_02 — Supabase Dashboard Paste-Ready Guide

> Purpose: yagi pastes the 4 email templates below into Supabase Studio
> after Wave C.5d sub_01 ships, so production stops emitting
> `{{ .ConfirmationURL }}` direct links (HIGH-B from Codex K-05 final
> review LOOP 1).
>
> Production Supabase **does not** read `supabase/templates/email/*.html`
> from the repo — those files are dev-local only. The hosted dashboard is
> the source of truth, and the only way to update it is by hand here.

## Workflow

1. Open Supabase Studio → **Authentication → Email Templates**.
2. For each section below, paste the body HTML, set the subject, click
   **Save changes**. Order: Magic Link → Reset Password → (optional)
   Change Email Address. Confirm signup is verify-only (already pasted).
3. After all paste operations, open **Authentication → URL Configuration**
   and confirm the redirect URL allowlist (last section of this guide).
4. Smoke test (last section).

## Repo / dashboard divergence — intentional

- **Repo templates** use `next={{ .RedirectTo }}` so the signUp /
  signInWithOtp / resetPasswordForEmail server actions can drive the
  destination via `emailRedirectTo`.
- **Dashboard templates** use static `next=...` paths below. The route
  handler at `src/app/auth/confirm/route.ts` sanitizes the `next` value
  the same way regardless of source: allowlist-checks for non-recovery,
  hardcodes `/reset-password` for recovery. Static paths in production
  are simply more predictable for ops monitoring.
- Either approach is safe. Don't mix within a single template.

---

## 1) Confirm signup (VERIFY ONLY — already pasted)

**Action**: Open Authentication → Email Templates → "Confirm signup"
and confirm the body's CTA `<a>` is in PKCE form. If it still uses
`{{ .ConfirmationURL }}`, replace with the body from
`supabase/templates/email/confirm.html` and the URL pattern below.

Required URL pattern in CTA + fallback span:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding/workspace
```

Subject (existing): `YAGI Studio · 이메일 인증을 완료해 주세요`

---

## 2) Magic Link (PASTE)

**Subject**: `YAGI Studio · 로그인 링크`

**Body**: paste the entire HTML below.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>YAGI Studio · 로그인 링크</title>
</head>
<body style="margin: 0; padding: 0; background: #000000; color: #EEEEEE; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 80px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px;">
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
                로그인 링크가 도착했어요
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #B4B4B4;">
                아래 버튼을 눌러 YAGI Studio 에 로그인해 주세요.<br>
                보안을 위해 링크는 일정 시간 후 만료됩니다.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next=/app/dashboard" style="display: inline-block; padding: 14px 32px; background: #71D083; color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                로그인하기
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                버튼이 동작하지 않으면 아래 링크를 복사해 주세요:<br>
                <span style="color: #B4B4B4; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next=/app/dashboard</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.11); padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                본인이 요청하지 않은 경우 이 이메일을 무시해 주세요.<br>
                계정은 안전하게 보호됩니다.
              </p>
              <p style="margin: 0; font-size: 11px; color: #7B7B7B;">
                &copy; YAGI Workshop &middot; studio.yagiworkshop.xyz
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

**Server destination**: `next=/app/dashboard` matches the route's
non-recovery allowlist (`/app` prefix), so users land on the locale-
prefixed dashboard `/${locale}/app/dashboard`.

---

## 3) Reset Password (PASTE)

**Subject**: `YAGI Studio · 비밀번호 재설정 링크`

**Body**: paste the entire HTML below.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>YAGI Studio · 비밀번호 재설정</title>
</head>
<body style="margin: 0; padding: 0; background: #000000; color: #EEEEEE; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 80px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px;">
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
                비밀번호 재설정 링크
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #B4B4B4;">
                YAGI Studio 비밀번호 재설정 요청을 받았습니다.<br>
                아래 버튼을 눌러 새 비밀번호를 설정해 주세요.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reset-password" style="display: inline-block; padding: 14px 32px; background: #71D083; color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                비밀번호 재설정하기
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                버튼이 동작하지 않으면 아래 링크를 복사해 주세요:<br>
                <span style="color: #B4B4B4; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reset-password</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.11); padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                재설정을 요청하지 않으셨다면 이 이메일을 무시해 주세요.<br>
                계정은 변경되지 않습니다.
              </p>
              <p style="margin: 0; font-size: 11px; color: #7B7B7B;">
                &copy; YAGI Workshop &middot; studio.yagiworkshop.xyz
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

**Note on `next=/reset-password`**: the spec draft mentioned
`/auth/reset-password`, but the actual route in the codebase is
`src/app/[locale]/(auth)/reset-password/page.tsx` → `/reset-password`.
The route handler hardcodes recovery to `/reset-password` regardless of
what `next` says, so even if you paste the wrong path it still works —
the static path here just keeps the email link readable.

---

## 4) Change Email Address (DEFER — not yet supported)

**Status**: do **not** paste this template yet.

**Reason**: there is no `/account/settings` route in the codebase
today. The route handler's allowlist does not include `/account`, so
even with `next=/account/settings` Supabase emits, our intermediate
page will redirect post-confirmation to the default
`/onboarding/workspace` — which is the wrong destination for an
already-onboarded user changing their email.

Recommended path: ship the `/account/settings` (or equivalent) route
first, add `/account` to `NEXT_ALLOWLIST_PREFIXES` in
`src/app/auth/confirm/route.ts`, then add a `change_email.html` to
`supabase/templates/email/` and a corresponding paste section to this
guide. Until then, leave Supabase's default Change Email Address
template in place (Supabase still serves a working
`{{ .ConfirmationURL }}` link, which is functional but not on-brand).

If yagi wants the on-brand template paste *anyway* (with the redirect
falling back to `/onboarding/workspace`), use the body below — but
expect users to be confused by the destination:

```
Subject: YAGI Studio · 이메일 주소 변경 확인
Body: copy structure from confirm.html, replace H1 with "이메일 주소
변경 확인", subtitle with "새 이메일 주소를 인증해 주세요. 아래
버튼을 누르면 변경이 완료됩니다.", CTA copy with "이메일 변경하기",
href with {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email_change&amp;next=/onboarding/workspace
```

---

## Redirect URL allowlist (Authentication → URL Configuration)

The Supabase URL allowlist controls which absolute URLs Supabase will
accept as `emailRedirectTo` and where it will redirect after auth flows.
Confirm the following entries exist (production + local dev):

**Production**:
- `https://studio.yagiworkshop.xyz/auth/confirm`
- `https://studio.yagiworkshop.xyz/onboarding/**`
- `https://studio.yagiworkshop.xyz/app/**`
- `https://studio.yagiworkshop.xyz/reset-password`

**Local dev (3001 and 3003)**:
- `http://localhost:3001/auth/confirm`
- `http://localhost:3001/onboarding/**`
- `http://localhost:3001/app/**`
- `http://localhost:3001/reset-password`
- (same set with port 3003)

If any are missing, click **Add URL**, paste, save. Without these,
`signUp({ options: { emailRedirectTo } })` will silently 422 and the
email won't be sent.

---

## Smoke test (after all paste operations)

1. **Signup**: open `https://studio.yagiworkshop.xyz/ko/signup`, enter
   a fresh email, submit. Email arrives. CTA URL must start with
   `studio.yagiworkshop.xyz/auth/confirm?token_hash=` (NOT
   `studio.yagiworkshop.xyz/auth/v1/verify?token=`).
   Click → intermediate page renders → click "계속하기 / Continue" →
   land on `/ko/onboarding/workspace`.
2. **Magic Link**: from the signin form, click "Send magic link".
   Same shape: `/auth/confirm?...&type=magiclink`. Click → intermediate
   → continue → `/ko/app/dashboard`.
3. **Reset Password**: from the forgot-password form, request reset.
   Email URL: `/auth/confirm?...&type=recovery`. Click → intermediate
   → continue → `/ko/reset-password`.
4. **Crawler probe**: open the email in Gmail web (which previews
   links). Click → token must still be valid (not consumed by
   preview). If "link expired" appears immediately on first click,
   the dashboard paste did not take.

After all four pass, report SHIPPED in chat. Wave D retry can resume.

---

## What changed at the repo layer (sub_01)

For your reference when comparing dashboard vs repo:

- `supabase/templates/email/confirm.html` line 42 + 51 → PKCE form,
  `next={{ .RedirectTo }}`
- `supabase/templates/email/magic_link.html` same
- `supabase/templates/email/recovery.html` same
- `supabase/templates/email/README.md` rewritten with PKCE rationale
  and type mapping

Repo uses `{{ .RedirectTo }}` because the `signUp` action passes
`emailRedirectTo: '/onboarding/workspace'` (or equivalent) and the
template should reflect the server's authoritative intent. Dashboard
uses static paths because production stability + ops simplicity
outweighs flexibility there. Both forms route through `/auth/confirm`
and are sanitized server-side, so the security property is identical.
