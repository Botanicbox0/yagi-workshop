# Design-System Compliance Audit — COMPLIANT (Exemplars)

> Audit date: 2026-04-22
> Scope: `src/components/**` (excluding `src/components/ui/`) and `src/app/**/page.tsx`
> Purpose: highlight exemplar files that model the design system well. Use these as reference when implementing Phase 2.5 surfaces.

---

### Home hero-block: editorial minimal done right
- **File:** src/components/home/hero-block.tsx
- **Why it models the system:** Single Display-tier headline, L5 eyebrow label in `label-caps` tabular numerals, deliberate use of `keep-all` for Korean linebreaks, a single primary CTA, and the editorial vertical hairline at 1/3 from left is the exact "decoration must carry information" standard from PRINCIPLES §2.5.
- **Spec refs honored:** PRINCIPLES §3 (light surface, quiet chrome), §4 (L1–L5), §2.5 (visual restraint); TYPOGRAPHY_SPEC §5.1 (one Display per screen); ANTI_PATTERNS §2.1 (no gradient hero).
- **Worth reusing:** The `01 — Studio` / `Seoul / 2026` editorial eyebrow pattern and the hairline-as-structural-element approach. Great reference for Phase 2.5 public challenge landing.

---

### ServicesTriad: hairline-separated editorial sections
- **File:** src/components/home/services-triad.tsx
- **Why it models the system:** Three-up grid without cards, separated by hairline `border-black/10` (should be `border-border` per CRITICAL but semantically correct structurally), ordinal labels (01/02/03) acting as L5 eyebrows, one `font-display` heading per cell, body text in `text-muted-foreground` with `keep-all`.
- **Spec refs honored:** UI_FRAMES §Frame 1 KPI tile pattern (typography-first, no background color), PRINCIPLES §4 hierarchy, TYPOGRAPHY_SPEC §9.5 (mixed KR/EN handled natively).
- **Worth reusing:** The "numbered ordinal + hairline divider + no card background" composition is the correct way to present 3–5 sibling items.

---

### Meetings list page: canonical Browse frame table
- **File:** src/app/[locale]/app/meetings/page.tsx
- **Why it models the system:** Correct Browse frame — hairline-separated rows (`border-b border-border`), column headers with `font-medium text-muted-foreground`, tabular numerals on date column, responsive hide via `hidden md:table-cell`, primary identifier left-aligned with link, status badges right-adjacent, no zebra striping.
- **Spec refs honored:** UI_FRAMES §Frame 2 Browse, COMPONENT_CONTRACTS §5.6 Data table, TYPOGRAPHY_SPEC §9.6 tabular numerals.
- **Worth reusing:** Use this as the template for Phase 2.5 challenges list and admin submission review table.

---

### Meeting detail page header: clean L1–L5 with status badges
- **File:** src/app/[locale]/app/meetings/[id]/page.tsx:130-200
- **Why it models the system:** Breadcrumb L1 in nav, status badges as L4 supporting info, single `font-display` H1 as L2, overflow menu pushed to top-right as L5. The cancelled banner at :193 uses the correct `border-destructive/40 bg-destructive/5 text-destructive` semantic-token pattern — opposite of the raw `bg-red-50` pattern flagged elsewhere.
- **Spec refs honored:** UI_FRAMES §Frame 3 Detail, PRINCIPLES §4 L1–L5 hierarchy, COMPONENT_CONTRACTS §5.8 (correct semantic tone for destructive alerts).
- **Worth reusing:** The destructive-alert token pattern on :193 is the CANONICAL fix for every `bg-red-50` violation in the CRITICAL report.

---

### Sidebar composition (outer shell)
- **File:** src/components/app/sidebar.tsx
- **Why it models the system:** Fixed `w-[240px]` matches UI_FRAMES §Composition ("Sidebar width: 240px default"), clean three-zone layout (workspace switcher / nav / user menu) with border-separated regions, uses `bg-background` and `border-border` tokens throughout — no raw colors at the outer-shell level.
- **Spec refs honored:** UI_FRAMES §Composition navigation chrome, PRINCIPLES §3.
- **Worth reusing:** This is the correct outer shell to nest under Phase 2.5's new `/u/[handle]` profile views if they need sidebar chrome.

---

