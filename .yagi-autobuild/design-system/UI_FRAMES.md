# YAGI UI Frames

> **Role:** Six frame blueprints. Before any screen is designed or implemented, pick exactly one frame. The frame determines skeleton, hierarchy, and primary interactions. Aesthetic is applied on top — never the other way around.
> **Pair with:** `PRINCIPLES.md` (philosophy), `COMPONENT_CONTRACTS.md` (building blocks).

---

## Quick picker

| If the screen is primarily about… | Use frame |
|---|---|
| Summarizing a scope (project, workspace, quarter) | **Overview** |
| Finding one item in many, comparing, filtering | **Browse** |
| Deep view of one thing, with actions on it | **Detail** |
| Creating a new thing or editing an existing one | **Create / Edit** |
| Multi-step process with ordered progress | **Workflow** |
| Onboarding a user to a hub *with brand voice* (empty / pre-conversion state of a major surface) | **Editorial Hub** *(v0.2.0)* |

If a screen feels like "all six at once," you have a composition problem. Split into sub-screens or tabs, each with one frame.


---

## Frame 1 — Overview

**Purpose:** Give the user the status of a scope in one glance, and point them to the most important next action.

**When to use:**
- Project detail landing (before diving into threads/preprod/invoices)
- Workspace home (`/app`) — "what's happening across my projects"
- Quarterly / period dashboard

**When NOT to use:**
- To show long lists — use Browse.
- To show one rich object's body — use Detail.

### Anatomy

```
┌────────────────────────────────────────────────────────────────┐
│ [L1 breadcrumb]                             [L5 overflow menu]  │
│                                                                 │
│ L2  Page subject — large, one line                              │
│     L4 supporting line: status, dates, counts                   │
│                                                                 │
│     [L3 Primary action]   [L5 secondary]                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ Section A: key status ───────────────────────────────────┐  │
│ │  3–5 KPI / status tiles in a row. No cards — just typed   │  │
│ │  stats with hairline dividers.                            │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─ Section B: what needs attention ─────────────────────────┐  │
│ │  Short list (3–5 items max) of things needing the user    │  │
│ │  to act. Each row has an inline action.                   │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─ Section C: activity feed / recent changes ───────────────┐  │
│ │  Chronological, scannable. Dense. Timestamps.             │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Rules
- **Max 3 vertical sections on desktop** above the fold on a 14" laptop. More sections → probably needs a Browse frame instead.
- **No decorative illustrations.** Status is conveyed with type + number.
- **KPI tiles are not cards.** They are typographic blocks with a top-rule or hairline separator. No background color, no shadow.
- **Activity feed uses monospace for timestamps**, sans for actor, sans-medium for action verb.
- **Primary CTA lives next to L2**, not in a hero band at the top.

### Pattern: KPI tiles (correct)
```
  Active projects          Draft invoices          This month revenue
  12                       3                       ₩ 14,250,000
  ↑ 2 from last month      2 awaiting approval     +18% vs. Mar
