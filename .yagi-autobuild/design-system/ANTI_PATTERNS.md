# ANTI_PATTERNS.md
Version: 1.0
Owner: Design System
Scope: Cross-cutting anti-patterns only
Aesthetic direction: White editorial — see `PRINCIPLES.md`
Companion: all other design-system docs

---

## 1. Purpose & scope rule

This file contains **anti-patterns that span ≥2 specs**.

If an anti-pattern belongs to a single spec, it lives in that spec — not here.

Why this rule matters: an anti-pattern documented in two places drifts. If you're unsure where to put one, put it in the spec — moving it to this file later is cheap; un-duplicating two spec entries later is not.

A redirect table for spec-specific anti-patterns lives in §9.

---

## 2. AI-generic aesthetic

These patterns mark a UI as "made by an AI from a 2023 Tailwind template." They are blocked at Design Review.

### 2.1 Forbidden visual signals
- **Purple-to-blue gradient on hero / CTA / card** — the universal AI-template tell
- **Glassmorphism** (frosted blur cards floating on gradient backgrounds)
- **Neon green/cyan glows**
- **3D isometric illustrations** (especially of people pointing at charts)
- **Stock dashboard mockup** (the iPhone-tilted-on-laptop kind)
- **Animated gradient text** ("AI-powered" written in shifting rainbow)
- **Lottie waving hands** in headers
- **Emoji as primary visual hierarchy** (e.g., 🚀 next to every feature title)
- **"Magical" particle effects** on hover
- **Aurora background** (animated gradient meshes behind everything)
- **Generic "abstract orbs / blobs"** as page decoration
- **Rounded everything** (border-radius > 16px on cards, pills on every button)

### 2.2 Why these fail
They communicate genericness, not intention. The aesthetic direction in `PRINCIPLES.md` — white editorial, cinematic, anti-generic — is incompatible with all of the above.

---

## 3. Misaligned context (product vs marketing)

The single most common error in this system is treating one as the other.

### 3.1 Product UI mistakes (treating product like marketing)
- Display sizes (≥48px) inside cards or panels
- Decorative serif fonts in dense data surfaces
- Hero-style asymmetric layouts in dashboards
- Marketing copy tone ("Unleash your creative potential!") in product labels
- Centered single-column layouts for data-dense screens
- Page transitions on tab switching
- Parallax scroll in admin
- Auto-rotating banners in workspace headers

### 3.2 Marketing surface mistakes (treating marketing like product)
- Data-table density on landing
- Form-field input styling for newsletter signup (when a single field would do)
- Sidebar navigation on a campaign page
- Login/dashboard chrome on a public-facing page
- Body-sm (14px) for marketing body copy (use body-lg or larger)
- Compact spacing tokens applied to marketing sections

### 3.3 The test
If unsure, ask: **"Is the user reading or doing?"**
- Reading → marketing patterns
- Doing → product patterns
- Both → split into two screens; never compromise

---

## 4. Process violations

These break the build pipeline contract defined in `ARCHITECTURE.md`.

- **Hand-editing `src/design-tokens/*.ts`** — these are generated; edit `.md` source instead. Pre-commit hook blocks this.
- **Adding a component variant before updating `COMPONENT_CONTRACTS.md`** — L1 → L2 ordering violation.
- **Skipping a build gate** without an ADR.
- **Editing a passed gate artifact in place** — emit a `.v2.md` instead.
- **Building screens before frame selection** (UI_FRAMES.md).
- **Designing in Figma without an active DESIGN.md gate output** — produces orphan designs that bypass review.
- **Writing token values inline** (`color: #C8FF8C`) instead of token references.
- **Adding new motion easings outside `INTERACTION_SPEC.md §3.2`** without an ADR.
- **Inventing new typography sizes outside `TYPOGRAPHY_SPEC.md §4.2`** without an ADR.
- **Using "TODO" comments for missing accessibility** — accessibility is part of the contract, not a follow-up.

---

## 5. Localization shortcuts

YAGI ships in Korean and English. Pretending it ships in just one is the most common shortcut.

- **Designing screens in English only**, then "adding Korean later" — Korean copy width changes everything; designing without Korean produces broken layouts.
- **Hard-coding pixel widths against English copy** (button widths, badge widths, table columns).
- **Using a separate font for Korean** (e.g., Noto Sans KR with Inter) when Pretendard handles both.
- **Truncating Korean text to fit English-designed widths** without a recovery path (tooltip, expand-on-hover, full text on focus).
- **Single-language QA** — every screen must be reviewed in both locales before passing Design Review.
- **Using `text-transform: uppercase` on Korean text** — Korean has no case; the transform produces no visual change but breaks screen readers.
- **Italic Korean text** — Pretendard does not ship a true italic; synthetic italics distort glyphs.
- **Letter-spacing on Korean body text** — distorts glyph spacing designed by the typeface.
- **Centering Korean body text** — Korean reads less comfortably centered; use centered alignment only for short headings.
- **Mixing tabular and proportional numerals across language switches** — pick the variant per column; it does not change with locale.

(Some items above are restated from `TYPOGRAPHY_SPEC.md §15` because they have system-wide impact; this is the only acceptable cross-spec anti-pattern duplication.)

---

## 6. Accessibility shortcuts