### New-project page: single-column Create/Edit frame
- **File:** src/app/[locale]/app/projects/new/page.tsx
- **Why it models the system:** `max-w-2xl mx-auto` centered form container at correct width (UI_FRAMES §Frame 4 "Max 600px form width" — close enough to 2xl=672px for Korean wrap), single `font-display` H1, hands off to a client-side wizard component (correct Server→Client boundary per CLAUDE.md architecture rule #1).
- **Spec refs honored:** UI_FRAMES §Frame 4 Create/Edit, TYPOGRAPHY_SPEC §9.4 (Korean line-length).
- **Worth reusing:** This is the skeleton Phase 2.5's "new challenge submission" form should follow — server wrapper + client wizard body.

---

### Sign-in page: form primitives used correctly
- **File:** src/app/[locale]/(auth)/signin/page.tsx
- **Why it models the system:** Uses `<Label>`, `<Input>`, `<Button>` primitives exclusively; inline validation via RHF; errors below field at `text-xs text-destructive` (on-scale, semantic token); centered form layout inside the auth chrome; single `font-display` H1 for page-level brand moment.
- **Spec refs honored:** COMPONENT_CONTRACTS §5.2 Input field (label visible, helper/error below, programmatic association via `htmlFor`); CLAUDE.md architecture rule #5 (RHF + Zod).
- **Worth reusing:** Direct template for Phase 2.5 submit form — every field should use the `<Label> + <Input> + errors` triple exactly as here. Contrast with `src/components/share/comment-form.tsx` which uses raw `<input>` tags.

---

### Sidebar workspace switcher + user menu
- **File:** src/components/app/sidebar-workspace-switcher.tsx & src/components/app/sidebar-user-menu.tsx
- **Why it models the system:** Consumes `Avatar`, `DropdownMenu` shadcn primitives; `bg-accent` hover states using semantic tokens; Korean-safe truncation with `max-w-xs` and `truncate`. Though `sidebar-user-menu.tsx:40-41` uses `text-[13px]` / `text-[11px]` (off-scale — flagged in CRITICAL), the component structure is otherwise correct.
- **Spec refs honored:** COMPONENT_CONTRACTS §5.3 Select (trigger + option list), PRINCIPLES §3 (token-backed hover).
- **Worth reusing:** The `<DropdownMenu><DropdownMenuTrigger asChild>` pattern is the right approach for Phase 2.5's role-switch menu (Creator ↔ Studio ↔ Observer).

---

### Empty state on projects page
- **File:** src/app/[locale]/app/projects/page.tsx:188-204
- **Why it models the system:** Hairline-dashed container (`border-dashed border-border rounded-lg`), `font-display` italic title, supporting sub-line in muted foreground, single primary CTA. Matches UI_FRAMES §Frame 2 ("No items at all: short explanation + primary action") almost exactly.
- **Spec refs honored:** UI_FRAMES §Frame 2 empty-state, COMPONENT_CONTRACTS §5.7 Empty state, PRINCIPLES §12.8 ("Generic empty state … Empty state = explanation + next action").
- **Worth reusing:** Template for every Phase 2.5 empty list (no submissions yet, no entered challenges, empty profile gallery).

---

### Team chat channel-view header structure
- **File:** src/components/team/channel-view.tsx:278-340
- **Why it models the system:** Clean row with `#` channel name (primary identifier L2), slug in mono typography for developer flavor, `topic` in muted, icon-only action buttons with `aria-label` per COMPONENT_CONTRACTS §5.1 (icon-only accessibility rule), fixed 8×8 icon-button size matching 44px tap-target spirit. Uses `truncate max-w-xs` for Korean safety.
- **Spec refs honored:** COMPONENT_CONTRACTS §5.1 Button (icon-only `aria-label`), PRINCIPLES §11 Korean width, UI_FRAMES §Frame 3 Detail header.
- **Worth reusing:** The icon-button pattern (ghost + size="icon" + aria-label) is the right template for Phase 2.5 row actions. The color pill at :292 should NOT be copied (flagged CRITICAL).

---

## Summary: patterns worth propagating to Phase 2.5

1. **Use `border-destructive/40 bg-destructive/5 text-destructive` for error banners** (meeting detail cancelled banner). Avoid every `bg-red-50`.
2. **Hairline-separated tables for Browse** (meetings list). Avoid card-grid unless visual-asset dominant.
3. **`max-w-2xl` centered single-column form, server page + client wizard** (projects/new). Avoid two-column forms except strongly-paired fields.
4. **Icon-button = ghost + size="icon" + aria-label** (channel-view header). Never naked buttons.
5. **`<Label> + <Input> + text-destructive error below field`** (signin). Never raw `<input>`.
6. **Numbered L5 eyebrow + hairline section divider + single Display H1** (hero-block, services-triad). The editorial voice of the brand.
7. **Dashed-border centered empty state with `font-display` italic title + single CTA** (projects empty state). Every Phase 2.5 empty surface should match.
