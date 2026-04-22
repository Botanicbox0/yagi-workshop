# COMPONENT_CONTRACTS.md
Version: 1.1
Owner: Design System
Platform: Webflow
Scope: Product UI / Marketing UI / CMS-driven interfaces
Locales: Korean (ko), English (en)
Aesthetic direction: White editorial — see `PRINCIPLES.md`
Companion: `TYPOGRAPHY_SPEC.md`, `DESIGN_REVIEW.md`, `UI_FRAMES.md`

> **Changes from v1.0** (full diff in §13):
> - Pagination, Command/search, Select stubs filled out
> - §2.5 (product-first thinking) removed → moved to PRINCIPLES.md scope
> - §10 (review checklist) removed → DESIGN_REVIEW.md owns this
> - §4.3 + §9 merged into §9 (state design)
> - §2.4 + §7 merged into §7 (property design)
> - §11 component dependency map added
> - §12 loading state convention added
> - §4.4 Korean width wording corrected

---

## 1. Purpose

This document defines the contract model for reusable components in Webflow under the white-editorial direction defined in `PRINCIPLES.md`.

A component contract is not a visual mockup note.
It is a reusable implementation agreement that defines:

- what the component is for
- what variants it supports
- what states it must handle
- what content rules apply
- what localization constraints exist
- how it should behave in Webflow

This system treats components as scalable product building blocks. Aesthetic decisions (color, type, density) defer to `PRINCIPLES.md` and `TYPOGRAPHY_SPEC.md` — this document governs **structure and behavior**.

---

## 2. Core principles

### 2.1 Component = contract
A component is defined by rules, not by screenshot appearance.

Every component must include:
- role
- anatomy
- variants
- states
- properties
- content rules
- accessibility notes
- localization notes
- implementation notes

### 2.2 Variables first
Component styling must resolve to shared tokens whenever possible.

Use:
- color variables (per `PRINCIPLES.md`)
- spacing variables (per `PRINCIPLES.md`)
- typography role tokens (per `TYPOGRAPHY_SPEC.md`)
- radius / shadow / effect tokens

Avoid hardcoded visual values inside isolated components.

### 2.3 Base + variant + state
Each component should be predictable.

Structure:
- base component definition
- variant model
- state model
- optional context modifiers

---

## 3. Standard contract template

Use this template for every component.

```
### Component name
### Role
### Usage contexts
### Anatomy
### Variants
### States
### Properties
### Behavior rules
### Content rules
### Accessibility rules
### Localization rules
### Responsive rules
### Webflow implementation notes
### QA checklist
```

A component is incomplete if any section is missing. Missing sections are stubs and may not enter Build gate.

---

## 4. Global component rules

### 4.1 Naming
Use clear semantic names.

Examples:
- `button`
- `input-field`
- `tab-group`
- `modal`
- `data-table`
- `empty-state`
- `toast`
- `pagination`
- `command-menu`

Avoid:
- `blue-button`
- `big-card`
- `header-block-2`

### 4.2 Styling model
Prefer:
- base class
- combo classes for variants
- combo classes for states only when necessary

Example:
- `.button`
- `.button.is-primary`
- `.button.is-secondary`
- `.button.is-destructive`
- `.button.is-loading`

### 4.3 Localization readiness
Every text-bearing component must assume:
- Korean **often requires more horizontal space than equivalent English** (~10–25% wider on average per `TYPOGRAPHY_SPEC.md §9.3`)
- labels may need different line-height handling
- truncation must be intentional, not accidental

### 4.4 Accessibility baseline (global minimum)
Every component must support:
- visible focus state (`:focus-visible`)
- meaningful labels (programmatic association)
- keyboard interaction if interactive
- state not conveyed by color alone

Component-level accessibility rules in §5 add to this baseline; they do not replace it.

---

## 5. Contract definitions

---

### 5.1 Button

#### Role
Triggers a clear user action.

#### Usage contexts
- primary action
- secondary action
- destructive action
- inline action
- toolbar action

#### Anatomy
- container
- label
- optional leading icon
- optional trailing icon
- optional loading indicator

#### Variants
- primary
- secondary
- tertiary / ghost
- destructive
- link-style action

#### States
- default
- hover
- focus-visible
- active
- disabled
- loading

#### Properties
- label text
- href / action target
- leading icon on/off
- trailing icon on/off
- loading state on/off
- width mode: auto / full

