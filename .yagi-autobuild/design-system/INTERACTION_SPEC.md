# INTERACTION_SPEC.md
Version: 1.0
Owner: Design System
Platform: Webflow (primary), portable to Next.js
Scope: Product UI / Marketing UI / CMS-driven interfaces
Aesthetic direction: White editorial — see `PRINCIPLES.md`
Companion: `COMPONENT_CONTRACTS.md`, `TYPOGRAPHY_SPEC.md`, `DESIGN_REVIEW.md`

---

## 1. Purpose

This document defines how things move.

It is not a list of fancy animations. It is a contract that decides:

- which durations and easings exist (and which do not)
- how every state transition is timed
- how components appear and disappear
- how feedback is signaled
- how motion respects user preferences
- how motion is built so it does not cost performance

If a screen has motion not described here, that motion is wrong.

---

## 2. Core principles

### 2.1 Motion is communication
Movement signals causality, hierarchy, or change of state. If motion does not communicate something, it is decoration and is removed.

### 2.2 Less, faster, intentional
Most interactions feel best at 150–250ms. We default to **fast**. Slower motion is reserved for entrances of large surfaces (modals, sheets) where slower arrival reduces visual shock.

### 2.3 Two properties only
The vast majority of motion uses `transform` and `opacity`. These are GPU-composited and do not trigger layout. Animating `width`, `height`, `top`, `left`, or `margin` is forbidden except in narrow documented cases (see §9).

### 2.4 Tokens, not magic numbers
Every duration, easing, and displacement value comes from a token. A `transition: all 350ms ease-in-out` written inline by a Builder fails Design Review.

### 2.5 Respect the user
`prefers-reduced-motion` is not optional. It is the default for many users with vestibular sensitivity, and it is the right behavior for everyone in a focused product context. See §7.

---

## 3. Motion tokens

### 3.1 Duration

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0ms | State changes that should feel immediate (focus appearing, selected state on click) |
| `duration-fast` | 100ms | Hover, active, small property changes (color, opacity) |
| `duration-normal` | 200ms | Standard component transitions (button press, accordion expand, dropdown open) |
| `duration-slow` | 300ms | Larger surface entrances (modal, drawer, sheet, toast) |
| `duration-extra-slow` | 500ms | Page-level transitions only |

We do not provide values above 500ms. If a transition seems to need more time, the design is wrong — break it into stages instead.

### 3.2 Easing

