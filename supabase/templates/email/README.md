# YAGI branded Supabase Auth email templates

These HTML files are the **source of truth** for the auth-flow emails
sent by Supabase. The Supabase CLI does not push inline
`[auth.email.template]` HTML to the hosted dashboard, so yagi must
paste them manually.

## Where to paste

Supabase Studio → Authentication → Email Templates:

- **Confirm signup** ← `confirm.html` + subject `YAGI Studio · 이메일 인증을 완료해 주세요`
- **Magic Link** ← `magic_link.html` + subject `YAGI Studio · 로그인 링크`
- **Reset Password** ← `recovery.html` + subject `YAGI Studio · 비밀번호 재설정 링크`

## Design contract (locked, sub_06)

- Background: `#000000` body. No light fallback — the templates assume
  dark-rendering email clients honor `meta name="color-scheme"`.
- Brand eyebrow: `YAGI WORKSHOP` in sage `#71D083`, 12px 700,
  letter-spacing 0.18em.
- Sub-eyebrow: `AI NATIVE ENTERTAINMENT STUDIO` in `#7B7B7B`.
- H1: 30px Pretendard 600, line-height 1.2, letter-spacing -0.02em,
  ink `#EEEEEE`.
- Subtitle: 16px ink-secondary `#B4B4B4`.
- Primary CTA button: bg `#71D083`, fg `#000000`, padding 14px 32px,
  font 14px 600, radius 12px.
- Footer: 11–12px ink-tertiary `#7B7B7B`, separated by a 1px
  `rgba(255,255,255,0.11)` rule.
- Pretendard Variable as primary; macOS / Outlook / Gmail will fall
  through to system-ui — that is fine, the layout still reads.

## PKCE flow (Wave C.5d hardening)

Supabase's default `{{ .ConfirmationURL }}` resolves to a Supabase Auth
endpoint that consumes the OTP on a plain GET. Mail-client preview
crawlers and AV scanners issue that GET before the user clicks, which
burns the token and lands the user on an "Email link is invalid or
has expired" page. To prevent that, every CTA in this directory
routes through our own intermediate route at `/auth/confirm` instead:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<flow>&next={{ .RedirectTo }}
```

Behavior:
- **GET** `/auth/confirm` renders an HTML form with a single
  "Continue" button. No `verifyOtp` call yet, so a crawler GET does
  nothing and the OTP stays valid.
- **POST** `/auth/confirm` (form submit) calls `verifyOtp` with
  `token_hash` + `type`, sets the session cookie, then redirects to
  `next`.
- `next` is sanitized server-side (see `src/app/auth/confirm/route.ts`).
  `{{ .RedirectTo }}` is allowed when it matches the allowlist; empty
  or non-allowlisted values fall back to the default below.

### Type mapping

| Template | `type` query param | Server-side resolved `next` |
|---|---|---|
| `confirm.html` | `signup` | allowlisted `/onboarding/*` or `/app/*`, else `/onboarding/workspace` |
| `magic_link.html` | `magiclink` | allowlisted `/app/*` or `/onboarding/*`, else `/onboarding/workspace` |
| `recovery.html` | `recovery` | always forced to `/reset-password` (route hardcodes this regardless of `next`) |
| (Change Email — Dashboard only) | `email_change` | allowlisted `/onboarding/*` or `/app/*`, else `/onboarding/workspace` |

The route handler enforces an allowlist of `/onboarding/workspace`,
`/onboarding/brand`, `/onboarding/invite`, `/app` for non-recovery
flows, plus the dedicated `/reset-password` for recovery. Anything
outside that set falls through to the default. **`type=email_change`
is not customised at the repo layer yet** — it's pasted directly into
Supabase Studio per `_wave_c5d_dashboard_paste_guide.md`. Note that
there is no `/account/settings` route today, so `email_change` will
land on `/onboarding/workspace` until that route lands.

### Production sync

`supabase config.toml` does **not** push inline
`[auth.email.template]` HTML to the hosted dashboard. Production is
driven by the dashboard, so any change here must be repeated in
Supabase Studio → Authentication → Email Templates by hand. Use
`.yagi-autobuild/phase-4-x/_wave_c5d_dashboard_paste_guide.md` as the
paste-ready source of truth.

### Supabase template variables used

- `{{ .SiteURL }}` — Site URL configured in Supabase Studio
  (Authentication → URL Configuration). Production = `https://studio.yagiworkshop.xyz`.
- `{{ .TokenHash }}` — opaque OTP hash. Server-side rendered, do NOT
  escape or percent-encode.
- `{{ .RedirectTo }}` — `emailRedirectTo` value passed by the server
  to `signUp` / `resetPasswordForEmail` / `signInWithOtp`. Empty if
  the call did not set it; server fallback handles that case.

`&` between query params is escaped as `&amp;` in the HTML attribute
to satisfy strict email clients; the browser/email client decodes it
back to `&` before issuing the request.

## Adding a new template

1. Create `<flow>.html` matching the structure above.
2. Pick a copy block that's authored for the specific intent (do NOT
   re-use the confirm.html copy).
3. Update this README's paste table and type mapping.
4. Mirror the change into `_wave_c5d_dashboard_paste_guide.md` and
   paste it into Supabase Studio. Repo + dashboard must stay in sync.
