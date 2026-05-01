# Wave C.5b sub_00 — ROLLBACK plan

**Trigger**: yagi visual-review verdict 2026-05-01 — "DARK MODE가 너무
보기에 좀 안좋은 것 같아. LIGHT MODE로 롤백하고 싶음."

**Scope**: revert the **bg flip** only (dark editorial → light editorial).
Keep the sage accent + ink hierarchy + token vocabulary alive on a
light canvas so the post-sub_00 surfaces (sub_03, sub_04, sub_07,
sub_12) that already consumed the new utility classes remain valid.

## Files in scope

`git show --stat ef4e9c1`:

| File | Strategy |
|---|---|
| `src/app/[locale]/layout.tsx` | **Restore** — `ThemeProvider` flips back to `defaultTheme="light"`, `enableSystem` re-enabled. |
| `src/app/globals.css` | **Manual rewrite** — `:root` returns to Phase 2.7.1 P12 light tokens; v1.0 raw `--ds-*` tokens kept but **light-adapted** so `.bg-card-deep`, `.ink-primary`, `.border-subtle`, etc. read sensibly on light bg. `.dark` mirrors the original Phase 2.7.1 dark mapping + adds dark variants for `--ds-*`. `.light` opt-in block removed (root IS light). |
| `tailwind.config.ts` | **Trim** — drop `ink`, `surface`, `edge`, `inverse` color families (zero current callsites; values were dark-mode-shaped). Keep `sage` family (mode-agnostic), the v1.0 type scale, motion tokens, radius scale, maxWidth, backdropBlur. |
| `.yagi-autobuild/phase-4-x/_sub00_visual_audit.md` | **Leave** — historical artifact of the original sub_00 push. The rollback plan + result amendments live separately. |

## Why not `git revert ef4e9c1`

`globals.css` and `tailwind.config.ts` were **modified** in sub_00, then
the post-sub_00 commits (sub_03 `accent-sage`, sub_04 `bg-card-deep` /
`border-subtle` / `rounded-card`, sub_07 `bg-sage` / `ink-primary` etc.,
sub_12 `bg-card-deep` / `border-subtle`) reference utility classes
**defined in** sub_00's `globals.css`. A pure revert would either (a)
conflict on globals.css/tailwind.config.ts, or (b) silently delete the
class definitions and break the post-sub_00 pages.

Manual rewrite is cleaner: keep the utility class **names**, swap the
**values** they reference to light-mode-compatible tokens.

## Sage on light — contrast notes

Sage `#71D083` ranks `~1.6:1` against pure white as text — fails WCAG
AA (needs 4.5:1). To preserve the v1.0 sole-accent rule on light bg,
the rewrite splits sage into two roles:

- `--ds-sage` = `#71D083` — used as **fill** (CTA bg, status pill bg).
  With near-black text on a 14px+ button this hits AA Large (~3:1).
- `--ds-sage-ink` = `#2D7A3F` (darker sage) — used for **text-on-light**
  in `.accent-sage` and any inline sage label. ~5.2:1 on white.

`.bg-sage` (sage fill + black text) stays for the resend-email CTA in
sub_07 + the sage status pill pattern. yagi must visually verify the
button reads OK; if not, fall back to the Phase 2.7.1 black-on-white
primary CTA pattern.

## Light-adapted v1.0 raw tokens

Mapped 1:1 with the dark variants but recoloured for light bg:

| Dark (sub_00) | Light (rollback) |
|---|---|
| `--ds-bg-base: #000000` | `--ds-bg-base: #FAFAFA` |
| `--ds-bg-raised: rgba(25,25,25,0.9)` | `--ds-bg-raised: rgba(255,255,255,0.96)` |
| `--ds-bg-card: rgba(255,255,255,0.10)` | `--ds-bg-card: rgba(0,0,0,0.04)` |
| `--ds-bg-card-deep: rgba(255,255,255,0.05)` | `--ds-bg-card-deep: rgba(0,0,0,0.025)` |
| `--ds-bg-scrim: rgba(0,0,0,0.35)` | `--ds-bg-scrim: rgba(255,255,255,0.35)` |
| `--ds-ink-primary: #EEEEEE` | `--ds-ink-primary: #0A0A0A` |
| `--ds-ink-secondary: #B4B4B4` | `--ds-ink-secondary: #5C5C5C` |
| `--ds-ink-tertiary: #7B7B7B` | `--ds-ink-tertiary: #8C8C8C` |
| `--ds-ink-disabled: rgba(238,238,238,0.33)` | `--ds-ink-disabled: rgba(10,10,10,0.33)` |
| `--ds-ink-muted: rgba(238,238,238,0.35)` | `--ds-ink-muted: rgba(10,10,10,0.35)` |
| `--ds-border-subtle: rgba(255,255,255,0.11)` | `--ds-border-subtle: rgba(0,0,0,0.08)` |
| `--ds-border-soft: rgba(255,255,255,0.06)` | `--ds-border-soft: rgba(0,0,0,0.04)` |
| `--ds-sage: #71D083` | `--ds-sage: #71D083` (unchanged) |
| `--ds-sage-soft: rgba(113,208,131,0.12)` | `--ds-sage-soft: rgba(113,208,131,0.18)` |
| (n/a) | `--ds-sage-ink: #2D7A3F` (NEW — text-on-light sage) |

## What untouched sub-tasks expect

- sub_01..02 — no globals.css / tailwind.config.ts dependency. Untouched.
- sub_03 — `accent-sage` text. Resolves to `var(--ds-sage-ink)` post-rollback. Darker sage on light → legible.
- sub_04 — `bg-card-deep border-subtle rounded-card` for the success-state card; `ink-secondary` text inside. All resolve to light-mode values.
- sub_07 — same set + `bg-sage` for the resend CTA + `accent-sage` for the footer hover state.
- sub_08..11 — no global-style changes. Untouched.
- sub_12 — `bg-card-deep border-subtle` for the avatar cluster + `ink-tertiary` for the social-proof line. Light-mode values render sensibly.
- sub_13..14 — no global-style changes. Untouched.

## Verify after rewrite

- `pnpm exec tsc --noEmit` exit 0
- `pnpm lint` baseline 3155 (matches Wave C.5a baseline)
- `pnpm build` exit 0
- A spot check of /ko/onboarding/workspace renders the sage warning
  legibly on light, /ko/auth/expired renders the success card
  legibly, /ko/app/projects empty state shows the placeholder
  cluster as faint dark hairline circles instead of the dark-mode
  white-on-white form.

## Documents to amend

- `_wave_c5b_result.md` — append "sub_00 ROLLBACK 2026-05-01" section.
- `DECISIONS_CACHE.md` Q-095 — amend the answer to record the
  rollback decision (light editorial + sage retained, dark editorial
  bg deferred).
- `ARCHITECTURE.md` §18.2 — same amendment.
- `_followups.md` — register the dark editorial as a future option.
- `_run.log` — append rollback line.