```
Tiny label → large number → tiny delta. No icons. No background.

### Pattern: KPI tiles (wrong — rejected in Design Review)
- Gradient background cards
- Icon in corner with a circle behind it
- Cards with equal-height shadow boxes

### Empty state
If no data exists: single centered block, headline + 1-line explanation + primary action. No illustration. Example:
> **No active projects yet.**  
> Create your first project to track threads, meetings, and invoices.  
> `[Start a project →]`


---

## Frame 2 — Browse

**Purpose:** Let the user find one item among many, or compare items by their attributes.

**When to use:**
- Projects list, meetings list, invoices list
- Showcases admin list
- Team channels list (sidebar)
- Any "find X among Y" situation

**When NOT to use:**
- <6 items → use a section in an Overview frame.
- Items with deep individual state that can't be summarized in a row → use multiple Detail pages linked from an index.

### Anatomy

```
┌────────────────────────────────────────────────────────────────┐
│ [L1 breadcrumb]                                                 │
│                                                                 │
│ L2  List subject (e.g., "Projects")       [L3 New project]     │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ [Search______________]  [Filter ▾] [Filter ▾]  [Sort ▾]    │ │  ← L5 controls
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Col A          Col B       Col C       Col D      Col E    │ │  ← Table/list
│ │ ─────────────────────────────────────────────────────────  │ │
│ │ Row 1                                             [action] │ │
│ │ Row 2                                             [action] │ │
│ │ Row 3                                             [action] │ │
│ │ …                                                          │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                       [← prev]  Page 2 of 7  [next →]          │
└────────────────────────────────────────────────────────────────┘
```

### Default: table, not cards

**Tables are the default for Browse.** Cards are reserved for the rare case where each item has a dominant visual asset (e.g., showcase previews with thumbnails).

Why tables:
- Scan efficiency: users can compare column values vertically.
- Density: more items on screen = fewer paginations = faster browse.
- Sort/filter obviously maps to columns.
- Keyboard navigation is trivial (j/k, arrow keys).

### Table rules
- Sticky header row when the table scrolls.
- Column widths assigned, not auto (prevents jitter).
- **Row height is controlled by density mode**, not per-table.
- First column is always the primary identifier (name, number), left-aligned.
- Last column is always actions (view, edit, overflow menu), right-aligned.
- Numeric columns are right-aligned and monospace (`font-feature-settings: "tnum"`).
- Date columns use compact format: `Apr 22, 2026` or `26.04.22` depending on locale.
- Selected rows: subtle background (`#F5F5F5` or `#F9F9F6` if amber tint allowed), never border change.
- Zebra striping: forbidden. Use the hairline separators between rows instead.

### Filter bar rules
- Max 4 filters visible inline. 5+ goes into an "All filters" sheet.
- Selected filter shows its current value in the chip: `Status: Active ▾` not `Status ▾`.
- Clear-all link appears when ≥1 filter is active.
- Search is always leftmost. Filters are middle. Sort is rightmost. This order is never rearranged.

### Empty states
- **No items at all:** Same pattern as Overview empty state — short explanation + primary action.
- **No results from filter:** "No projects match these filters. [Clear filters]" — never show a generic empty state when filters are the cause.

### Mobile
- Table collapses to a list. Each row becomes a stacked layout: primary identifier top-left large, metadata below small, action icon top-right. Filters become a bottom-sheet `[Filter (3)]` button.


---

## Frame 3 — Detail

**Purpose:** Present one object with enough context to act on it, enough depth to understand it, and a clear next action.

**When to use:**
- Single project view, single meeting view, single invoice, single showcase admin page
- Any "drill-down from Browse" page

### Anatomy: two-column by default

