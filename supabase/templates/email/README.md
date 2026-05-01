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

## Adding a new template

1. Create `<flow>.html` matching the structure above.
2. Pick a copy block that's authored for the specific intent (do NOT
   re-use the confirm.html copy).
3. Update this README's paste table.
4. Note that `{{ .ConfirmationURL }}` is the Supabase Auth template
   variable — it's interpolated server-side, do NOT escape or
   percent-encode it.
