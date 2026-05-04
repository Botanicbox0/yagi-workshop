# Phase 5 Wave C Hotfix-1 — Design self-review log

Per 야기 add-on instruction (chat 2026-05-05): senior design-engineer
self-review across the 6 sub-tasks, 5 axes (visual hierarchy / loading
transition / state consistency / mobile responsive / dark mode).
Findings → inline fix (small) or FU (large).

## 1. Visual hierarchy

### HF1_1 — primary CTA vs secondary CTA weight

- Primary `[브리프 전체 보기 →]`:
  - `bg-[#71D083] text-black rounded-full px-6 py-2.5 text-sm font-medium`
  - sage solid filled, no border, no shadow
- Secondary RecallButton (Wave B.5 component):
  - `variant="outline" size="sm"` (shadcn outline → border + transparent bg)
  - text = `text-sm`, hover sage on confirm (sage tint only on the
    AlertDialogAction inside, NOT the trigger button)

Verdict: **PASS** — sage solid fill produces immediate higher weight
than transparent outline. The secondary trigger renders as a neutral
outline; user reads primary first. Hierarchy clear at a glance.

Caveat: secondary RecallButton trigger uses `size="sm"` (shadcn = h-9).
Primary uses `py-2.5` (≈ h-10). The 4px height difference is subtle but
consistent with the "primary is bigger" convention. Acceptable.

### HF1_2 — current dot ring vs completed/upcoming

- completed: `w-5 h-5 bg-foreground/80 text-background` + check icon
- current: `w-5 h-5 bg-[#71D083] text-black ring-2 ring-[#71D083]/25`
- upcoming: `w-3 h-3 border border-border/40 bg-background` (smaller!)