| Token | CSS value | Use |
|---|---|---|
| `ease-linear` | `linear` | Progress bars, scrubbing, things tied to time |
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Default for entrances** — fast start, gentle settle |
| `ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | **Default for exits** — gentle start, fast departure |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | State changes that stay on screen (toggle, expand) |
| `ease-spring` | `cubic-bezier(0.5, 1.5, 0.5, 1)` | Reserved — feedback overshoot only (drag-snap, pull-to-refresh) |
| `spring-natural` | JS spring; `{stiffness: 80, damping: 22, mass: 0.9}` | **Layout-changing transitions only** (aspect-ratio swaps, cross-fades between layout states) — see §10. CSS-only equivalent does not exist; requires Framer Motion or equivalent. |

Forbidden: `ease`, `ease-in-quad`, custom one-off bezier curves outside this table. A new easing requires an ADR.

### 3.3 Displacement

| Token | Value | Use |
|---|---|---|
| `motion-distance-xs` | 4px | Subtle hover lift, cursor follow |
| `motion-distance-sm` | 8px | Tooltip enter, dropdown enter |
| `motion-distance-md` | 16px | Toast enter, drawer hint |
| `motion-distance-lg` | 32px | Modal enter, sheet enter |

Direction is per-component (see §4). Distance is from this scale only.

---

## 4. State transition timing per primitive

This table is authoritative. Builders consult it directly.

| Primitive | Property | Token | Easing |
|---|---|---|---|
| Hover (color, bg, border) | `color`, `background-color`, `border-color` | `duration-fast` | `ease-out` |
| Hover (transform lift) | `transform` | `duration-normal` | `ease-out` |
| Focus ring appear | `box-shadow`, `outline` | `duration-instant` | n/a |
| Active (press) | `transform: scale(0.98)` | `duration-fast` | `ease-in-out` |
| Disabled toggle | `opacity` | `duration-fast` | `ease-out` |
| Loading replace (button label → spinner) | `opacity` cross-fade | `duration-fast` | `ease-in-out` |
| Selected toggle | `background-color`, icon `opacity` | `duration-fast` | `ease-out` |
| Checkbox/radio check | `transform: scale`, stroke draw | `duration-normal` | `ease-out` |
| Tooltip enter | `opacity`, `transform translateY(motion-distance-sm)` | `duration-normal` | `ease-out` |
| Tooltip exit | `opacity` | `duration-fast` | `ease-in` |
| Dropdown / popover enter | `opacity`, `transform translateY(motion-distance-sm)` | `duration-normal` | `ease-out` |
| Dropdown / popover exit | `opacity` | `duration-fast` | `ease-in` |
| Toast enter | `opacity`, `transform translateY(motion-distance-md)` | `duration-slow` | `ease-out` |
| Toast exit | `opacity`, `transform translateY(-motion-distance-sm)` | `duration-normal` | `ease-in` |
| Modal overlay enter | `opacity` (0 → 0.6) | `duration-normal` | `ease-out` |
| Modal panel enter | `opacity`, `transform translateY(motion-distance-lg)` | `duration-slow` | `ease-out` |
| Modal exit (both) | `opacity` | `duration-normal` | `ease-in` |
| Drawer / sheet enter | `transform translateX/Y(100%)` → 0 | `duration-slow` | `ease-out` |
| Drawer / sheet exit | reverse | `duration-normal` | `ease-in` |
| Accordion expand | `height` *(documented exception, §9)* | `duration-normal` | `ease-in-out` |
| Tab indicator slide | `transform translateX` | `duration-normal` | `ease-out` |
| Page transition | `opacity` | `duration-extra-slow` | `ease-in-out` |

### 4.1 Why entrances are slower than exits
A user notices something appearing more than they notice it disappearing. Entrances earn the user's attention; exits get out of the way. Standard ratio: exit ≈ 60–70% of entrance duration.

### 4.2 Why focus rings are instant
A focus ring with delay reads as a separate visual event from the user's action. Instant focus rings feel attached to the keypress. This is the only exception to the "no instant transitions" instinct.

---

## 5. Microinteractions

### 5.1 Click / tap feedback
Every interactive element provides immediate visual feedback within `duration-fast`. Acceptable patterns:

- `transform: scale(0.98)` on press
- background-color shift via active state
- focus ring (already instant per §4)

A click with no feedback within 100ms reads as broken, even if the underlying action is fine.

### 5.2 Drag feedback
- pickup: cursor change + slight scale (1.02), `duration-fast`
- drag: element follows pointer with no easing (1:1)
- snap: `ease-spring` if snapping to grid; otherwise `ease-out`
- drop: target highlight fades over `duration-normal`

### 5.3 Form validation feedback
- inline error appears via `opacity` + `motion-distance-xs` translate, `duration-normal`, `ease-out`
- field shake on submit-with-error: forbidden (anti-pattern, see §10)
- success state: subtle, `duration-fast` color change only — do not draw checkmarks unless space allows

### 5.4 Selection feedback
- single click: state changes within `duration-fast`
- multi-select drag: each item state changes as cursor enters its bounds, no per-item delay
- "select all" toggling 100+ items: stagger forbidden — change all at once or change none

### 5.5 Hover discoverability
On non-touch devices, hover may reveal secondary actions (e.g., row actions on a table row). Reveal uses `opacity` only, `duration-fast`, `ease-out`. Action positions never reflow on hover.

---

## 6. Loading transitions

Detailed loading-state behavior is owned by `COMPONENT_CONTRACTS.md §11`. This document specifies only the **timing rules** for loading visuals:

- Skeleton fade-in: `opacity` 0 → 1, `duration-normal`, `ease-out`
- Skeleton fade-out (data arrived): `opacity` 1 → 0, `duration-fast`, `ease-out`
- Real content fade-in: `opacity` 0 → 1, `duration-fast`, `ease-out`, **after** skeleton fade-out completes
- Spinner rotation: `duration-extra-slow` (500ms per cycle), `ease-linear`, infinite
- Progress bar fill: `ease-out` if duration is known, `ease-linear` if continuous

Stagger between skeleton fade-out and real content fade-in: 50ms maximum. Longer staggers feel like the page is making the user wait.

---

## 7. Reduced motion

When `prefers-reduced-motion: reduce` is set:

| Behavior | What happens |
|---|---|
| Translate/scale animations | Removed; element appears at final position with opacity fade only |
| Opacity fades | Kept, but durations capped at `duration-fast` (100ms) |
| Spinner rotation | Replaced with static "Loading…" text |
| Skeleton pulse | Replaced with solid muted background, no pulse |
| Page transitions | Removed entirely; instant route swap |
| Spring/overshoot easings | Replaced with `ease-out` linear-feel |

Implementation pattern (CSS):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 100ms !important;
    scroll-behavior: auto !important;
  }
}
```

