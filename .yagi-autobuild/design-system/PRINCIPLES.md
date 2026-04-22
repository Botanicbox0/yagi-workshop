# YAGI Design Principles

> **Role of this document:** The authoritative design philosophy for every screen Builder/Codex ships in YAGI Workshop. Not a style guide — a decision framework.
> **Read before:** writing any UI code, spec'ing any screen, reviewing any PR with visible surfaces.
> **Owners:** Yagi (taste) + Claude (application) + Codex (enforcement via Design Review).

---

## 1. Stance

YAGI Workshop is a B2B client portal for an AI Native Entertainment Studio. Every screen is used by real clients making real decisions about their IP, image, and money. The design must feel like a tool their team would pay for — not a template.

Three non-negotiable stances:

**Software first, brand second.** Workflow always beats aesthetic. If the design choice slows the task down, the design choice is wrong — regardless of how beautiful it is.

**Editorial over decorative.** Hierarchy comes from typography, spacing, and restraint. Not from gradients, glass, shadows, or illustration. The feeling is "a serious publication published by a design-literate studio," not "a SaaS dashboard someone skinned."

**Light surface, dense content, quiet chrome.** White background. Dark, readable text. Minimal controls. Content is the loudest thing on every page.


---

## 2. The six operating principles

Every screen Builder ships must satisfy all six. If any one is violated, the screen is not ready to ship.

### 2.1 Software first
Workflow precedes visual identity. Brand presence appears only where it doesn't interrupt task flow — primarily through typography, rhythm, and restraint. Never through hero illustrations or decorative chrome embedded in working surfaces.

### 2.2 State clarity
Every surface answers three questions in under 200ms of looking: **What is this? What state is it in? What can I do?** If a user has to read a paragraph to know they're on the right page, the page has failed.

### 2.3 Task momentum
The user should always see the next reasonable action. No dead-end screens. No "now what?" moments. Primary CTAs don't compete — there is exactly one per frame, and it is always visible without scrolling on desktop.

### 2.4 Cognitive economy
Readable beats clever. Actionable beats explanatory. If a control's purpose isn't clear from its label plus its position, rewrite the label — don't add a tooltip. Tooltips are a debt, not a feature.

### 2.5 Visual restraint
Decoration is subtracted, not added. If a shadow, gradient, border-radius bump, or motion isn't carrying information, remove it. The rule of thumb: **what is this line/shadow/color teaching the user?** If nothing, delete.

### 2.6 System consistency
A reusable rule is always worth more than a one-off beautiful moment. Before inventing a new component variant, confirm no existing one can do the job. Exceptions require a note in `.yagi-autobuild/design-system/DECISIONS.md` explaining why.


---

## 3. Aesthetic direction

**One direction, chosen:** *editorial minimal with modern grotesk typography on a light canvas.*

References: Linear (light mode) for density and state clarity. Webflow.com for editorial hierarchy and typographic scale. Height.app for keyboard-driven pace. Read.cv for typographic restraint on a white surface. Stripe dashboard for data-heavy editorial layouts.

**What this looks like, concretely:**
- Background: pure white `#FFFFFF` for primary surfaces, `#FAFAFA`–`#F5F5F5` for recessed panels. Never pure gray backgrounds with white cards — invert that.
- Text: near-black `#0A0A0A` for body, `#1A1A1A` for headings, graded neutral for metadata.
- Accent: a single restrained warm neutral (`#C8A96E` amber) used sparingly for active state + brand marker. Not for primary buttons.
- Primary action: solid black on white. Or white on solid black. No gradient buttons, ever.
- Borders: `#EAEAEA` hairlines. Never double borders. Never shadows to simulate elevation.
- Radius: 6px for inputs/buttons, 8px for cards/panels, 0 for table rows. Consistent, not playful.
- Shadow: none by default. One permitted elevation (`0 1px 2px rgba(0,0,0,0.04)`) for floating surfaces (popover, dropdown, toast). Nothing else.

**What this does NOT look like:**
- No glassmorphism. No backdrop-blur. No gradients on text or buttons.
- No playful illustrations, mascots, emoji-as-icons, rounded-cartoon aesthetics.
- No stock photography. No gradient hero backgrounds. No decorative SVG blobs.
- No "colorful tag salad" — tags are neutral with one semantic color layered only when meaning is conveyed (error/success/warning).
- No Material Design shadows. No iOS-translucent chrome. No Windows 11 mica.