```
┌────────────────────────────────────────────────────────────────┐
│ [L1 Projects / This project]                     [L5 overflow] │
│                                                                 │
│ L2  Object name — large                                         │
│     L4 subhead: status badge · date · owner                     │
│     [L3 Primary action] [L5 secondary action]                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Main column (2/3) ──────────┐  ┌─ Context rail (1/3) ───┐ │
│  │                              │  │                         │ │
│  │  Primary content body        │  │  Metadata              │ │
│  │  • threads / messages        │  │  – Owner               │ │
│  │  • documents / files         │  │  – Created             │ │
│  │  • frames / previews         │  │  – Status              │ │
│  │                              │  │                         │ │
│  │                              │  │  Related               │ │
│  │                              │  │  – Linked meetings     │ │
│  │                              │  │  – Invoices            │ │
│  │                              │  │                         │ │
│  │                              │  │  Activity              │ │
│  │                              │  │  – Changelog (compact) │ │
│  └──────────────────────────────┘  └─────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Rules
- **2/3 ÷ 1/3 split** on desktop ≥1280px. Single column below.
- **Context rail is always right.** Never left — left is reserved for nav.
- **Rail content is metadata, not primary content.** If something in the rail is primary, the split is wrong.
- **Rail uses smaller type** (13px default) and tighter leading.
- **Rail sections are separated by hairlines**, not cards.
- **No tabs that hide critical state.** If a user needs to know 3 things about this object, show all 3 — don't bury two in tabs.
- Header is sticky when scrolling long content. Primary action stays visible.

### Status and state representation
- Status badge uses a small pill: `8px` rounded, `10px` body text, `11px` weight 500, uppercase optional.
- Colors follow semantic palette: `Draft` gray, `Active` black, `Complete` green, `Cancelled` gray with strikethrough, `Attention` amber.
- **Never use a colored background for the entire detail page based on status.** The status is in the badge, not the chrome.

### Inline editing
For fields that are safe to edit without a dedicated edit page (title, description, tags):
- Hover shows a `✎` edit affordance on the right edge.
- Click turns the field into an input. Save on blur or Enter. Escape cancels.
- Saves trigger a subtle inline toast: "Saved." — 200ms fade, 2s dwell, 200ms fade-out.

### Destructive actions
- `Archive`, `Cancel`, `Delete` live in the overflow menu (L5), not in the header.
- Require confirmation modal with the object's name typed back OR an explicit second button press.
- Never one-click destructive from a Detail header.


---

## Frame 4 — Create / Edit

**Purpose:** Let the user enter or modify structured data, with visible validation and minimal friction.

**When to use:**
- New project, new meeting, new invoice, showcase composer
- Settings pages
- Profile edit

**When NOT to use:**
- Single-field edits (use inline edit in Detail frame).
- Multi-step decisions with branching (use Workflow frame).

### Anatomy

```
┌────────────────────────────────────────────────────────────────┐
│ [← Back to Projects]                                            │
│                                                                 │
│ L2  New project                                                 │
│     L4 helper: fill in the basics. You can edit later.          │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Section: Basics                                                │
│  ─────────────────────────────────────────────                  │
│  Name*                                                          │
│  [__________________________________________]                   │
│                                                                 │
│  Client*                                                        │
│  [Select a client ▾]                                            │
│                                                                 │
│  Description                                                    │
│  [__________________________________________]                   │
│  [__________________________________________]                   │
│                                                                 │
│  Section: Schedule (optional)                                   │
│  ─────────────────────────────────────────────                  │
│  Start date                  End date                           │
│  [📅 2026.05.01]             [📅 —————]                         │
│                                                                 │
│                                                                 │
│                              [Cancel]  [Create project →]       │
└────────────────────────────────────────────────────────────────┘
```

### Rules
- **Single-column form by default.** Two-column only when fields are strongly paired (e.g., start/end date, first/last name).
- **Max 600px form width** for readability. Centered on the page for long forms, left-aligned if embedded in a Detail frame.
- **Sections have hairline separators** and small labels (11–12px, weight 500, uppercase tracking).
- **Required fields marked with `*`** after the label. Inline validation on blur, not on keystroke (too aggressive).
- **Errors appear below the field**, 12px red, 1 line. "What went wrong + how to fix."
- **Helper text** (gray, 12px, below the field) is for context. Errors replace it when present.
- **Primary CTA is always bottom-right.** Cancel is directly to its left. Never top-right.
- **Submit is disabled only while validating/submitting**, never preemptively to "teach" the user. Show errors on submit attempt instead.

### Specific field patterns
- **Text input:** `40px` height, `1px #EAEAEA` border, `6px` radius. Focus ring: `2px #0A0A0A` offset outside. No inner shadow.
- **Textarea:** same styling, min 3 rows, grows to 10.
- **Select:** native-looking on desktop, bottom-sheet on mobile.
- **Date picker:** inline calendar on desktop popover, native on mobile.
- **File upload:** drop zone with `1px dashed` border, centered text "Drop files or click to upload." Never a giant colorful hero.
- **Rich text (for journal/showcase):** minimal toolbar — bold, italic, link, heading, list, code. No color picker, no font picker, no alignment picker.