Then re-enable opacity transitions selectively where they are functional.

Builders must test every screen with reduced motion enabled — see DESIGN_REVIEW.md for the verification step.

---

## 8. Performance constraints

### 8.1 Animatable properties
Allowed without justification:
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (sparingly, see §8.2)
- `box-shadow` for hover lifts (acceptable trade-off)

Forbidden without an ADR:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `border-width`
- `font-size`

These trigger layout, paint, or both, and produce jank above 60fps.

### 8.2 Filter cost
`filter: blur()` is expensive. Use it only on:
- modal overlays (one element, briefly)
- hover preview blurs (single element, low blur radius ≤ 8px)

Do not animate `backdrop-filter` — start blurred or end blurred, never animate the radius.

### 8.3 Will-change
`will-change` is applied only on elements that are about to animate, and removed after. Permanent `will-change` consumes memory and can degrade performance.

```css
.modal-panel {
  /* applied via JS just before opening */
  will-change: transform, opacity;
}
.modal-panel.is-open {
  /* removed via JS after transition end */
  will-change: auto;
}
```

### 8.4 60fps test
Every animation must hold 60fps on a 2019-era mid-range laptop (the closest approximation to a typical client laptop). If an animation drops frames there, the design is wrong, not the laptop.

---

## 9. Documented exceptions

These are the *only* cases where layout-triggering or large-surface motion is acceptable. Adding to this list requires an ADR.

### 9.1 Accordion height
`height` animation on accordion expand/collapse is permitted because no GPU-accelerated equivalent preserves natural content flow. Use `height: auto` calculation via JS (or `grid-template-rows: 0fr → 1fr` modern technique) with `duration-normal`, `ease-in-out`.

### 9.2 Auto-resizing textarea
`height` animation on textarea growing as user types is permitted. Capped at 10 lines maximum.

### 9.3 Drawer width on resize
Width animation when user drags a panel divider is permitted (real-time resize, not transition).

---

## 10. Layout-changing transitions (v0.2.0)

This section codifies a class of motion introduced in Phase 2.9 (Projects hub editorial redesign). It is the only documented case where layout-affecting properties — specifically `aspect-ratio` and intrinsic size — are animated, and it requires a JS animation engine because CSS has no GPU-accelerated path for it.

### 10.1 When this applies

A layout-changing transition is appropriate when:

- A photographic or content surface needs to swap between two intrinsic ratios (e.g., 1:1 ↔ 5:2) as part of a hover or focus interaction.
- The transition between layouts is itself communication — it is the moment that signals causality between the user's input and the visual response.
- The surface is on a marketing-adjacent or editorial product surface where motion earns the user's attention (hero, hub, landing).

It is **not** appropriate for general application UI (forms, tables, dialogs). Standard `duration-*` + `ease-*` tokens cover those.

### 10.2 Implementation pattern

The canonical implementation uses Framer Motion's `<motion.div layout>`:

```tsx
<motion.div
  layout
  transition={{ type: "spring", stiffness: 80, damping: 22, mass: 0.9 }}
  className="w-full"
  style={{ aspectRatio: isExpanded ? "5 / 2" : "1 / 1" }}
>
  {/* photographic content */}
</motion.div>
```

The `spring-natural` token (§3.2) is the only spring config approved for this pattern. A different stiffness/damping pair requires an ADR.

### 10.3 When to use spring vs duration-based easing

| Situation | Use |
|---|---|
| Element changing **layout dimension** (aspect-ratio, intrinsic size, position within parent) | `spring-natural` via `<motion.div layout>` |
| Element changing **transform or opacity only** (translate, scale, fade) | `duration-*` + `ease-*` from §3.1 / §3.2 |
| Drag-snap feedback overshoot | `ease-spring` cubic-bezier (§3.2) |
| Anything ambient (skeleton pulse, spinner, scroll-tied) | linear / `ease-out` per existing tables |

The split is principled: spring physics produces a natural-feeling settle when the *target value itself* is changing per render (layout). Duration-based easing produces a controlled, predictable timing when the property is binary (open ↔ closed). Mixing them — e.g., a spring on a modal panel — is forbidden.

### 10.4 Image cross-fade with `AnimatePresence`

When the surface swap also replaces the image content, cross-fade with `AnimatePresence mode="wait"` so only one image is mounted at a time:

```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.img
    key={activeIndex}
    src={images[activeIndex]}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
  />
</AnimatePresence>
```

Cross-fade duration uses `duration-normal` (200ms) and `ease-out`, not the spring. The spring governs the *frame* (aspect ratio); the easing governs the *content* (image swap). They run concurrently.

### 10.5 Reduced motion

Layout-changing transitions skip entirely under `prefers-reduced-motion: reduce`. The element jumps to its final layout with no spring; the image cross-fade collapses to a 100ms opacity fade per §7. Framer Motion respects `prefers-reduced-motion` automatically when `MotionConfig` is configured at the app root, but Builders MUST verify per-screen during DESIGN_REVIEW.

### 10.6 Hover gating

Layout-changing transitions are triggered only on devices that report `@media (hover: hover)`. On touch devices, the surface defaults to its expanded (or most informative) state on first paint and does not animate on tap — tapping should perform the underlying action (link follow, selection), not toggle visual state.

```tsx
// CSS-side guard (component classNames)
className="hover:[&_*]:cursor-pointer @media(hover:hover)"
```

The Framer Motion `whileHover` prop is naturally hover-gated; it does not fire on touch. The CSS guard is for any non-Framer hover reveals on the same surface.

### 10.7 Performance budget

A single layout-changing surface per viewport. Two simultaneous spring-driven layout animations on screen at the same time fail the 60fps test on baseline hardware (§8.4). If the design needs more than one, stage them — only one animates at a time, the other(s) remain at their resting layout.

### 10.8 Component contract

Layout-changing transitions are intrinsically client-side (Framer Motion is a Client Component). The contract is recorded under the relevant component in `COMPONENT_CONTRACTS.md` (e.g., `InteractiveVisualStack`). Any new component that uses this pattern MUST register its contract there before merge.

---

## 11. Anti-patterns (motion-specific)

The patterns below are global motion failures. Cross-cutting visual anti-patterns live in `ANTI_PATTERNS.md`.