---

## 4. Information hierarchy (L1–L5)

Every screen has exactly these five levels, in order:

- **L1 — Product context.** The sidebar label / breadcrumb root. Answers "what app am I in?" Appears in chrome, not page body.
- **L2 — Page subject.** The thing the page is about (project name, meeting title, invoice number). Biggest text on the page. Single line when possible.
- **L3 — Primary action.** The one thing the user is most likely to do next. Visible without scroll. One per frame, two absolute maximum.
- **L4 — Supporting information.** Metadata, secondary stats, related objects. Quieter than L2 but always legible.
- **L5 — Secondary controls / diagnostics.** Filters, settings toggles, export, archive. Grouped and pushed to the edges (top-right, bottom, overflow menus).

**Enforcement rule:** if two elements are competing for the same level, one of them is in the wrong level. Fix the hierarchy before fixing the styling.

---

## 5. UI frames — pick one before designing

Every screen must be classified as one of five frames before work begins. The frame determines the layout skeleton. The aesthetic is applied on top.

| Frame | When to use | YAGI Workshop examples |
|-------|-------------|----------------------|
| **Overview** | Summary of a bigger object or a scope of work | `/app` dashboard, project overview page |
| **Browse** | Scanning many items, comparing, filtering | Projects list, meetings list, invoices list, showcases list |
| **Detail** | Deep view of one object, its context, its actions | Individual project, meeting, invoice, showcase admin |
| **Create / Edit** | Input, validate, submit | New project, invoice composer, showcase editor |
| **Workflow** | Multi-step process with clear progress state | Intake wizard, payment flow, contract signing |

Detailed spec for each frame: see `UI_FRAMES.md`.

---

## 6. Typography as structure

Type is not decoration. It is the primary hierarchy mechanism.

Principles:
- **Two families maximum** across the entire product. Currently: Pretendard Variable (primary, both ko and en) + a single modern grotesk for large display moments (optional, decision in `TYPOGRAPHY_SPEC.md`).
- **Weight carries hierarchy.** Reach for weight before size. A 14px Bold is often clearer than a 16px Regular.
- **Korean needs more line-height than English.** Default body in ko: `line-height: 1.7`. In en: `1.55`. Headlines follow a similar delta.
- **Korean headlines feel heavier at the same weight.** For display/page-title in Korean, drop one weight step (e.g., `font-weight: 600` where English would use `700`) to equalize optical density.
- **CTA/tab/nav labels must assume 30% Korean expansion.** Never build to pixel-perfect English strings.

Full scale: `TYPOGRAPHY_SPEC.md`.

---

## 7. Color as meaning

Color is a semantic channel, not a decorative one.

Allowed roles:
- **Neutral scale** (0–100): background, surface, border, text. This is 85% of what you use.
- **Semantic**: success (green), warning (amber), error (red), info (blue). Used for *state*, never for decoration.
- **Accent** (single warm neutral, amber `#C8A96E`): YAGI brand marker. Used for active nav state, brand logo, and one-off emphasis moments. **Never for primary buttons** — those are always solid black.
- **Data viz palette**: only introduced when a chart exists. Reach for `DATA_VIZ_PALETTE.md` spec (not yet written, add when first chart ships).

Forbidden:
- No accent gradients.
- No tinted backgrounds for entire pages.
- No colored text for emphasis — use weight or caps+tracking.

Contrast: WCAG AA minimum (4.5:1 body, 3:1 large text). Near-black on white is the default and it solves this for free.


---

## 8. Density

Three modes exist, user-selectable in settings:
- **Compact**: 32px row height, 12px padding, 13px body. For power users on dense data.
- **Comfortable** (default): 40px row height, 16px padding, 14px body. Default for most screens.
- **Relaxed**: 48px row height, 20px padding, 15px body. For reading-heavy surfaces (journal, long invoices).

Rule: density is set at page level via a CSS variable. Components read from the variable. Don't hardcode row heights in components.

---

## 9. Motion

Motion is a feedback system, not a delight mechanism.

Allowed motion:
- State transitions: 150–200ms, `ease-out`. Hover enter, focus ring, dropdown open, modal slide-in.
- Loading: a single subtle pulse or shimmer on skeleton loaders. No bouncing spinners, no confetti, no progress bars with playful animation.
- Save confirmation: 200ms toast fade-in, 2–3s dwell, 200ms fade-out.
- Page transitions: none. Use instant nav. Next.js router is fast enough that animating it hurts perceived speed.