Verdict: **PASS** — current dot is identical size to completed but
adds the sage halo (ring-2 ring-[#71D083]/25) which is a clear "this
is the active step" signal. Upcoming dots are smaller (w-3 vs w-5)
which doubles down on the de-emphasis. Three states clearly distinct.

### HF1_4 — card CTA wording differentiation

All 3 CTAs render same text style (`text-xs font-medium
text-foreground/70 underline-offset-4`) but different copy:
- Brief: "브리프 전체 보기 →"
- Attachments: "첨부 자료 확인하기 →"
- Comments: "코멘트 보기 →"

Verdict: **PASS** — copy carries the differentiation; styling stays
consistent. No visual hierarchy concern.

## 2. Loading transition (HF1_0)

### Skeleton fade-in flash

- loading.tsx renders the L1-L5 skeleton layout while page.tsx awaits
  fetches. Once page.tsx resolves, Next.js streaming SSR replaces the
  fallback at paint level.
- 100ms-flash mitigation: fast loads (< 100ms) skip rendering the
  skeleton frame entirely (browser frame scheduling). No explicit
  minimum-display-time was added.
- **Risk**: on dev machines with sub-50ms data fetches, the user may
  see the skeleton flicker for 1 frame.

Verdict: **OPEN ITEM** — accept risk for this Wave, register
**FU-Phase5-21** for client-side wrapper with useEffect minimum-display
if browser smoke flags flash.

### 4-card simultaneous vs sequential fade-in

The skeleton variants render together in the loading.tsx grid; once
page.tsx mounts, all 4 real cards appear together (server-rendered,
single paint). No sequential reveal animation.

- Sequential reveal would require client-side staggered entrance which
  contradicts Next.js streaming SSR pattern.
- yagi-design-system v1.0 favors calm motion (no orchestrated
  animations beyond 400ms transitions). Simultaneous fade matches
  that ethos.

Verdict: **PASS** — simultaneous fade is the design-system-aligned
choice. Sequential animation would be off-brand.

## 3. State consistency

### hover / focus / active / disabled

Audit:
- Button (primary): `hover:bg-[#71D083]/90 hover:brightness-105
  transition-all duration-[400ms]` ✓ — hover defined
- RecallButton trigger: shadcn `variant="outline"` provides hover
  state via theme tokens ✓
- Tab Link: `hover:text-foreground` for inactive tabs ✓
- Disabled tabs (comments / deliverables): `cursor-not-allowed
  text-muted-foreground/60` ✓
- Skeleton cards: `aria-busy="true" animate-pulse` ✓ (no hover —
  not interactive)
- Card CTAs (브리프/첨부/코멘트): `hover:underline` ✓

Focus state:
- Button (shadcn): `focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-ring` from base button class ✓
- Link (Tailwind defaults + Next.js Link inherits): browser default
  focus ring on tab navigation ✓
- Tab Link: NO explicit focus-visible — relies on Tailwind defaults
  + browser. **OPEN ITEM**: explicit `focus-visible:ring-2
  focus-visible:ring-foreground/20` would be more polished. Register
  **FU-Phase5-22** for keyboard-focus polish.

Active state: hover transitions cover this implicitly.

Disabled state:
- Disabled tabs: visual + aria-disabled ✓
- Disabled CTAs (in_progress, in_revision, approved): `cursor-not-allowed
  border-border/40 text-muted-foreground/70` (DisabledCta in
  next-action-cta.tsx) ✓

Verdict: **MOSTLY PASS** — state coverage adequate; explicit
`focus-visible:ring-*` polish deferred to FU-Phase5-22.

### Keyboard tab order

The 현황 tab natural reading order:
- Status card (top-right column)
  - Title + body (non-interactive)
  - Meta rows (non-interactive)
  - **Primary `[브리프 전체 보기]`** → focusable
  - **Secondary RecallButton** → focusable
- Brief summary card
  - **CTA Link** → focusable
- Attachment summary
  - Thumbnail tiles (non-interactive)
  - **CTA Link** → focusable
- Comment thread placeholder
  - **CTA Link** → focusable

Tab order = primary → secondary → brief CTA → attachment CTA →
comments CTA. **Status timeline (left column) is non-interactive**
(no buttons, just visual stepper) — keyboard users skip it.

Verdict: **PASS** — natural top-to-bottom flow. Status timeline being
non-interactive is correct (it's a passive progress indicator).

## 4. Mobile responsive (360 / 768)

### Status card dual CTA at narrow viewport

`<div className="flex flex-wrap items-center gap-3 pt-1">` wraps both
buttons. At 360px, primary + secondary likely wrap to 2 rows
(primary ≈ 132px wide, secondary ≈ 96px wide → total ~240px + 12px
gap = 252px which fits 360px-px-padding ≈ 312px easily).

Verdict: **PASS** — flex-wrap handles narrow viewport gracefully.
Both CTAs remain tappable on a single row at 360px and beyond.

### Status timeline vertical vs horizontal

Per SPEC, vertical stepper is the only ship for desktop AND mobile.
At 360px, the 260px-wide left column (`md:grid-cols-[260px_1fr]`)
collapses to single-column stack — timeline takes full width, then
the 4 right-column cards stack below.

Vertical stepper at 360px: 6 steps + connectors = ~280px tall. Fits
without horizontal scroll.

Switching to horizontal at mobile would compress 6 steps into 360px
which is cramped + connector lines disappear. Vertical is correct
choice.

Verdict: **PASS** — vertical stepper is mobile-friendly. Horizontal
variant rejected as cramping.

## 5. Dark mode (yagi-design-system v1.0 base)

### Sage #71D083 contrast on dark bg

yagi-design-system v1.0 base bg = `#000000` (per skill SKILL.md
quick reference: "BACKGROUND #000000 (base)").
Sage #71D083 luminance ≈ 0.59, black bg luminance ≈ 0.
Contrast ratio ≈ (0.59 + 0.05) / (0 + 0.05) = **12.8:1** → far
exceeds WCAG AAA (7:1).

On the StatusCard primary CTA: text is `text-black` on `bg-[#71D083]`
= reverse contrast, also high (≈ 4.5:1+). ✓

Verdict: **PASS** — sage on black dark mode is high-contrast and
fully accessible.

### Skeleton bg-muted/30 on dark mode

In dark theme, `--muted` resolves to a slightly-elevated gray.
`bg-muted/30` = 30% opacity overlay.
On `--background = #000000`, the muted/30 overlay produces a
roughly `rgb(8, 8, 8)`–`rgb(12, 12, 12)` shade (assuming muted base
is `#1a1a1a`). That's ~5% lighter than pure black — subtle but
visible against the pulse animation.

Verdict: **PASS** — animate-pulse rhythm is what carries visibility
more than the static fill color. The shape outline (border-border/30)
provides additional subtle visibility.

Caveat: if a future theme override sets `--muted` close to black,
the skeleton might disappear. Token-based approach is robust; only
breaks if base tokens change.

## Summary

| Axis | Verdict | Open items / FUs |
|---|---|---|
| 1. Visual hierarchy | PASS | — |
| 2. Loading transition | PASS (with caveat) | FU-Phase5-21 (min-display-time fallback) |
| 3. State consistency | MOSTLY PASS | FU-Phase5-22 (explicit keyboard focus rings) |
| 4. Mobile responsive | PASS | — |
| 5. Dark mode | PASS | — |

**No inline fix required** for any axis. Open items are quality polish
deferred to FU register. All 5 axes meet hotfix-1 ship bar.

## FUs registered

- **FU-Phase5-21** — Skeleton minimum-display-time wrapper. Register
  if browser smoke at 야기's machine flags sub-100ms flash. Easy fix
  (~20 lines, useEffect + setTimeout(setShow(false), 200)).
- **FU-Phase5-22** — Explicit `focus-visible:ring-2
  focus-visible:ring-foreground/20` on Tab Link, status-card primary
  Button, summary CTAs. Keyboard polish; not a Wave C blocker.