#### Behavior rules
- primary button must be visually unique in a local context
- no more than one dominant primary action in the same local area
- loading state must prevent duplicate submission
- destructive actions should require explicit confirmation if impact is high

#### Content rules
- label should start with a verb when possible
- keep concise
- avoid vague labels like "Confirm" if a more explicit action is possible
- avoid multi-line button labels in primary flows

#### Accessibility rules
- icon-only buttons require accessible name
- loading state should communicate progress where possible

#### Localization rules
- reserve extra width for Korean labels
- do not hard-lock button widths too tightly
- avoid abbreviations that become ambiguous in translation

#### Responsive rules
- maintain minimum tap target (44×44 px)
- full-width buttons are allowed on mobile for major actions

#### Webflow implementation notes
Classes:
- `.button`
- `.button.is-primary`
- `.button.is-secondary`
- `.button.is-tertiary`
- `.button.is-destructive`
- `.button.is-loading`
- `.button.is-full`

Properties:
- text
- link
- icon visibility
- icon asset
- loading toggle

#### QA checklist
- primary action is visually clear
- Korean labels fit
- loading state works
- keyboard focus visible
- icon-only usage is labeled

---

### 5.2 Input field

#### Role
Captures structured or unstructured user input.

#### Usage contexts
- forms
- settings
- search
- filters
- authentication

#### Anatomy
- label
- input control
- placeholder
- helper text
- validation / error message
- optional leading/trailing icon

#### Variants
- text
- email
- password
- search
- numeric
- textarea

#### States
- default
- hover
- focus
- filled
- disabled
- error
- success
- read-only

#### Properties
- label text
- placeholder text
- helper text
- validation message
- required on/off
- icon visibility
- input type

#### Behavior rules
- labels remain visible; placeholder is not a label replacement
- validation should appear at the right time, not prematurely
- error should explain both problem and next step if possible

#### Content rules
- labels should be noun-based and explicit
- helper text should be short and actionable
- error copy should not be generic if a specific message is possible

#### Accessibility rules
- label and field must be programmatically associated
- error text must be linked to the field
- password visibility controls need accessible labels

#### Localization rules
- Korean helper/error text often becomes longer; allow two lines safely
- avoid narrow field layouts that force awkward wrapping

#### Responsive rules
- stacked label/control layout is acceptable on small screens
- helper and error copy must remain readable at all breakpoints

#### Webflow implementation notes
Classes:
- `.input-field`
- `.input-field.is-error`
- `.input-field.is-success`
- `.input-field.is-disabled`
- `.input-field.is-readonly`

Nested elements:
- `.input-label`
- `.input-control`
- `.input-helper`
- `.input-feedback`

Properties:
- label
- placeholder
- helper text
- feedback text
- required flag

#### QA checklist
- label is always visible
- errors are readable
- Korean copy does not break layout
- focus and error states are distinct

---

### 5.3 Select / dropdown

#### Role
Lets users choose one option from a defined set.

#### Usage contexts
- forms
- filters
- settings
- locale selector

#### Anatomy
- label
- trigger
- selected value
- option list
- helper / feedback text

#### Variants
- default select
- compact select
- filter select

#### States
- default
- hover
- focus
- open
- selected
- disabled
- error

#### Properties
- label text
- option items
- selected value
- placeholder/default text
- helper text
- error text

#### Behavior rules
- selected value must remain obvious in collapsed state
- long option text must not destroy layout
- filter usage should prioritize scan speed
- option list scrolls when count exceeds visible threshold (default 8)

#### Content rules
- option labels short, parallel structure (all noun phrases or all verb phrases)
- placeholder uses "Select…" pattern, not "Choose one"
- avoid jargon in default options

#### Accessibility rules
- keyboard navigation required (Up/Down, Enter to select, Esc to close)
- clear active/selected indication
- state must not rely on color only
- type-ahead search supported when option count exceeds 12

#### Localization rules
- Korean option labels may be longer; reserve trigger width or allow internal truncation with full text in tooltip
- mixed-language option lists (KR + EN brand names) align by left edge, not by character

#### Responsive rules
- on mobile portrait, select trigger is full-width
- option list opens as bottom sheet on mobile when option count > 4
- maintain 44×44 minimum tap target on each option

#### Webflow implementation notes
Classes:
- `.select`
- `.select.is-compact`
- `.select.is-filter`
- `.select.is-open`
- `.select.is-error`

