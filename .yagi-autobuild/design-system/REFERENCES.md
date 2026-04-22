# YAGI Design References

> **Role:** A curated list of product sites and apps whose design craft matches YAGI's direction. Used for calibration — not for copying.
> **When to consult:** Before designing any new screen. Pick 1–2 references relevant to the frame, study them on the live site, then design.
> **Update cadence:** When a new screen type ships, add its best-in-class reference here.

---

## Core calibration set (always relevant)

These are the five products whose design philosophy most closely matches YAGI's. Any YAGI screen should be defensible against what these products ship for a similar problem.

### 1. Linear (light mode) — `linear.app`
**Why reference:** Density without clutter. State clarity at glance. Keyboard-first. Restrained motion. Single warm-neutral accent in a mostly achromatic palette.

**Study for:**
- Browse frames (issue list, project list)
- Table row rhythm, sticky headers, filter chips
- Status badges (pill shape, uppercase tracking, semantic color used only as fill)
- Command palette (Cmd+K pattern)
- Empty states — "No issues match" messaging

**Avoid copying:**
- Linear's dark mode — we're light-first.
- The blue accent — our accent is warm neutral amber.

### 2. Webflow — `webflow.com` (marketing + dashboard)
**Why reference:** Editorial typographic hierarchy on a light surface. Generous whitespace. Section rhythm without relying on cards. Modern grotesk as identity.

**Study for:**
- Public surfaces (landing, showcase, journal)
- Large display typography treatment
- Section break patterns (hairline + label, never colored blocks)
- Button styling — solid black CTAs on white

**Avoid copying:**
- The animated hero — we don't do decorative motion on landings.
- Bento grid feature sections for admin surfaces — that's marketing language, not working tool language.

### 3. Stripe Dashboard — `dashboard.stripe.com` (light)
**Why reference:** Data-heavy editorial. Invoices, transactions, payouts rendered with typographic care instead of dashboard flair. Near-black on white, warm off-white surfaces, hairline everything.

**Study for:**
- Detail frames with metadata rails
- Numeric tables (monospace figures, right alignment, totals)
- Financial records (invoice pages, payout breakdowns)
- Inline actions ("refund", "void") attached to specific rows

**Avoid copying:**
- Stripe's purple accent — we don't have a color accent for primary actions.
- Deep dashboard nav sprawl — we keep nav flat.

### 4. Height — `height.app`
**Why reference:** Multi-view project management. Shows how the same data can be list / board / timeline without feeling different. Workspace/channel structure matches YAGI's team chat + project model.

**Study for:**
- Projects list + detail combination
- Channels + threads navigation
- Density toggles in action
- Multi-view switches (list ↔ board) when needed

**Avoid copying:**
- The emoji-heavy channel tone — we're editorial, not playful.

### 5. Read.cv / Bento.me style portfolio sites
**Why reference:** Extreme typographic restraint on white. Pure text-first layouts that still feel designed. Template for the public showcase page.

**Study for:**
- Showcase public page (the client-facing deliverable)
- Long-form reading pages (journal, case studies)
- How whitespace alone creates rhythm

**Avoid copying:**
- These are portfolio sites, not tools. Don't import their sparseness into dense admin surfaces.


---

## Secondary references (problem-specific)

### For Overview frames
- **Vercel dashboard** — `vercel.com/dashboard`. KPI tile treatment, activity feed density, "what needs attention" patterns.
- **Raycast** — `raycast.com`. Command-palette as an overview accelerator.

### For Create / Edit frames
- **Stripe invoice editor** — shows how to make financial forms feel editorial rather than spreadsheet-y.
- **Notion form view** — field patterns, helper text placement, section separators.

### For Workflow frames
- **Stripe Atlas** — `stripe.com/atlas`. Multi-step onboarding with progress dots and save-and-exit.
- **Tally.so** — form wizards with exemplary step pacing.

### For showcase public pages (Phase 1.9, expanding)
- **Read.cv** (original) — portfolio editorial.
- **Are.na channels** — `are.na`. How to show a collection of work as a readable feed.
- **Editorial.fm** — typographic long-form treatment.

### For internal team chat (Phase 1.7)
- **Campfire (37signals)** — `once.com/campfire`. Calm, readable, no flash. Opposite of Slack.
- **Height channels** — structured channel + thread model on a light surface.

### For email templates (notifications, meeting summaries)
- **Notion email** — black on white, tight hierarchy.
- **Linear email** — status updates in pure typography.
- **Resend email templates** — dev.to / Vercel email examples in their docs.

---

## What NOT to reference

Even if they're celebrated elsewhere, these are **off-palette for YAGI Workshop**:

- **Material Design 3** — too system-y, too colorful, elevation dogma doesn't match our restraint.
- **Shopify Polaris** — too much chrome, too retail.
- **Atlassian / Jira** — we're the opposite aesthetic.
- **Slack** — too casual, too emoji-heavy, too playful.
- **Intercom / HubSpot** — SaaS template look that we explicitly avoid.
- **Discord** — gamer aesthetic, dark, saturated. Wrong genre.
- **Microsoft Fluent** — Windows-specific, not web-native feel.
- **Google Material You** — dynamic color theming conflicts with our disciplined palette.

---

## How to use references — the actual workflow

When designing a new screen:

1. **Pick the frame** from `UI_FRAMES.md`.
2. **Pick 1 or 2 references** from the Core set or the problem-specific list.
3. **Open the reference live.** Look at their solution for the exact problem you're solving. Don't use screenshots from design blogs — they're outdated and filtered through someone else's editorial.
4. **Identify 3 things to learn** and 1 thing to deliberately NOT copy. Write these into the phase spec's "Design references" subsection.
5. **Never copy 1:1.** Calibration means matching quality and intent, not pixels.
6. **Log the reference** in the phase spec so future phases can trace design decisions.

### Example entry in a phase spec
```
## Design references (Phase 2.5 / Challenges list page)

Frame: Browse (see UI_FRAMES.md §Frame 2)

References studied:
- Linear — issue list (linear.app). Learned: sticky filter bar, status pill treatment, keyboard nav. 
  NOT copying: dark mode, blue accent.
- Webflow — templates library (webflow.com/templates). Learned: card-grid treatment for visually 
  distinct items, hairline dividers. NOT copying: decorative category badges.

Resulting approach: table-first browse with a toggle to card view for the rare case of featured 
challenges with hero imagery. Filters are Linear-style chips. Row states follow our amber active 
accent instead of Linear's blue.
```

---

## Maintaining this list

- Add new references when a new frame type or new problem area ships.
- Remove references when they redesign in a direction we don't follow.
- Re-verify links quarterly — product sites change.
- If a reference drifts away from the YAGI direction (e.g., goes dark-only, adds heavy motion), move it to the "What NOT to reference" list with a note.

Last updated: 2026-04-22 (initial draft).
