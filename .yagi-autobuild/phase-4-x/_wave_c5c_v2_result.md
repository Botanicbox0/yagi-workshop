# Phase 4.x — Wave C.5c v2 result

**Date**: 2026-05-03 (lead Builder direct, no spawn)
**Branch**: `g-b-9-phase-4` (NOT pushed; NOT ff-merged to main)
**HEAD before this wave**: `85af274` (Wave C.5b Codex amendments
result)
**HEAD after this wave**: `ddcf63b` (sub_05) + final result-doc commit
**Verify**: `pnpm exec tsc --noEmit` exit 0 / `pnpm lint`
baseline-pinned (3155 errors) / `pnpm build` exit 0 (middleware
162 kB).

## yagi major decision (chat 2026-05-02)

The wizard form-only paradigm gets retired and replaced in Phase 5
by a Briefing Canvas (briefing-as-conversation). Wave C.5c sub_03
(Twin intent UX redesign) was therefore deferred to that surface —
polishing a doomed form is wasted effort. C.5c shrinks to PKCE +
auth + brand-asset + submit-copy.

Phase 5 swap: Briefing Canvas takes priority; the original Artist
Roster intake plan moves to Phase 6 entry.

## Pre-conditions handled in chat (2026-05-01..02, MCP)

- Wave A task_01 migration applied to prod
  (`workspaces.kind` / `projects.twin_intent` / `projects.kind` /
  `project_licenses` columns all live).
- Wizard submit broken root cause = missing `twin_intent` column,
  auto-resolved by the migration apply (no Builder action needed).
- YAGI Internal workspace (id 320c1564-...) reclassified to
  `kind='yagi_admin'`.

## 5 sub-task summary (5 commits + result doc)