Use Webflow component only if interaction behavior is stable and reusable.
If custom interaction is required, ensure state styling remains token-based.

Properties:
- label
- option list (CMS-bound or static)
- selected value
- placeholder

#### QA checklist
- selected value visible in collapsed state
- keyboard navigation complete
- option list does not overflow viewport
- Korean option labels render without breakage
- mobile bottom sheet behavior verified

---

### 5.4 Tabs

#### Role
Switches between peer-level views or content sections.

#### Usage contexts
- dashboards
- settings
- details pages
- analytics views

#### Anatomy
- tab list
- tab item
- active indicator
- content panel

#### Variants
- underline tabs
- segmented tabs
- compact tabs

#### States
- default
- hover
- focus
- active
- disabled

#### Properties
- tab labels
- active item
- icon optional
- badge optional

#### Behavior rules
- tabs are for peer sections, not steps
- active tab must be unambiguous
- keep number of tabs manageable

#### Content rules
- labels should be short nouns or short noun phrases
- avoid long sentence-style tab labels

#### Localization rules
- Korean labels may require more width
- if tabs overflow easily, switch to segmented menu or dropdown pattern

#### Webflow implementation notes
Classes:
- `.tab-group`
- `.tab-item`
- `.tab-item.is-active`

Properties:
- label
- active state
- badge count optional

---

### 5.5 Modal / dialog

#### Role
Interrupts the flow to request confirmation, focused input, or critical information.

#### Usage contexts
- confirmations
- small forms
- destructive actions
- important notices

#### Anatomy
- overlay
- dialog container
- title
- body
- actions
- close control

#### Variants
- confirm dialog
- form dialog
- informational dialog

#### States
- open
- closing
- disabled action
- error within dialog
- loading action

#### Properties
- title
- body text
- primary action label
- secondary action label
- close allowed on/off

#### Behavior rules
- use sparingly
- never hide critical consequences
- destructive flows should be explicit

#### Accessibility rules
- focus trap required
- escape behavior consistent
- initial focus placement deliberate
- close control accessible

#### Localization rules
- Korean confirmation copy can become more descriptive; allow body expansion
- action labels must still remain clear and short

#### Webflow implementation notes
Classes:
- `.modal`
- `.modal-overlay`
- `.modal-panel`
- `.modal-actions`

---

### 5.6 Data table

#### Role
Displays dense structured information for scanning, comparison, and action.

#### Usage contexts
- admin
- analytics
- records
- inventory
- operations

#### Anatomy
- table header
- rows
- cells
- optional row actions
- sorting/filtering controls
- empty state
- pagination

#### Variants
- standard table
- compact table
- selectable table
- sortable table

#### States
- populated
- empty
- loading (per §12)
- partial data
- error
- selected row
- hovered row

#### Properties
- columns
- row content
- row action visibility
- sort state
- density mode

#### Behavior rules
- prioritize readability over decorative styling
- avoid cardifying tables unless mobile necessity demands it
- numeric and status columns should be visually aligned

#### Content rules
- column names must be explicit
- timestamps and IDs may use mono styles
- numeric columns use `font-variant-numeric: tabular-nums` (per `TYPOGRAPHY_SPEC.md §9.6`)
- avoid truncating critical identifiers without recovery path

#### Accessibility rules
- headers must be clearly associated
- row actions must be keyboard reachable
- selection state must be clear

#### Localization rules
- Korean column headers may be longer; plan widths intentionally
- allow responsive simplification rather than accidental clipping

#### Webflow implementation notes
This may be built using structured divs for flexibility, but hierarchy must remain semantically clear where possible.

Classes:
- `.data-table`
- `.data-table.is-compact`
- `.data-row`
- `.data-cell`
- `.data-cell.is-numeric`
- `.data-row.is-selected`
- `.data-table-empty`

---

### 5.7 Empty state

#### Role
Explains why content is absent and what the user should do next.

#### Usage contexts
- first-use screens
- no results
- empty collections
- filtered-out views

#### Anatomy
- title
- description
- optional illustration/icon
- primary action
- optional secondary action

#### Variants
- no data yet
- no results
- permission restricted
- error-adjacent recovery state

#### States
- static
- action-ready

#### Properties
- title
- description
- CTA label
- CTA link
- visual optional

#### Behavior rules
- empty state must reduce confusion
- always explain the absence
- offer the most relevant next step

#### Content rules
- short title
- one concise explanation
- one strong next action

