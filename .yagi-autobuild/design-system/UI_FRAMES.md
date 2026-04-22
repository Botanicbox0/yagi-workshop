# YAGI UI Frames

> **Role:** Five frame blueprints. Before any screen is designed or implemented, pick exactly one frame. The frame determines skeleton, hierarchy, and primary interactions. Aesthetic is applied on top — never the other way around.
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

If a screen feels like "all five at once," you have a composition problem. Split into sub-screens or tabs, each with one frame.


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