Forbidden motion:
- Hero animations, floating elements, parallax.
- Motion without a state change behind it.
- Motion longer than 300ms for UI transitions.
- Bouncy easing (`ease-elastic`, overshoot) except in one permitted place: success confirmation check icon.

Respect `prefers-reduced-motion`: disable all non-essential motion, keep only the save/error feedback.

---

## 10. Accessibility — baseline

Not a polish layer. Baseline from day one.

- Keyboard navigation is first-class: every interactive element is focusable, Tab order is logical, focus ring is always visible (never `outline: none` without a replacement).
- Focus ring: `2px solid #0A0A0A` offset 2px on the outside. Visible on white, doesn't interfere with color semantics.
- Color is never the only signal: error state has text + icon + color. Success has text + icon + color. Required fields have asterisk + label suffix + aria-required.
- Error messages: "what went wrong + what to do." Never just "Invalid input." Instead: "Email must contain @. Did you mean `name@domain.com`?"
- Screen reader: aria-label matches visual label. Dynamic regions use `aria-live="polite"` for state updates, `"assertive"` for errors.
- Target: WCAG 2.1 AA across all surfaces. AAA where it's free (body text contrast is usually AAA by default with near-black on white).

---

## 11. Language awareness (ko / en)

This product ships in Korean and English day one. Design never assumes English.

- Type scale is locale-aware. See `TYPOGRAPHY_SPEC.md`.
- Button, tab, and nav widths account for ~30% Korean expansion over English.
- Never truncate Korean labels at 2 characters. Plan for 4–6 character minimum.
- Date formats: `YYYY.MM.DD` for Korean, `MMM D, YYYY` for English. Never `MM/DD/YYYY` — ambiguous.
- Numbers: Korean uses `만`/`억` for large values (`1.5억` not `150,000,000`). Money formatting is locale-specific.
- Empty states and error copy are locale-native, not translated. Write them fresh in both languages.

Enforcement: every screen must be checked in both locales before PR. Section in `DESIGN_REVIEW.md`.

---

## 12. Anti-patterns — recognize and reject

If a spec, Builder output, or PR includes any of these, the Design Review rejects it:

1. **Hero-centric admin page.** The dashboard is not a marketing page.
2. **Three-column feature card grid** for anything that isn't actually three parallel features.
3. **Gradient backgrounds** anywhere except one permitted place: the public showcase OG image (full-bleed, intentional).
4. **Multiple primary buttons** competing in one view.
5. **Unexplained iconography.** Every icon either has a label or is universally understood (×, +, search). No novel icons without labels.
6. **Colored backgrounds for cards** to create "visual hierarchy." Use borders or spacing instead.
7. **Card-in-card nesting.** One level of container maximum.
8. **Generic empty state** — a pencil icon + "No items yet" is not an empty state. Empty state = explanation + next action.
9. **Avatar clusters with no purpose.** If the page doesn't make collaboration observable, don't show 5 gray circles.
10. **Decorative motion** — anything moving without conveying state.
11. **"Success!" modals** for routine actions. Use inline toast.
12. **Right-to-left sidebar on a LTR language product.** (Common in experimental designs. Don't.)
13. **Bottom-sheet modals on desktop.** Use dialog or drawer.
14. **Keyboard shortcuts without a discoverable reference** (needs `?` overlay).

---

## 13. How this gets enforced

- **Before coding:** Phase spec includes a "Screen structure" section that names the frame and the L1–L5 for each screen. Missing → spec rejected.
- **During coding:** Builder reads `UI_FRAMES.md` + `COMPONENT_CONTRACTS.md` before implementing.
- **After coding:** Design Review (`reviews/DESIGN_REVIEW.md`) runs before merge. Includes locale pass (ko + en) and the anti-pattern checklist.
- **Across phases:** `DECISIONS.md` (append-only) records every exception made to these principles and why. Quarterly review surfaces drift.

---

## 14. When in doubt

Three tiebreakers, in order:

1. **Does this help the user finish their task faster?** If no, reconsider.
2. **Does this read well in Korean at 14px?** If no, reconsider.
3. **Would Linear, Webflow, or Stripe ship this?** If not even close, reconsider.

The third tiebreaker is not about copying. It is about calibration: those teams have taste and craft. If your solution is visibly worse than what they would ship for the same problem, keep iterating.