#### Localization rules
- Korean copy may be slightly longer; allow body to wrap naturally
- do not rely on ultra-short English style slogans

#### Webflow implementation notes
Classes:
- `.empty-state`
- `.empty-state-title`
- `.empty-state-body`
- `.empty-state-actions`

---

### 5.8 Toast / inline feedback

#### Role
Communicates lightweight status updates.

#### Usage contexts
- save success
- sync complete
- minor warning
- non-blocking errors

#### Anatomy
- container
- tone indicator
- message
- optional action
- optional dismiss

#### Variants
- success
- warning
- error
- info

#### States
- visible
- dismissing
- persistent
- auto-dismiss

#### Properties
- tone
- message
- action label
- dismissible on/off

#### Behavior rules
- do not use for critical information requiring confirmation
- keep duration appropriate to message importance
- error toasts should not replace inline form errors
- when multiple toasts queue, **stack** (newest on top), do not replace
- maximum 3 visible toasts; older ones auto-dismiss when limit exceeded

#### Localization rules
- Korean text length must not break compact layouts
- avoid extremely narrow toast containers

#### Webflow implementation notes
Classes:
- `.toast`
- `.toast.is-success`
- `.toast.is-warning`
- `.toast.is-error`
- `.toast.is-info`

---

### 5.9 Pagination

#### Role
Moves users through segmented content.

#### Usage contexts
- tables
- CMS lists
- archives
- search results

#### Anatomy
- previous control
- next control
- current page indicator
- optional page numbers
- optional jump-to-page input
- optional total count

#### Variants
- simple prev/next
- numbered
- compact mobile
- with-total (e.g., "Page 3 of 12")

#### States
- default
- hover
- focus
- disabled (e.g., prev disabled on first page)
- current page (visually distinct, not interactive)
- loading (per §12)

#### Properties
- current page
- total pages
- page size
- show page numbers on/off
- show total on/off

#### Behavior rules
- current page must be unambiguous and not appear interactive
- prev/next disabled at boundaries; never hidden (predictability)
- jumping by ≥10 pages should be possible (numbered or jump input)
- URL updates on page change for deep-linking
- focus returns to top of paginated content on page change

#### Content rules
- labels: "Previous" / "Next" (en), "이전" / "다음" (ko)
- avoid arrow-only buttons without accessible labels
- page count uses tabular numerals

#### Accessibility rules
- nav landmark with `aria-label`
- current page announced as such (`aria-current="page"`)
- prev/next buttons disabled state announced
- keyboard: Tab navigates, Enter activates

#### Localization rules
- Korean equivalents (이전/다음) take similar width but adjust spacing
- avoid single-character labels (←/→) without text — fails when language changes

#### Responsive rules
- mobile: simplify to prev/current/next; hide numbered pages above 5
- maintain 44×44 minimum tap target
- compact variant on width < 480px

#### Webflow implementation notes
Classes:
- `.pagination`
- `.pagination-item`
- `.pagination-item.is-current`
- `.pagination-item.is-disabled`
- `.pagination-prev`
- `.pagination-next`
- `.pagination-jumper`

Properties:
- current page
- total pages
- variant (numbered / simple / with-total)

#### QA checklist
- prev disabled on page 1
- next disabled on last page
- current page visibly distinct, not clickable
- keyboard navigation works
- URL updates on page change
- Korean labels fit
- mobile compact variant verified

---

### 5.10 Command / search

#### Role
Helps users find destinations, objects, or commands quickly.

#### Usage contexts
- power-user navigation
- search
- workspace switching
- object access

#### Anatomy
- input
- results list
- highlighted result
- optional grouping (sections by type)
- optional empty result state
- optional keyboard shortcut hints

#### Variants
- global command menu (modal, summoned by ⌘K)
- local search (inline, persistent)
- quick switcher (workspace/document switch)

#### States
- idle
- focused
- typing
- results available
- no results
- loading (per §12)
- selected (highlighted result)

#### Properties
- placeholder text
- result groups (label + items)
- empty result message
- keyboard shortcut display on/off
- recent items on/off

#### Behavior rules
- ⌘K (Cmd) / Ctrl+K opens global command menu from anywhere
- Esc closes; clicking outside closes
- Up/Down navigates results; Enter selects
- type-ahead is debounced (150ms) to avoid result thrashing
- results re-rank as user types (best match first, not just prefix match)
- grouping headers do not receive focus
- on selection, action runs without secondary confirmation (unless destructive)