| sub | Subject | Commit | Codex K-05 | Acceptance |
|---|---|---|---|---|
| 01 | PKCE flow + /auth/confirm intermediate page | `4d19ef7` | LOOP 1 → 2 → 3, all residuals fixed inline; final 0 HIGH-A / 0 HIGH-B | ✅ GET renders form (no consume), POST verifyOtp (303 redirect), CSRF + XSS + clickjacking + Referer-leak hardened |
| 02 | auth/expired resend wiring + 60s cooldown | `77842d9` | skip per wave prompt | ✅ explicit error classifier; 60s countdown UI; ko/en cooldown copy |
| 03 | submit button copy refined | `b5031e0` | skip (i18n) | ✅ ko `의뢰 보내기` → `프로젝트 의뢰하기`; en already `Submit project` |
| 04 | sidebar brand logo (icon + text horizontal) | `7ecf5fb` | skip (asset) | ✅ Assets/* moved to public/brand/; flex items-center gap-2.5; icon 28×28 + text height 18 (width ~56) |
| 05 | Talk FAB right-bottom (56×56, reuse panel) | `ddcf63b` | skip (asset) | ✅ icon swap to yagi-talk-icon (40×40 inside the existing 56 ring); mobile inset bottom-4 right-4 / md: 6/6; -translate-y-0.5 hover lift; z-50 |
| Final | verify + result doc + 4 followups | (this commit) | — | ✅ tsc / lint baseline / build all clean |

## sub_01 Codex K-05 deep dive (mandatory review)

### LOOP 1 — HIGH-A 0 / HIGH-B 2 / MED-A 3

The two HIGH-B findings shared a root cause:
- **F1**: `verifyOtp({ token_hash, type })` does NOT enforce the
  PKCE `code_verifier` cookie — only `exchangeCodeForSession` does.
- **F7**: Therefore the original GET-handler /auth/confirm still
  consumed the OTP on a passive Gmail crawler GET. Same bug we
  tried to fix.

The three MED-A:
- **F2**: `sanitizeNext` rejected absolute same-origin URLs (Supabase
  emits `{{ .RedirectTo }}` as absolute when `emailRedirectTo` is
  absolute), silently falling back to default.
- **F8**: signup `sanitizeNext` allowed too broad a `next` surface
  for the Dashboard allowlist scope.
- **F9**: `/reset-password` was reachable as a generic `next` (a
  forged signup link could land an authenticated user on the
  password-reset form).

Fix path: rewrite /auth/confirm into the canonical
"GET-renders-form / POST-verifies" intermediate page pattern. GET
returns static HTML with hidden token_hash/type/next inputs and a
Continue button; POST handles the actual `verifyOtp`. Crawler GETs
see HTML, no consume happens until user clicks. `sanitizeNext`
URL-parses absolute same-origin URLs, signup `sanitizeNext`
narrowed to the same allowlist, `/reset-password` moved to a
recovery-only branch.

### LOOP 2 — HIGH-A 0 / HIGH-B 0 / MED-A 2 NEW

LOOP 1 fixes verified clean. Two new MED-A introduced by the
rewrite:
- **N1**: POST vulnerable to login-CSRF + clickjacking (no
  Origin/Referer check, no CSP `frame-ancestors`).
- **N2**: Tokenized URL leaked as Referer to the inline external
  Pretendard CDN stylesheet.

Fix path: drop the CDN stylesheet (system-ui fallback only); add
`Referrer-Policy: no-referrer` header + `<meta name="referrer">`;
add `Content-Security-Policy: default-src 'self'; style-src
'unsafe-inline'; frame-ancestors 'none'; form-action 'self';
base-uri 'none'`; same-origin Origin/Referer check on POST.

### LOOP 3 — HIGH-A 0 / HIGH-B 0 / MED-A 1 NEW

LOOP 2 fixes verified clean. One new MED-A:
- **N4**: `NextResponse.redirect(url)` defaults to status 307,
  which preserves request method. Browser would re-POST the
  consumed token_hash form body to /onboarding/workspace (which
  has no POST handler).

Fix path: explicit `303` on every POST-side redirect.

### Final residual after LOOP 3

`HIGH-A 0 / HIGH-B 0 / MED-A 0`. Codex APPLY recommendation.

Three Codex review files (~1.7 MB raw output total) live under
`.yagi-autobuild/phase-4-x/_amend_c5c_sub01_codex_review_loop_{1,2,3}.md`.

## sub_02 — auth/expired resend hardening

Original silent-fail: yagi clicked Resend on /auth/expired, got
the success toast, but the email never arrived. Most likely cause:
the second click hit Supabase's 60s rate limit and surfaced the
raw error message via toast.error, reading as success-followed-by-
unfamiliar-string.

Fix: explicit error classifier (`rate_limit` / `invalid_email` /
`generic`) with localised toasts; 60s cooldown timer started after
both successful sends AND rate-limit errors; button label
swaps to a `{seconds}초 후 다시 시도` countdown that ticks once a
second; sent-state retains the resend button so the user can
re-send after cooldown clears (instead of being stuck on the
success card).

## sub_04 + sub_05 — brand asset migration

Three previously-untracked PNGs in repo-root `Assets/` moved to
`public/brand/`:

- `yagi-icon-logo-black.png` (1254×1254)
- `yagi-text-logo-black.png` (3180×1030, ~3.087:1)
- `yagi-talk-icon.png` (1254×1254, white-on-transparent)

`Assets/` directory removed. SidebarBrand restored to icon + text
horizontal layout (Linear / Notion / Slack shape). SupportWidget
FAB swapped to the new talk icon at 40×40 inside the existing 56
ring; mobile inset tightened.

## Followups registered (in `_followups.md`)

- **FU-C5c-01** — Supabase Dashboard email templates + redirect URLs
  for PKCE. **Production blocker**: yagi must paste the new
  `/auth/confirm?token_hash=...&type=email&next=...` link into the
  Confirm-signup / Magic-link / Reset-password templates AND add
  the new redirect URLs (auth/confirm + onboarding paths +
  reset-password) to the allowlist for each origin. Without this
  paste, sub_01 has zero effect — the email body still uses the
  old /auth/callback?code= shape.
- **FU-C5c-02** — yagi-talk-icon + yagi-text-logo SVG conversion
  (Phase 6+).
- **FU-C5c-03** — yagi_admin workspace (320c1564) RLS surface
  (Phase 5+).
- **FU-C5c-04** — Phase 5 Briefing Canvas KICKOFF (the swap-in for
  Phase 5; Artist Roster moves to Phase 6).

Followups carried over from prior waves (FU-C5b-*) all still open
except FU-C5b-05 (border-border sweep, closed obsolete by sub_00
ROLLBACK).

## Visual review checklist for yagi

When `pnpm dev` resumes:

- [ ] **PKCE end-to-end** — sign up at `/ko/signup` with a fresh
      Gmail address. Open the email, hover the link to confirm
      the URL is `<origin>/auth/confirm?token_hash=...&type=email&next=...`
      (NOT the old `/auth/callback?code=...`). If still old, yagi
      hasn't pasted the dashboard template yet (FU-C5c-01).
- [ ] Click the link. Expected: lands on /auth/confirm intermediate
      page with the YAGI-branded "Continue" button (system-ui
      fallback font, no CDN load). Click Continue → redirected
      303 → /ko/onboarding/workspace, authenticated.
- [ ] **Crawler simulation** — send the email link via a tool that
      previews URLs (Slack DM, Telegram link preview). Confirm the
      preview shows the intermediate page TITLE only, and the real
      user click STILL succeeds (no expired bounce).
- [ ] **/auth/expired resend** — visit /ko/auth/expired, type a
      previously-registered email, click Send. Confirm toast +
      cooldown. Click again immediately → button disabled, label
      shows countdown. Wait 60s → button re-enabled.
- [ ] **Submit copy** — /ko/app/projects/new Step 3 button reads
      "프로젝트 의뢰하기"; /en mirror reads "Submit project".
- [ ] **Sidebar logo** — /ko/app/dashboard sidebar header shows
      the icon + wordmark horizontally (28×28 + 18-tall text, gap
      10). No combined-logo PNG anywhere.
- [ ] **Talk FAB** — bottom-right corner (16px on mobile, 24px on
      desktop) shows the 56×56 dark FAB with the new white
      yagi-talk-icon at 40×40 inside. Click → existing support
      panel slides in.

## STOP — Wave D not entered

Wave C.5c v2 SHIPPED. **Wave D NOT entered**. yagi must:

1. Complete FU-C5c-01 (Dashboard template + redirect URL paste)
   so PKCE actually takes effect for Gmail signups.
2. Walk the visual review checklist above.
3. Trigger Wave D ff-merge prompt OR a follow-up Wave C.5d if
   any visual finding surfaces.

`push 절대 X. ff-merge 절대 X.` (L-027 BROWSER_REQUIRED gate)