- **Field shake on validation error** — punishes the user for an error the system caused (or for a typo). Use color and inline message instead.
- **Bounce-in on every appearance** — overshoot on entrance trains users to wait for things to "settle." Reserved for spring-snap interactions only (§3.2) and layout-changing transitions (§10).
- **Spinner rotation slower than 500ms/cycle** — reads as broken
- **Spinner rotation faster than 500ms/cycle** — reads as urgent / panic
- **Animating opacity 0 → 1 over 1000ms+** — feels broken; users assume the page is slow
- **Page transition every route** — accumulates fatigue. Use only on top-level route changes, never on tab/inner navigation.
- **Parallax on product UI** — belongs to marketing surfaces only, and even there sparingly
- **Auto-playing motion** (carousels, banner rotation) — interrupts reading, fails accessibility. If used, must include pause control.
- **Hover reveal that shifts layout** — content must not move when revealing secondary actions
- **Animating route/tab indicator longer than 200ms** — slows down power users
- **Easing reversal mid-animation** — picking a different easing for forward vs. backward (e.g., expand uses ease-out, collapse uses ease-in) feels glitchy. Use `ease-in-out` or matching easings.
- **Animating `display: none`** — does not animate; either use `visibility` + `opacity` or unmount via JS

---

## 12. Webflow implementation

### 12.1 Tokens
Motion tokens live in a single Webflow Variables collection: **Motion**.

Subgroups:
- `duration/` (instant, fast, normal, slow, extra-slow)
- `easing/` (linear, out, in, in-out, spring)
- `distance/` (xs, sm, md, lg)

`spring-natural` (§3.2 / §10) is JS-only and has no Webflow representation. Layout-changing transitions are an in-product (Next.js) pattern; they are not authored in Webflow.

### 12.2 Webflow's built-in interactions
Webflow Interactions (IX2) is acceptable for:
- hover state transitions
- scroll-triggered fades
- modal/drawer enter/exit

Webflow Interactions is **not** acceptable for:
- form validation feedback (use code, not IX2)
- complex state machines
- anything requiring `prefers-reduced-motion` branching (IX2 does not support this natively — wrap in conditional class)
- layout-changing transitions (§10) — JS-only, Next.js side

### 12.3 Custom CSS / JS
Component states that need precise timing should use CSS transitions over IX2 because:
- CSS transitions respect `prefers-reduced-motion` automatically
- Inspector shows actual values
- Designer/Builder handoff is unambiguous

### 12.4 Editor exposure
Motion is **not** an editor-controllable property. Components do not expose duration, easing, or animation toggles. Motion is part of the component contract, controlled by the design system.

---

## 13. QA checklist

A motion implementation is ready only if:

- All durations come from `duration-*` tokens
- All easings come from `ease-*` tokens (or `spring-natural` for layout-changing transitions per §10)
- All displacements come from `motion-distance-*` tokens
- No animation of `width`, `height`, `top`, `left`, `margin`, `padding` (except documented exceptions in §9 and layout-changing transitions in §10)
- Hover transitions complete within `duration-fast`
- Modal/drawer entrances use `duration-slow` with `ease-out`
- Modal/drawer exits use `duration-normal` with `ease-in`
- Focus rings are instant
- `prefers-reduced-motion` reduces or removes motion as specified in §7 and §10.5
- No spinner spins faster or slower than 500ms/cycle
- No layout shift during loading state transitions
- At most one spring-driven layout transition visible per viewport (§10.7)
- 60fps held on baseline hardware
- No `will-change` left on elements after animation completes

---

## 14. Reference cross-links

- State enumeration per component → `COMPONENT_CONTRACTS.md §9`
- Loading state behavior per component → `COMPONENT_CONTRACTS.md §11`
- Visual review checkpoints (motion section) → `DESIGN_REVIEW.md`
- Cross-cutting anti-patterns (visual / process) → `ANTI_PATTERNS.md`
- Workflow gates and motion review → `ARCHITECTURE.md`