#### Content rules
- result labels must be scannable (primary noun first)
- supporting metadata (path, type, date) is secondary text
- highlight matched text within result label
- empty state explains what was searched, not just "No results"

#### Accessibility rules
- input has accessible label
- result list announced as listbox; current result via `aria-activedescendant`
- selection state announced
- focus returns to invoking element on close
- screen reader receives result count update on each query

#### Localization rules
- Korean search supports partial matching across syllable boundaries (consider IME composition state)
- mixed Korean/English search labels remain visually balanced (single Pretendard handles this — see `TYPOGRAPHY_SPEC.md §9`)
- result metadata can become long in Korean; truncate with ellipsis, full text on hover

#### Responsive rules
- on mobile, command menu opens fullscreen instead of modal
- result list scrolls with momentum; grouping headers sticky during scroll
- maintain 44×44 minimum tap target on each result

#### Webflow implementation notes
Classes:
- `.command-menu`
- `.command-menu.is-open`
- `.command-input`
- `.command-results`
- `.command-result`
- `.command-result.is-highlighted`
- `.command-group-header`
- `.command-empty`

Webflow component is appropriate only if interaction behavior is stable. For complex behavior (debounced search, server-side results), implement with custom JS that still consumes design tokens.

Properties:
- placeholder
- result groups
- shortcut display

#### QA checklist
- ⌘K / Ctrl+K opens menu globally
- Esc closes
- Up/Down + Enter navigation works
- empty result state visible and helpful
- Korean IME composition does not lose input
- mobile fullscreen mode verified
- focus returns to invoking element on close

---

## 6. CMS-aware rules

For CMS-driven components:
- content length must be assumed variable
- title, subtitle, excerpt, metadata all need graceful overflow rules
- image absence must be handled as a valid state
- empty collection state must be designed explicitly

Do not assume editorial consistency.

---

## 7. Property design rules for Webflow

Component properties define what editors can change at the instance level. Keep this surface small and predictable.

### 7.1 Properties editors may expose
- text content
- image source
- link target
- icon visibility
- selected/default state
- badge count
- optional subtext

### 7.2 Properties editors may NOT expose
- spacing system overrides
- font size, weight, or family changes
- color overrides outside the semantic palette
- arbitrary padding or margin
- layout structure changes (which elements are children)

### 7.3 Why this matters
Property flexibility should never break system consistency. An editor who can change padding at instance level will produce 47 inconsistent variants of the same component within a quarter. An editor who can only change content cannot break the system.

This is not optional. Components that expose forbidden properties fail Design Review.

---

## 8. Variant design rules

A variant must represent a meaningful behavior or semantic difference.

Valid variants:
- primary / secondary / destructive
- compact / default
- success / warning / error

Invalid variants:
- blue / gray / large-pretty
- homepage-version / weird-mobile-fix

If a variation is not reusable, it should not become a formal variant.

---

## 9. State design

States are required behavior, not optional decoration.

### 9.1 Minimum states for interactive components
Every interactive component must define:

- default
- hover
- focus-visible
- active
- disabled
- loading (where async work is involved — see §12)
- success / error (where validation or async outcome is involved)

Missing any required state for an interactive component fails Design Review.

### 9.2 State must be defined across four dimensions
For each state, the contract must specify:

- **visual** — what changes visually (color, weight, shadow, etc.)
- **functional** — what changes in interaction (clickable, focusable, etc.)
- **semantic** — what is communicated to the user
- **accessibility** — how the state is announced or perceived without color

Example — `disabled`:
- visual: reduced emphasis (opacity 0.5 or muted color token)
- functional: non-interactive (`aria-disabled="true"`, `pointer-events: none`)
- semantic: communicated as unavailable, with optional tooltip explaining why
- accessibility: still announced; readable contrast preserved (3:1 minimum)

### 9.3 Forbidden state patterns
- communicating state through color alone
- removing focus indicator on hover
- using `display: none` for disabled states (breaks layout, hides from screen readers in confusing ways)
- showing loading state without preserving original component height (causes layout shift)

---

## 10. Component dependency map

Components compose. A change to a foundational component (button, input) cascades into composite components (modal, toast, empty-state). This map captures dependencies so impact is predictable.

### 10.1 Foundational (no dependencies on other components)
- `button`
- `input-field`
- `select`
- `pagination` (uses button internally but treats it as primitive)