### Save states
- **Saving:** primary button shows "Saving…" with a subtle spinner replacing the text. Disabled.
- **Saved:** toast "Changes saved." Redirect or stay depending on form semantics — explicitly decided in spec.
- **Failed:** inline error above the form: "Couldn't save: [reason]. [Retry]"

### Multi-locale forms
- If a field is localized (project name in ko + en), show both as separate fields with locale tag, not a "translate" button.
- Placeholder text is in the active locale, not "enter text here" as English fallback.


---

## Frame 5 — Workflow

**Purpose:** Guide the user through an ordered multi-step process, making current step, remaining steps, and completion state explicit.

**When to use:**
- Client intake wizard (brief → references → schedule → confirm)
- Invoice issuance flow (compose → review → send → track)
- Contract signing
- Onboarding for new workspace members

**When NOT to use:**
- When steps are optional or unordered → use a Detail frame with a checklist sidebar.
- Single-step forms pretending to be wizards. If there's one step, it's not a workflow.

### Anatomy

```
┌────────────────────────────────────────────────────────────────┐
│ [× Close]                             Step 2 of 4               │
│                                                                 │
│  ●─────●─────○─────○                                            │
│  Brief  Refs  Sched Confirm                                     │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ L2  References                                                  │
│     L4 helper: add links or files to inspire direction.         │
│                                                                 │
│  [field / content for this step]                                │
│                                                                 │
│                                                                 │
│                                                                 │
│                                                                 │
│                       [← Back]   [Save & continue →]            │
└────────────────────────────────────────────────────────────────┘
```

### Rules
- **Progress indicator at top** with step dots + labels. Current step has a filled dot + bold label. Completed steps have filled dots + muted labels. Future steps have outlined dots + muted labels.
- **No percentage progress bars.** We count steps, not minutes.
- **Every step has exactly one primary action** to proceed. Back is always available (except step 1).
- **Save-and-exit is permitted** on any step — the wizard remembers state and can be resumed.
- **No skipping steps** via nav unless the spec explicitly allows it (rare).
- **Step count is visible** ("Step 2 of 4"). Users want to know how long this is.

### Step transitions
- Moving to next step: 200ms slide-left transition (the only permitted horizontal motion in the product).
- Moving back: 200ms slide-right.
- Respect `prefers-reduced-motion` — no slide, just swap.

### Validation
- Validate on `Continue`, not on input. If validation fails, show errors and block advance.
- Errors appear in a summary at the top of the step ("2 fields need attention") with anchor links, plus inline.

### Completion state
- Final step is a confirmation screen with:
  - Summary of what was entered / what will happen
  - Primary action: Confirm / Submit / Send
  - Back to edit
