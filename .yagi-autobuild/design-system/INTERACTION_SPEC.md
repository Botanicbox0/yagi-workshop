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

## 10. Anti-patterns (motion-specific)

The patterns below are global motion failures. Cross-cutting visual anti-patterns live in `ANTI_PATTERNS.md`.

- **Field shake on validation error** — punishes the user for an error the system caused (or for a typo). Use color and inline message instead.
- **Bounce-in on every appearance** — overshoot on entrance trains users to wait for things to "settle." Reserved for spring-snap interactions only (§3.2).
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

## 11. Webflow implementation

### 11.1 Tokens
Motion tokens live in a single Webflow Variables collection: **Motion**.

Subgroups:
- `duration/` (instant, fast, normal, slow, extra-slow)
- `easing/` (linear, out, in, in-out, spring)
- `distance/` (xs, sm, md, lg)

### 11.2 Webflow's built-in interactions
Webflow Interactions (IX2) is acceptable for:
- hover state transitions
- scroll-triggered fades
- modal/drawer enter/exit

Webflow Interactions is **not** acceptable for:
- form validation feedback (use code, not IX2)
- complex state machines
- anything requiring `prefers-reduced-motion` branching (IX2 does not support this natively — wrap in conditional class)

### 11.3 Custom CSS / JS
Component states that need precise timing should use CSS transitions over IX2 because:
- CSS transitions respect `prefers-reduced-motion` automatically
- Inspector shows actual values
- Designer/Builder handoff is unambiguous

### 11.4 Editor exposure
Motion is **not** an editor-controllable property. Components do not expose duration, easing, or animation toggles. Motion is part of the component contract, controlled by the design system.

---

## 12. QA checklist

A motion implementation is ready only if:

- All durations come from `duration-*` tokens
- All easings come from `ease-*` tokens
- All displacements come from `motion-distance-*` tokens
- No animation of `width`, `height`, `top`, `left`, `margin`, `padding` (except documented exceptions in §9)
- Hover transitions complete within `duration-fast`
- Modal/drawer entrances use `duration-slow` with `ease-out`
- Modal/drawer exits use `duration-normal` with `ease-in`
- Focus rings are instant
- `prefers-reduced-motion` reduces or removes motion as specified in §7
- No spinner spins faster or slower than 500ms/cycle
- No layout shift during loading state transitions
- 60fps held on baseline hardware
- No `will-change` left on elements after animation completes

---

## 13. Reference cross-links

- State enumeration per component → `COMPONENT_CONTRACTS.md §9`
- Loading state behavior per component → `COMPONENT_CONTRACTS.md §11`
- Visual review checkpoints (motion section) → `DESIGN_REVIEW.md`
- Cross-cutting anti-patterns (visual / process) → `ANTI_PATTERNS.md`
- Workflow gates and motion review → `ARCHITECTURE.md`