### 10.2 Composite (depend on ≥1 foundational)
| Component | Depends on |
|---|---|
| `modal` | button, input-field (when form variant) |
| `toast` | button (action variant) |
| `empty-state` | button (CTA) |
| `data-table` | button (row actions), pagination |
| `tabs` | (none, but often composes with data-table inside panels) |
| `command-menu` | input-field |

### 10.3 Change-impact rules
- Modifying a **foundational** component requires QA on every composite that depends on it.
- Modifying a **composite** component does not affect foundationals.
- Adding a new variant to a foundational must check whether composites need a parallel variant (e.g., adding `button.is-tonal` may require considering whether `modal` actions need to expose this variant).

### 10.4 Visual dependency tree (text)

```
button ─┬─→ modal (actions)
        ├─→ toast (action)
        ├─→ empty-state (CTA)
        └─→ data-table (row actions, pagination controls)

input-field ─┬─→ modal (form variant)
             └─→ command-menu

select ──→ (used in forms; no current composite dependency)

pagination ──→ data-table
```

---

## 11. Loading state convention (global)

### 11.1 Always prefer skeleton over spinner
- skeletons preserve layout
- skeletons signal what is loading (shape hints at content)
- spinners do neither

Use spinners only when:
- the operation is < 800ms (skeleton would flash too briefly)
- the loading element is so small a skeleton would be indistinguishable (icon-only button)

### 11.2 Loading-state behavior per component

| Component | Loading representation |
|---|---|
| `button` | label hides, spinner replaces in-place; width reserved |
| `input-field` | trailing icon = small spinner; field remains read-only |
| `data-table` | skeleton rows (3–5 visible) replacing real rows |
| `empty-state` | not applicable (empty != loading; never collapse) |
| `modal` | overlay shows immediately; body shows skeleton or spinner depending on size |
| `command-menu` | results area shows 3 skeleton rows; input remains active |
| `pagination` | controls disabled with subtle pulse on current page; do not collapse |

### 11.3 Forbidden loading patterns
- showing a fullscreen spinner over already-rendered content
- collapsing a component to its loading indicator (breaks layout)
- using indeterminate spinners for operations with known progress (use determinate progress instead)
- skeleton without the same dimensions as final content (defeats the purpose)

### 11.4 Operation duration thresholds

| Duration | Treatment |
|---|---|
| < 200ms | no indicator (will feel instant) |
| 200–800ms | spinner is acceptable |
| 800ms–3s | skeleton required |
| > 3s | skeleton + progress hint ("Loading…", percentage if measurable) |
| > 10s | step indicator with cancel option |

---

## 12. Changelog

### v1.1 (2026-04-23)
- Added: §5.3 Select — Behavior/Content/Accessibility/Localization/Responsive/QA sections (was stub)
- Added: §5.9 Pagination — Behavior/Content/Accessibility/Localization/Responsive/Webflow/QA sections (was stub)
- Added: §5.10 Command/search — Behavior/Content/Accessibility/Localization/Responsive/Webflow/QA sections (was stub)
- Added: §10 Component dependency map (new section)
- Added: §11 Loading state convention (new section)
- Added: §5.8 Toast — toast stacking rule
- Added: §5.6 Data table — tabular numerals rule with cross-ref
- Added: §1 — explicit aesthetic-direction reference to PRINCIPLES.md
- Removed: v1.0 §2.5 "Product-first component thinking" (scope belongs to PRINCIPLES.md)
- Removed: v1.0 §10 "Review checklist" (DESIGN_REVIEW.md owns this)
- Merged: v1.0 §4.3 "State completeness" into §9 "State design"
- Merged: v1.0 §2.4 "Instance-safe editing" into §7 "Property design rules"
- Corrected: §4.3 Korean width wording (was inverted as "English compresses")

### v1.0 (initial)
- Initial component contracts for 10 components

---

## 13. Reference cross-links

- Aesthetic direction, color tokens, spacing tokens → `PRINCIPLES.md`
- Typography roles, KR/EN locale rules → `TYPOGRAPHY_SPEC.md`
- Visual / behavioral review checkpoints → `DESIGN_REVIEW.md`
- Frame-level composition rules → `UI_FRAMES.md`
- Cross-cutting anti-patterns → `ANTI_PATTERNS.md`
- Workflow gates and artifacts → `ARCHITECTURE.md`
