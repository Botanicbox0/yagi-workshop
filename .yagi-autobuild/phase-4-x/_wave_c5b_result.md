# Phase 4.x — Wave C.5b result

**Window**: 2026-05-01 (lead Builder direct, no spawn)
**Branch**: `g-b-9-phase-4` (NOT pushed; NOT ff-merged to main)
**HEAD before C.5b**: `83e9a39` (Wave C.5a end)
**HEAD after sub_13** : `6cee030`
**Verify**: `pnpm exec tsc --noEmit` exit 0 / `pnpm lint` baseline-pinned (3155 errors, identical to Wave C.5a baseline) / `pnpm build` exit 0

---

## Sub-task summary (15 sub-tasks, 14 functional commits + this doc)

| sub | Subject | Commit | Acceptance |
|---|---|---|---|
| 00 | root layout dark mode foundation | `ef4e9c1` | ✅ tokens/utilities/preset/ThemeProvider — visual unverified by design |
| 01 | drop /role page, post-signup → /onboarding/workspace direct | `cdf1899` | ✅ /role, /onboarding/role 404; callback + signup re-routed |
| 02 | drop /u/handle creator profile + Image 6 runtime fix | `98683d3` | ✅ /u/* tree + role-specific profile forms + email templates deleted |
| 03 | onboarding/workspace copy refined + URL slug auto-gen | `96f5dd0` | ✅ KO/EN copy locked; non-ASCII name → sage warning |
| 04 | auth callback OTP expired + /auth/expired page | `3e9c2c9` | ✅ callback + signin hash + new page surface, all bounce to /auth/expired |
| 05 | email link auto-creates session (no re-login) | `6af09ff` | ✅ verification doc + comment; existing wiring already correct |
| 06 | branded Supabase Auth email templates | `7d68d69` | ✅ confirm/recovery/magic_link committed under supabase/templates/email/ |
| 07 | email verify page applies design system v1.0 | `816e1fa` | ✅ inline (auth)/signup/page.tsx + new /[locale]/auth/verify route |
| 08 | profiles.handle internal-only (UI-hidden, DB-retained) | `a39c282` | ✅ thread-panel, new-message email, projects/new actions purged |
| 09 | i18n cleanup (creator/role-select keys removed) | `d1d40c8` | ✅ ~95 keys removed per locale; KO+EN equivalent |
| 10 | DB audit creator/studio rows | `47f65eb` | ✅ 1 test artifact found; documented; no auto-write |
| 11 | persona A locked + design system v1.0 — master docs | `e87245c` | ✅ DECISIONS_CACHE Q-094/Q-095, ROADMAP, ARCHITECTURE §18 |
| 12 | projects empty state placeholder polished | `5853016` | ✅ 4×40 circle cluster, bg-card-deep, sage-aligned |
| 13 | manual artist account (HALTED on Phase 5 migration) | `6cee030` | 🟡 script ready, _artist_account_created.md halt-log |
| 14 | integrated verify + result doc | (this commit) | ✅ tsc=0 lint=3155 baseline build=0 |

---

## Cross-cutting behavior changes

### sub_00 — Editorial dark foundation

`src/app/globals.css` flipped `:root` from Phase 2.7.1 light P12 to
yagi-design-system v1.0 dark editorial. Sage `#71D083` is the sole
accent. Token namespaces:

- shadcn HSL channel form (`--background`, `--foreground`, `--accent`,
  `--ring`, etc.)
- v1.0 raw tokens `--ds-*` (rgba/hex form for surfaces/inks/borders
  that Tailwind's HSL pipeline cannot represent)

`tailwind.config.ts` extends with non-overlapping families: `sage`,
`ink`, `surface`, `edge`, `inverse`, plus the v1.0 type scale,
motion tokens (default 400ms cubic-bezier(0.45, 0, 0, 1)), radius
scale (pill / card / button), maxWidth (narrow / content / cinema).

`next-themes` `ThemeProvider` switched to `defaultTheme="dark"`,
`enableSystem={false}`, `disableTransitionOnChange`. The editorial
canvas is the universal default; `.light` is opt-in for special
contexts (admin / inverse sections / Phase-5+ light surfaces if any).

Global `* { border-color: hsl(var(--border) / 0.11) }` so the bare
`border` Tailwind class lands on the v1.0 near-invisible white
border by default. Explicit `border-border` callsites (264 across
100 files) now resolve to solid white — flagged for Wave C.5c
sweep (FU-C5b-05).

### Deleted surfaces (sub_01..02 persona A lock)

- `/onboarding/role/`
- `/onboarding/profile/{client,creator,observer,studio}/`
- `/onboarding/profile/actions.ts` (`completeProfileAction` server
  action, the only callers were the 4 deleted role pages)
- `/u/[handle]/` + `/u/layout.tsx` (creator profile public page
  that triggered the "Missing <html>/<body>" runtime — autofix is
  the deletion itself)
- `src/lib/profile/queries.ts` (`getProfileByHandle`)
- `src/lib/email/send-onboarding.ts` + the three
  `templates/{signup-welcome, role-confirmation, index}.ts` files
- `Scope` union narrowed in `src/lib/app/scopes.ts` (no more
  `kind: "profile"` branch)
- `src/components/app/sidebar-scope-switcher.tsx` profile-section
  / icon / scopeKey branches + the `User` icon import
- `src/middleware.ts` matcher: `u` removed from negative-lookahead

### Auth flow polish (sub_04 + sub_05 + sub_07)

- `/auth/callback` now detects expiry both in the Supabase redirect
  query params (PKCE-style errors) and in `exchangeCodeForSession()`
  failure messages, bouncing to `/auth/expired` instead of
  `/signin?error=...`.
- `/auth/expired` (NEW client page) reads `?email=<addr>` to
  pre-fill the resend form; sage CTA, ink hierarchy, success-state
  card, sign-in escape hatch.
- `/auth/verify` (NEW client page) — same shape as the inline
  post-signup "check your email" UI but reachable as a stable URL
  for users who close the signup tab.
- `/[locale]/auth/layout.tsx` (NEW) — chrome that mirrors
  `(auth)/layout.tsx` (wordmark + max-w-sm centered main) for the
  `/auth/*` route group that lives outside `(auth)`.
- Signin page hash-fragment scanner — reads
  `#error_code=otp_expired&...` on mount, bounces to
  `/auth/expired`, strips the fragment so refresh doesn't loop.
- Email-confirm session auto-set: documented as already correct,
  with a tightened comment in the callback route and a full
  code-trace in `_sub05_session_verify.md`.

### Branded email templates (sub_06)

`supabase/templates/email/{confirm,recovery,magic_link}.html` plus
`README.md` paste guide. v1.0 dark editorial palette inside the
email (background `#000000`, sage CTA, ink hierarchy, subtle white
divider). FU-C5b-02 tracks yagi's manual paste into the Supabase
Dashboard since the CLI doesn't propagate inline
`[auth.email.template]` HTML to the hosted project.

### profiles.handle internal-only (sub_08)

UI-facing fallback chains that read `display_name → handle → ...`
were the last places the auto-generated `c_<random>` handle could
leak into a user's view. Three call-sites cleaned (chat thread
author name, new-message email author name, intake confirmation
clientName). `AppContext.profile.handle` now carries a load-bearing
JSDoc rule documenting it as internal-only and pointing future
authors at the `display_name → id.slice(0, 8)` fallback shape.

### i18n cleanup (sub_09)

~95 keys per locale removed from the `onboarding` namespace. KO/EN
remain key-equivalent; JSON parses cleanly. The retained surface is
exactly the keys still consumed by code: `display_name` (settings
profile-form), `workspace_*` (8), `brand_*` (4), `invite_*` (5),
`done` (1).

### DB audit (sub_10)

1 row in `public.profiles` with `role='creator'` — clearly a test
artifact created today by yagi's Yonsei test account during sub_03
flow exercises (handle="handle", display_name="작품에 표기될 이름",
workspace="wefewfef"). 0 rows with `role='studio'`. No DB write
issued; cleanup paths documented in `_wave_c5b_sub10_db_audit.md`.

### Master docs (sub_11)

Two cache entries persisted — Q-094 (Brand-only persona, Phase 4-9)
and Q-095 (design system v1.0 globally applied) — plus a new
ARCHITECTURE.md §18 with the deletion list and v1.0 hard-rules
table. `PRODUCT-MASTER.md` was referenced by the prompt but does
not exist in this repo; nothing was created speculatively.

### Empty-state placeholder (sub_12)

Avatar cluster on `/app/projects` empty state restyled per yagi
decision (a) — placeholder for Phase 4 ship, real client logos
deferred to Phase 7+ (FU-C5b-03). 5 → 4 circles, 32 → 40px,
`bg-zinc-200/300` → `bg-card-deep + border-subtle`, `-ml-2` →
`-ml-2.5` overlap, social-proof copy `text-xs muted` → `text-sm
ink-tertiary leading-body`.

### Artist account HALTED (sub_13)

`profiles_role_check` constraint allows `{creator, studio,
observer, client}` only — no `'artist'`. The Wave C.5b prompt's
explicit halt-on-missing-enum branch was triggered. Builder
authored `scripts/create-artist-account.ts` (typed, idempotent,
service-role) and committed `_artist_account_created.md` with the
path-to-unblock checklist (Phase 5 entry CHECK-widening migration
→ Codex K-05 → apply → run script).

---

## Followups registered (in `_followups.md`)

- **FU-C5b-01** — Phase 5 Artist Roster intake surface (curated, not
  self-register). Trigger: Phase 5 entry.
- **FU-C5b-02** — yagi pastes branded email templates into Supabase
  Dashboard manually. Trigger: post-merge.
- **FU-C5b-03** — Phase 7+ swap "+50개 이상" placeholder cluster for
  real client brand marks (consent-bound).
- **FU-C5b-04** — Migrate `.font-display` from Fraunces to Redaction
  once the woff2 files are self-hosted under `/public/fonts/`.
- **FU-C5b-05** — `border-border` callsite sweep (264 across 100
  files) for the sub_00 dark-mode visual polish wave.
- **FU-C5b-06** — yagi adds `/auth/callback` + `/auth/expired` to
  the Supabase Dashboard Redirect URLs allowlist (prod + dev:3001
  + dev:3003).

---

## Verify

```
pnpm exec tsc --noEmit  → exit 0
pnpm lint               → exit 1 baseline (3155 errors, identical to Wave C.5a)
pnpm build              → exit 0 (Compiled successfully; middleware 161 kB)
```

Lint baseline transition during Wave C.5b:

- After sub_04: 3156 (one new error from a tautological `as` cast in
  signin/page.tsx)
- After sub_14 fix: 3155 (matches Wave C.5a baseline; the
  `as "/auth/expired"` literal-type cast was changed to `as const`
  per @typescript-eslint/prefer-as-const).

---

## Visual review checklist for yagi

When `pnpm dev` resumes, **walk every page below**. The dark
editorial flip in sub_00 was applied without per-page visual
verification — Wave A/B/C/C.5a surfaces were authored on light
P12, so any hardcoded `text-black`, `bg-white`, `text-zinc-*`
literal that landed during those waves may now read wrong. Log
findings to `_sub00_breakage_log.md`; Wave C.5c is reserved for
batch fixes.

- [ ] /ko/signin — dark editorial canvas, sage focus rings on inputs.
      Hash-fragment expired-OTP bounce to /auth/expired works.
- [ ] /ko/signup — same canvas; submit triggers transition to inline
      "check your email" view (sub_07 polish).
- [ ] /ko/auth/verify — direct URL renders v1.0 surface; with
      `?email=foo@bar.com` shows the recipient block.
- [ ] /ko/auth/expired — sage CTA, resend form, success-state card.
- [ ] /ko/onboarding/workspace — workspace_title="워크스페이스 만들기",
      workspace_slug="워크스페이스 주소", URL placeholder
      "your-workspace", non-ASCII name shows sage Korean warning.
- [ ] /ko/onboarding/brand — wordmark header, dark canvas, brand
      form unbroken.
- [ ] /ko/onboarding/invite — same chrome.
- [ ] /ko/app/dashboard — count cards + recent projects from C.5a
      now on dark.
- [ ] /ko/app/projects — empty state with the polished 4×40px
      circle cluster + sub_12 ink-tertiary social-proof line.
- [ ] /ko/app/projects/new — 3-step wizard.
- [ ] /ko/app/projects/[id] — detail page.
- [ ] /ko/app/meetings — empty state from C.5a.
- [ ] /ko/app/settings — three tabs (내 정보 / 워크스페이스 / 팀).
- [ ] /ko/app/notifications, /ko/app/inbox if surfaced.
- [ ] /ko/app/admin/* — yagi_admin only.
- [ ] /en parity for every surface above.
- [ ] /role direct URL access — should 404 (page deleted in sub_01).
- [ ] /u/<anything> direct URL access — should 404 (tree deleted).

Email flow (when artist@yagiworkshop.xyz can be created or another
test inbox is available):

- [ ] Sign up with a fresh email at /ko/signup.
- [ ] Email arrives with the YAGI-branded HTML (sub_06). NOT the
      default Supabase "Confirm your signup" template — assumes yagi
      pasted the HTML into the dashboard per FU-C5b-02 first.
- [ ] Click the link → `/auth/callback?code=...` → eventual
      `/ko/onboarding/workspace`. DevTools shows three
      `sb-<projectRef>-auth-token{,.0,.1}` cookies persisted.
- [ ] Click the same link **again** (now expired/consumed) → lands
      on `/ko/auth/expired` with the resend form.

---

## STOP — Wave D not entered

Wave C.5b is COMPLETE per the prompt's STOP point. **Wave D is NOT
entered**. yagi must:

1. Walk every surface in the visual checklist above. Findings →
   `_sub00_breakage_log.md` (the file does not exist yet — Builder
   only creates it lazily when a finding lands).
2. Decide between two paths after review:
   - **Wave C.5c** — additional fixes (visual breakage from sub_00,
     anything else surfaced during review).
   - **Wave D** — Codex K-05 + manual SQL verify + browser smoke +
     ff-merge to main (the L-027 BROWSER_REQUIRED final gate).
3. Trigger the chosen wave via Telegram / chat — Builder will not
   self-trigger.

`push 절대 X. ff-merge 절대 X.` (L-027 BROWSER_REQUIRED gate)