- After submission: success state on the same page (don't redirect instantly). Small inline summary + "View [created object]" CTA + "Start another" secondary.

### Exit
- Close button (`×`) is top-left. Confirms before closing if there are unsaved changes.
- Saves are auto-persisted per step, so closing mid-wizard shows: "Resume later" with a one-line summary.

---

## Frame 6 — Editorial Hub *(v0.2.0)*

**Purpose:** Welcome a user to a major product surface with brand voice intact. Replaces the generic empty-state pattern when the surface itself carries identity weight (e.g., the projects hub on first arrival, marketing-adjacent product surfaces).

> **Origin:** Phase 2.9 Projects hub redesign + isomeet.com calibration. The codified pattern collected the 9 editorial integration principles (PRINCIPLES.md §4) into one frame so future hubs can reuse the composition without re-deriving it.

**When to use:**
- `/app/projects` first-arrival state (canonical instance)
- Future hub surfaces where the user is being onboarded to a *capability*, not just a list (e.g., a future Storyboards hub, References hub, Showcases hub)
- Any surface where empty/onboarding deserves brand voice rather than utilitarian copy

**When NOT to use:**
- Once the surface has data, switch to Browse (or Overview, depending on density). Editorial Hub is the empty-or-pre-conversion register.
- Forms, detail pages, dashboards, settings — these have their own frames.
- Pure marketing pages outside the app shell — those are landing surfaces (use the landing display type per TYPOGRAPHY_SPEC.md §3.1).

### Anatomy

```
┌────────────────────────────────────────────────────────────────────┐
│ [page header: small, no border-b, no seam below]                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─ Hero (asymmetric two-zone, py-8 lg:py-12) ────────────────────┐ │
│ │                                                                  │ │
│ │  LEFT ZONE — decision (informational, ~heavier weight)          │ │
│ │  ─────────────────────────────────────                          │ │
│ │  EYEBROW (uppercase, tracked)                                   │ │
│ │  SUIT headline                                                  │ │
│ │  spanning 3 lines                                               │ │
│ │  Sub copy, ≤2 sentences, muted.                                 │ │
│ │  • value bullet 1                                               │ │
│ │  • value bullet 2                                               │ │
│ │  • value bullet 3                                               │ │
│ │  [● CTA pill, inverted ↗]                                       │ │
│ │  (●●●●●) trusted by N studios                                   │ │
│ │                                                                  │ │
│ │  RIGHT ZONE — emotional (photographic, lighter informational)   │ │
│ │  ─────────────────────────────────────                          │ │
│ │  InteractiveVisualStack (1:1 ↔ 5:2 spring, image cross-fade)    │ │
│ │                                                                  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Workflow strip (no border-t separating; pt-16 lg:pt-20) ──────┐ │
│ │  WORKFLOW (eyebrow only, no h2)                                  │ │
│ │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │ │
│ │  │ icon   │ │ icon   │ │ icon   │ │ icon   │  soft layered      │ │
│ │  │ 01     │ │ 02     │ │ 03     │ │ 04     │  shadow, no border │ │
│ │  │ title  │ │ title  │ │ title  │ │ title  │                    │ │
│ │  │ body   │ │ body   │ │ body   │ │ body   │                    │ │
│ │  └────────┘ └────────┘ └────────┘ └────────┘                    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ CTA banner (inverted panel with depth, not flat slab) ────────┐ │
│ │  Title (SUIT bold, light)                                        │ │
│ │  Sub copy (muted-light)        [○ CTA pill, white-on-black ↗]   │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Composition rules

The frame is the canonical assembly of three component contracts:
- ProjectsHubHero (`COMPONENT_CONTRACTS.md §5.13`)
- ProjectsHubWorkflowStrip (§5.14)
- ProjectsHubCtaBanner (§5.15)

When generalizing this frame to a surface other than `projects` (e.g., a future `/app/storyboards`), the contracts are renamed (`StoryboardsHubHero`, etc.) but the structural rules below stay identical. The composition is the frame; the contracts are interchangeable.

#### Seamless composition
- **No border-b under the page header.** No `<hr>`, no horizontal rule, no seam between page header and hero.
- **No border-t between hero → workflow → cta-banner.** Sections are separated by spacing only.
- This is the rule the existing five frames *don't* enforce — most product frames are happy with subtle separators. Editorial Hub forbids them. (See ANTI_PATTERNS.md §10.1.)

#### Asymmetric weight
- Hero is two-zone: decision (left) + emotional (right). The decision zone carries more informational density; the emotional zone carries one InteractiveVisualStack.
- Equal-weight 50/50 splits are forbidden in this frame — they read as a SaaS feature page, not editorial.
- Recommended grid: `lg:grid-cols-2 gap-12 lg:gap-20`.

#### Typography
- Hero headline uses **SUIT Variable** (TYPOGRAPHY_SPEC.md §3.2 editorial-headline scale), not Pretendard.
- All other body / UI copy stays Pretendard.
- Eyebrows everywhere use the canonical pattern: `text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground` (TYPOGRAPHY_SPEC.md §3.2.x).

#### Achromatic
- The frame uses zero accent color. Any color exceptions (e.g., status badges) must come from outside this frame's responsibility — they belong in Browse / Detail surfaces *after* the user has converted past this frame.
- Amber accent is reserved for landing/marketing surfaces (PRINCIPLES.md §3) and is forbidden inside Editorial Hub instances on product routes.

#### Cards & shadows
- Workflow strip cards use **soft layered shadow** `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]`, never a 1px hard border.
- The CTA banner is an inverted panel with depth (inner highlight + outer soft shadow), never a flat black slab.

#### Motion
- Only motion in this frame comes from InteractiveVisualStack (spring layout transition + image cross-fade per INTERACTION_SPEC.md §10).
- The other two strips (workflow, cta-banner) are static.
- One spring-driven layout transition per viewport; the workflow strip and cta banner do not gain springs (INTERACTION_SPEC.md §10.7).

#### Photography
- Photography is content (PRINCIPLES.md §4.6). It carries tonal information that copy alone can't carry on the empty-state surface.
- Illustrations, icons, or 3D renders in place of photography are anti-pattern for this frame.

### Localization
- All copy in `messages/{ko,en}.json` under the surface namespace (e.g., `projects.hero_*`, `projects.cta_*`).
- Korean headline uses `keep-all` for word-break.
- Headline line breaks via `whitespace-pre-line` + `\n` in i18n strings, not `<br>`.

### Responsive
- Mobile: single column, right-zone (visual stack) below left-zone, spring degrades to static.
- Tablet (md): hero two-column begins, workflow grid 2-col.
- Desktop (lg+): full canonical layout.

### Empty state
This frame *is* the empty state. Once the surface has data, switch the page composition to Browse (with a smaller editorial hero kept as a header band only if the surface continues to need brand voice; otherwise drop it entirely).

### Permissions
If the user lacks access to the underlying capability, do **not** render this frame — fall back to the standard "no access" page composition (see Composition rules → Permissions below). Editorial voice is wasted on a 403.

### Cross-references
- Component contracts → `COMPONENT_CONTRACTS.md §5.11`–`§5.15`
- Editorial integration principles → `PRINCIPLES.md §4`
- Composition anti-patterns this frame avoids → `ANTI_PATTERNS.md §10`
- Two-font system + headline scale → `TYPOGRAPHY_SPEC.md §3.2`
- Layout-changing transition (visual stack) → `INTERACTION_SPEC.md §10`
- Calibration reference (isomeet.com) → `REFERENCES.md`

---

## Composition rules across frames

### Navigation chrome (global, not per-frame)
- Left sidebar: persistent nav. Never collapsible on desktop. Collapsible on tablet. Hidden behind a menu button on mobile.
- Top bar: breadcrumb + search + user avatar. Fixed to viewport top. `56px` tall.
- Sidebar width: `240px` default, `200px` in compact mode.

### Loading states
- Every frame has a skeleton variant. Skeletons match the final layout's bone structure, not a generic "loading rectangle."
- No spinners for page loads. Skeletons only.
- Spinners are allowed inside buttons during action ("Saving…") and inside small data regions during refresh.

### Error states (page-level)
- Full-page error: headline + explanation + retry CTA. Never a stack trace to the user.
- In-section error: inline alert with retry. Let the rest of the page continue working.

### Permissions and empty due to access
If a user lacks permission for a frame or object, show:
> **You don't have access to this [project].**  
> Ask the workspace admin for access, or go back.  
> `[← Back]`

Never show a generic 403. Never silently hide content without telling the user why.

---

## Choosing a frame: worked example

**Spec:** "A page where users can see all their pending invoices and issue new ones."

Wrong: one giant Overview with a list section + a create section + a stats section.

Right: 
- `/app/invoices` is a Browse frame (list of invoices with filters).
- `[New invoice]` CTA opens a Create / Edit frame (separate page or drawer).
- Detail of an issued invoice is a Detail frame.
- Overview of monthly revenue is a section in the Workspace Overview frame (`/app`), not mixed into the invoices page.

Three frames, each doing one thing. Not one frame trying to do three.