The product is unusable if these are not respected.

- **Communicating state through color alone** — disabled, error, selected, active must each have a non-color signal.
- **Removing focus indicator on hover** — the keyboard user loses orientation.
- **Tap targets smaller than 44×44 px** on touch devices — fails legal accessibility minimums in most regions.
- **Contrast below WCAG AA** at the size used — verified against `PRINCIPLES.md` color tokens.
- **Modals without focus trap** — keyboard users escape into background content.
- **Auto-playing motion without pause control** — vestibular sensitivity, attention disorders.
- **Auto-advancing carousels** — same reasons; also: nobody has ever wanted this.
- **Bypassing `prefers-reduced-motion`** — users who set it have a reason.
- **Form errors as toast only** — the error must also appear inline next to the field.
- **Placeholder as label substitute** — placeholder disappears on type, leaving the user without context.
- **Icon-only buttons without `aria-label`** — invisible to screen readers.

---

## 7. Data UX shortcuts

These create user mistrust — fast.

- **Pre-checked consent or marketing checkboxes** — illegal in many regions, hostile everywhere.
- **Auto-submit destructive actions** (delete, archive, send) without confirmation.
- **Surprise modals** — modals appearing without user trigger (welcome modals, "rate us" prompts).
- **Loading state replacing already-rendered content** — show skeleton beside, not in place of, existing data.
- **Layout shift during load** — the page is rendering, then jumps; fails Cumulative Layout Shift metric and user trust.
- **Disabled buttons without explanation** — show a tooltip or inline text explaining why disabled.
- **Async actions with no acknowledgment** — every async submission needs at least a button loading state.
- **Cascading deletes without warning** — "Delete this project (and 47 related items)" is the minimum.
- **Empty states without next action** — empty + no CTA = dead end.
- **Filter + search produce no results, no way to clear** — every "no results" must offer "clear filters".
- **Saved-state indicators that lie** — "Saved" appearing before the save actually completes.
- **Numeric inputs without input mode** — phone, decimal, etc. need correct keyboard on mobile.

---

## 8. Composition / hierarchy shortcuts

- **Multiple primary buttons in the same local context** — defeats the purpose of "primary."
- **Three or more H-level headings on a single screen** that are visually identical — hierarchy is not communicated.
- **Sidebar + top nav + breadcrumb + tab** stacked simultaneously — pick a navigation primitive per surface.
- **Information density inconsistency within the same screen** — one panel comfortable, the next compact, third relaxed = chaotic.
- **Borders and shadows on the same card** — pick one. Borders for crisp / system feel; shadows for elevated / floating feel.
- **Dividers between every list item** — overwhelming. Use spacing instead, dividers only for semantic group boundaries.
- **Cards inside cards inside cards** — flat the hierarchy, use spacing.
- **Decorative icons on every label** — icon + label is a pair, not a default.

---

## 9. Where spec-specific anti-patterns live

Do not duplicate these here. If you're tempted to, add a one-liner pointer in §10 instead.

| Anti-pattern domain | Lives in |
|---|---|
| Typography (all-caps Korean, italic Korean, weight 500 misuse, raw sizes, mixed numerals, decorative serifs in product UI) | `TYPOGRAPHY_SPEC.md §15` |
| Component naming (`blue-button`, `big-card`) | `COMPONENT_CONTRACTS.md §4.1` |
| Component variants (`homepage-version`, `weird-mobile-fix`) | `COMPONENT_CONTRACTS.md §8` |
| Component states (color-only state, removed focus on hover, `display: none` for disabled) | `COMPONENT_CONTRACTS.md §9.3` |
| Loading patterns (fullscreen spinner, collapsing to spinner, indeterminate-when-known) | `COMPONENT_CONTRACTS.md §11.3` |
| Toast misuse (replace vs stack, error toast instead of inline) | `COMPONENT_CONTRACTS.md §5.8` |
| Motion (field shake, bouncy entrances, parallax in product) | `INTERACTION_SPEC.md §10` |
| Build pipeline (skipping gates, hand-editing generated .ts) | `ARCHITECTURE.md §4.2 + §5.3` |
| Frame selection misuse | `UI_FRAMES.md` |

---

## 10. How to add a new anti-pattern

Decision tree:

1. **Does it apply to one spec only?** → put it in that spec's anti-patterns section. Done.
2. **Does it apply to ≥2 specs?** → put it here, in the most appropriate §2–§8 category.
3. **Is it a positive principle, not an anti-pattern?** → it belongs in `PRINCIPLES.md`, not here.
4. **Is it a process violation?** → §4 here, *and* a corresponding rule in `ARCHITECTURE.md`.
5. **Are you uncertain?** → put it in the spec. Cross-cutting promotion is reversible; un-duplicating is not.

When adding here:
- One sentence per pattern, imperative or noun-phrase.
- Optional one-line "why this fails" only if not self-evident.
- Group under the existing §2–§8 categories. Do not add new categories without an ADR.

---

## 11. Reference cross-links

- Aesthetic direction (positive principles) → `PRINCIPLES.md`
- Workflow gates that enforce these rules → `ARCHITECTURE.md`
- Spec-specific anti-pattern locations → §9 above
- Verification during review → `DESIGN_REVIEW.md`
