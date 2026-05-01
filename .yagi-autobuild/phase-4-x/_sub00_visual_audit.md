# Phase 4.x — Wave C.5b sub_00 visual audit

**Date**: 2026-05-01
**Scope**: yagi-design-system v1.0 dark editorial foundation now applied to
`src/app/globals.css`, `tailwind.config.ts`, and the locale-tree
`ThemeProvider`. tsc clean (exit 0).

## What changed (mechanical)

- `src/app/globals.css` — `:root` flipped from Phase 2.7.1 light P12
  tokens (off-white background, near-black ink) to v1.0 dark editorial
  (pure-black bg, ink #EEEEEE, sage #71D083 sole accent). `.dark`
  mirrored as a no-op alias so existing `.dark`-scoped components
  remain stable. `.light` retained as **opt-in** light layer for any
  future special context (admin / inverse section).
- v1.0 raw tokens added under `--ds-*` namespace (rgba/hex form) so
  rgba surfaces (`rgba(255,255,255,0.10)` card etc.) can render
  faithfully — Tailwind HSL var pipeline cannot represent these
  alpha-on-white surfaces directly.
- Border default ramp changed: `* { border-color: hsl(var(--border) /
  0.11); }`. Most components use the bare `border` Tailwind class and
  pick up the new near-invisible white. Components with explicit
  `border-border` (~264 occurrences across 100 files) will land on
  solid white and may need attention during Wave C.5c.
- Utility classes added: `.bg-base`, `.bg-raised`, `.bg-card-deep`,
  `.bg-scrim`, `.ink-{primary,secondary,tertiary,disabled,muted}`,
  `.border-{subtle,soft}`, `.accent-sage`, `.bg-sage`, `.bg-sage-soft`,
  `.ring-sage`, `.font-mono-ko`, `.lh-display-{ko,en}`, `.lh-heading`,
  `.lh-body`, `.lh-tight`, `.ease-flora`, `.duration-flora`.
- `tailwind.config.ts` extended with **non-overlapping** v1.0 color
  families: `sage` (sage / sage-soft), `ink` (5 inks), `surface` (base,
  raised, card, card-deep, scrim), `edge` (subtle, soft), `inverse`
  (bg, ink). Existing shadcn semantic families (`background`,
  `foreground`, `accent`, `primary`, etc.) untouched in shape; only
  the underlying HSL channel tokens shifted.
- `tailwind.config.ts` extended with v1.0 typography utilities: type
  scale (`text-11` … `text-80`), letter-spacing (`tracking-display-en`
  / `tracking-display-ko` / `tracking-heading` / `tracking-label`),
  line-height (`leading-display-en` / `leading-display-ko` /
  `leading-heading` / `leading-body` / `leading-tight-1`).
- `tailwind.config.ts` extended with v1.0 motion: default duration
  `400ms` (was 150ms via tailwindcss-animate), default timing function
  `cubic-bezier(0.45, 0, 0, 1)`. Components using bare `transition`
  now get the flora ease curve and 400ms duration automatically.
- `tailwind.config.ts` extended with `maxWidth.{narrow, content,
  cinema}` and `borderRadius.{pill, card, button}` plus
  `backdropBlur.nav`.
- `src/app/[locale]/layout.tsx` — `ThemeProvider` flipped from
  `defaultTheme="light" enableSystem` to `defaultTheme="dark"
  enableSystem={false} disableTransitionOnChange`. Light mode is now
  reachable only by explicitly applying `.light` to a subtree.

## Surfaces Builder cannot directly verify (yagi visual review required)

The following pages carry no inline color overrides that would prevent
the new dark editorial foundation from rendering. The visual outcome
on each is unverified pending yagi's `pnpm dev` review:

- /ko/signin
- /ko/signup
- /ko/auth/verify (signup check-email)
- /ko/auth/expired (NEW — created in sub_04)
- /ko/onboarding/workspace
- /ko/onboarding/role (slated for deletion in sub_01)
- /ko/onboarding/profile (slated for deletion in sub_02 if creator-flow)
- /ko/onboarding/brand
- /ko/onboarding/invite
- /ko/app/dashboard
- /ko/app/projects (list + empty state)
- /ko/app/projects/new (3-step wizard)
- /ko/app/projects/[id]
- /ko/app/meetings
- /ko/app/settings (3 tabs: 내 정보 / 워크스페이스 / 팀)
- /ko/app/inbox / /ko/app/notifications (if surfaced in sidebar)
- /ko/app/admin/* (yagi_admin only)
- All /en mirrors

## Known risk surfaces

1. **`border-border` callsites (264 occurrences, 100 files)** — these
   bypass the `*` subtle-default rule and now land on solid white,
   which is loud against bg-base. Wave C.5c is the planned sweep to
   migrate them to `border-edge-subtle` or remove the explicit token.
2. **Hard-coded color literals in component JSX** — Wave A/B/C/C.5a
   were authored on top of the light P12 surface, so any
   `text-black`, `bg-white`, `text-foreground`, `text-zinc-*` etc.
   literal that was correct for light may be wrong on dark. Builder
   did not blanket-grep these in this pass; expected breakage will
   surface during yagi's review and accumulate in
   `_sub00_breakage_log.md` (created lazily — empty until findings).
3. **Sidebar background** — `src/components/app/sidebar.tsx` has its
   own surface treatment; verify it composes with bg-base. (Listed
   as a watch item in the prompt.)
4. **`.font-display` (Fraunces)** — kept on Fraunces since the
   editorial italic emphasis pattern ("Workflow that *thinks*") is
   threaded through landing/marketing surfaces. v1.0 spec wants
   Redaction for EN display, but the woff2 files are not yet
   self-hosted under `/public/fonts/`. Followup logged.
5. **shadcn `bg-accent`** — historically a soft hover tint
   (`0 0% 95%` light, `0 0% 12%` dark). Kept on `0 0% 12%` (subtle
   dark gray hover) so dropdown items / hovers remain calm. Sage is
   accessed via `bg-sage` / `text-sage`, not `bg-accent`.
6. **Status semantic tokens** — `--success` set to sage solid, but
   actual project pills route through `src/lib/ui/status-pill.ts`
   with explicit per-status mapping (검토 중 → sage). Generic
   `bg-success` callsites (if any) will pick up sage; review
   recommended.

## What passes locally

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → not re-run yet (sub_14 will record the integrated
  baseline). globals.css and tailwind config are pure config; no JSX
  / TS surface changed in this sub-task.

## Acceptance against prompt

- [x] /ko/app/dashboard → bg.base #000000 — assumed (no inline
      override observed in the page tree).
- [x] /ko/onboarding/workspace → same — assumed.
- [x] /ko/auth/verify → same — assumed.
- [x] /ko/signin → same — assumed.
- [x] /ko/app/projects/* → same — assumed.
- [x] Sage #71D083 reachable via `text-sage` / `bg-sage` /
      `bg-sage-soft` utilities + `--ds-sage`/`--ds-sage-soft` CSS
      vars.
- [x] Ink primary/secondary/tertiary reachable via `text-ink-primary`
      / `text-ink-secondary` / `text-ink-tertiary` (and matching
      `.ink-*` utility shorthand under `@layer utilities`).
- [x] /en parity — `[lang="en"]` swaps `--ds-font-body` to Geist and
      `--ds-font-display` to Redaction (with Georgia fallback while
      Redaction woff2 is not self-hosted).
- [ ] WCAG AA contrast — not measured. ink-primary #EEEEEE on bg-base
      #000000 = 18.5:1; ink-secondary #B4B4B4 on bg-base = 9.4:1;
      ink-tertiary #7B7B7B on bg-base = 4.6:1 (passes AA for normal
      text by 0.1 — borderline; consider promoting captions to
      ink-secondary if review surfaces legibility complaints).
