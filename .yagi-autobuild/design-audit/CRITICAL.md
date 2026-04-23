# Design-System Compliance Audit — CRITICAL

> Audit date: 2026-04-22
> Scope: `src/components/**` (excluding `src/components/ui/`) and `src/app/**/page.tsx`
> Audit target: violations that break design-system invariants (PRINCIPLES §3, §7; TYPOGRAPHY_SPEC §4.2, §14.1; ANTI_PATTERNS §2–§7). These MUST be fixed before any Phase 2.5 UI work lands.
>
> Phase 2.5 target surfaces (challenge submit form, challenge detail, user profile) will inherit patterns from: `src/app/[locale]/app/projects/new/**`, `src/app/[locale]/app/projects/[id]/page.tsx`, `src/app/s/[token]/page.tsx`, `src/components/share/*` (public-facing creator feedback — the closest precedent for public challenge UX). Findings touching those files are marked `[BLOCKS 2.5]`.

---

### Hardcoded Tailwind grays replace semantic tokens across the public share surface `[BLOCKS 2.5]`
- **File:** src/app/s/[token]/page.tsx:56, 134, 197, 221, 254, 260, 329-330, 346, 387, 410, 449, 470
- **Violation:** Extensive use of raw Tailwind `text-gray-300/400/500/600/700` and `bg-gray-100/200` instead of semantic tokens (`text-muted-foreground`, `bg-muted`, `border-border`). Entire public share page — the closest analogue for the upcoming challenge detail / submit — bypasses the token system.
- **Spec ref:** PRINCIPLES.md §7 (Color as meaning), COMPONENT_CONTRACTS.md §2.2 (Variables first), ANTI_PATTERNS.md §4 (Writing token values inline).
- **Why it matters:** Public-facing screen is the model Phase 2.5 submit/profile/gallery will copy. Every gray value drifts from the neutral scale defined in `PRINCIPLES.md`; dark-mode and brand evolution break silently.
- **Recommended fix:** Replace all `text-gray-*` with `text-muted-foreground` (or `text-foreground`), `bg-gray-100` with `bg-muted`, `border-gray-*` with `border-border`. Use semantic tokens only.

---

### Hardcoded black/white color values in share action buttons `[BLOCKS 2.5]`
- **File:** src/components/share/approve-button.tsx:72, 81, 86, 98, 106, 113; src/components/share/comment-form.tsx:93, 102, 110, 115; src/components/share/fast-feedback-bar.tsx:192, 202, 212, 217, 227
- **Violation:** Components use `bg-black`, `text-white`, `bg-gray-900`, `border-gray-200`, `focus:ring-black` directly instead of `bg-primary`/`bg-foreground`, `text-primary-foreground`, `focus:ring-ring`.
- **Spec ref:** PRINCIPLES.md §3 (aesthetic direction: primary action is `solid black` but via token), COMPONENT_CONTRACTS.md §2.2, §5.1.
- **Why it matters:** The three "public creator feedback" components (approve, comment, reactions) are functionally the closest precedent for the Phase 2.5 submit form and vote buttons. Hardcoding breaks dark mode and any future accent-token migration.
- **Recommended fix:** Re-theme each to `bg-foreground text-background hover:bg-foreground/90`, border-input on inputs, `focus-visible:ring-ring`. Raise a shared public-action button variant if patterns repeat.

---

### Status pill palette uses raw Tailwind color scales instead of semantic tokens
- **File:** src/app/[locale]/app/projects/page.tsx:38, 45; src/app/[locale]/app/projects/[id]/page.tsx:111, 118; src/app/[locale]/app/admin/projects/page.tsx:47, 54; src/app/[locale]/app/admin/page.tsx:24, 26, 28; src/app/[locale]/app/admin/invoices/page.tsx:58, 60, 62
- **Violation:** `statusBadgeClass` helpers return hardcoded `bg-blue-100 text-blue-700`, `bg-green-100 text-green-700`, `bg-red-100 text-red-700`, `bg-amber-100 text-amber-700` strings.
- **Spec ref:** PRINCIPLES.md §7 ("Color is a semantic channel"), UI_FRAMES.md §Detail/Status ("Status badge uses a small pill … Colors follow semantic palette"), COMPONENT_CONTRACTS.md §2.2.
- **Why it matters:** Each page re-invents its own semantic color mapping, producing 4+ slightly different "success greens." There is no documented mapping between status → semantic token. Phase 2.5 challenge states (DRAFT/OPEN/CLOSED_JUDGING/CLOSED_ANNOUNCED/ARCHIVED) will add a 5th dialect.
- **Recommended fix:** Introduce semantic tokens (e.g., `--success-bg`, `--success-fg`, `--warning-bg`, `--info-bg`) in `globals.css`, then centralize a single `statusBadgeClass` helper in `src/lib/ui/status.ts` consumed everywhere.

---

### Font sizes below the 12px floor — sub-caption typography
- **File:** src/components/preprod/board-editor.tsx (17 occurrences of `text-[10px]` on lines 389, 409, 566, 571, 612, 617, 765, 792, 2433, …); src/components/showcases/showcase-editor.tsx:665, 1292, 1325, 1343; src/components/app/sidebar-user-menu.tsx:37; src/components/meetings/attendees-list.tsx:74, 82; src/app/[locale]/app/projects/[id]/page.tsx:783; src/app/[locale]/app/invoices/page.tsx:313; many more
- **Violation:** Arbitrary `text-[10px]` applied to badges, captions, and meta-rows. Typography scale floor is 12px; label floor is 12px.
- **Spec ref:** TYPOGRAPHY_SPEC.md §4.2 (scale: 12/14/16/18/20/24/28/32/40/48), §14.1 ("Body text: never below 14px; Caption: 12px is the floor; Label: 12px floor").
- **Why it matters:** Fails WCAG/AA legibility minimums at real zoom levels. Especially hostile to Korean readers (Pretendard glyphs disintegrate below 12px). Phase 2.5 submission cards and profile meta will be tempted to copy this pattern.
- **Recommended fix:** Audit every `text-[10px]` — replace with `text-xs` (12px) at minimum. If a design needs a 10px badge, the design is wrong per TYPOGRAPHY_SPEC §14.1; use weight/uppercase + `label-caps` for hierarchy instead.

---

### Off-scale font sizes: `text-[11px]` and `text-[13px]` bypass the type scale
- **File:** src/components/app/sidebar-nav.tsx:114 (`text-[13px]`); src/components/app/sidebar-user-menu.tsx:40, 41; src/components/app/notification-panel.tsx:217, 237, 240; src/components/team/channel-view.tsx:292, 501, 561, 701, 736; src/components/invoices/invoice-editor.tsx:257, 474, 553, 873, 978; src/components/preprod/board-editor.tsx (multiple); src/app/[locale]/app/admin/invoices/page.tsx:322, 333, 351, 361, 380, 391, 415, 479, 493, 499, 528, 585, 618
- **Violation:** Arbitrary 11px/13px values that do not exist in the type scale `12/14/16/18/20/24/28/32/40/48`.
- **Spec ref:** TYPOGRAPHY_SPEC.md §4.2 + §16 ("All text uses a role token, not a raw size"), ANTI_PATTERNS.md §4 ("Inventing new typography sizes outside TYPOGRAPHY_SPEC.md §4.2 without an ADR").
- **Why it matters:** Over 50 violations across admin + core app chrome. Breaks the 4pt vertical rhythm (line-heights no longer grid-align), and makes dark-mode / density-mode scaling impossible. Sidebar at 13px is core navigation chrome — its drift is systemic.
- **Recommended fix:** Replace `text-[11px]` with `text-xs` (12px) or `text-sm` (14px) depending on role; replace `text-[13px]` with `text-sm` (14px) universally. If sidebar nav truly needs 13px, open an ADR to add a `label-xs` scale step — do not keep ad-hoc values.

---

### `focus:outline-none` without matching `focus-visible:ring` on multiple inputs
- **File:** src/components/share/fast-feedback-bar.tsx:202, 212; src/components/share/comment-form.tsx:93, 102, 110; src/components/share/approve-button.tsx:98; src/components/preprod/new-board-form.tsx:79; src/components/invoices/new-invoice-form.tsx:116; src/components/preprod/board-editor.tsx:2054 (`outline-none` alone)
- **Violation:** `focus:outline-none` combined with only `focus:ring-*` (not `focus-visible:ring-*`). On click the ring appears but keyboard-only focus can be ambiguous; on `board-editor.tsx:2054` the outline is removed with no ring replacement at all.
- **Spec ref:** PRINCIPLES.md §10 ("Keyboard navigation is first-class … never `outline: none` without a replacement"), ANTI_PATTERNS.md §6 (Accessibility shortcuts), INTERACTION_SPEC.md §4.2 (focus rings are instant).
- **Why it matters:** Keyboard users lose orientation. The share surface is public — WCAG AA is a legal minimum, not aspirational.
- **Recommended fix:** Standardize on `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` (pattern already used in `src/components/ui/input.tsx`). For `board-editor.tsx:2054` add `focus-visible:border-foreground` or similar visible state.

---

### Hardcoded destructive alert styling duplicates `destructive` token semantics
- **File:** src/components/invoices/invoice-editor.tsx:867, 882 (`border-red-200 bg-red-50 text-red-900`); src/components/team/channel-view.tsx:294, 295, 337 (`bg-yellow-100/red-100/red-50`); src/app/[locale]/app/admin/invoices/page.tsx:316, 374 (same pattern)
- **Violation:** Inline red/yellow scales for error/warning banners instead of consuming `destructive`/`warning` tokens.
- **Spec ref:** PRINCIPLES.md §7 (semantic colors), COMPONENT_CONTRACTS.md §5.8 (toast tone tokens), §2.2 (variables first).
- **Why it matters:** The design system only has `--destructive` (red) defined; there is NO warning/info token. These files are inventing a parallel system. Multiple invoice components must look identical in error state; today they don't.
- **Recommended fix:** Add `--warning`, `--info`, `--success` tokens (bg + fg pair each) to `globals.css`. Then refactor banners to `bg-destructive/5 border-destructive/40 text-destructive` pattern (already used correctly at `src/app/[locale]/app/meetings/[id]/page.tsx:193`).

---

### Multiple `rounded-2xl` / `rounded-xl` radii in share modals violate radius tokens
- **File:** src/components/share/approve-button.tsx:81 (`rounded-2xl`); src/components/share/revision-compare.tsx:78 (`rounded-2xl`); src/components/share/fast-feedback-bar.tsx:192 (`rounded-xl`); src/components/share/comment-form.tsx:93 (`rounded-xl`)
- **Violation:** Uses 12px/16px radii; design system defines 6px (inputs/buttons), 8px (cards/panels) only.
- **Spec ref:** PRINCIPLES.md §3 ("Radius: 6px for inputs/buttons, 8px for cards/panels, 0 for table rows. Consistent, not playful."), ANTI_PATTERNS.md §2.1 ("Rounded everything — border-radius > 16px on cards").
- **Why it matters:** `rounded-2xl` on a modal panel is the generic-SaaS tell explicitly called out in ANTI_PATTERNS §2.1. Public share = first external impression.
- **Recommended fix:** All cards/panels → `rounded-lg` (= 8px via `--radius`). Inputs → `rounded-md` (= 6px). Keep `rounded-full` only for pills/avatars.

---

### Status pill re-definition lives in page files, not a shared contract
- **File:** src/app/[locale]/app/projects/page.tsx:33-51; src/app/[locale]/app/projects/[id]/page.tsx:106-124; src/app/[locale]/app/admin/projects/page.tsx:42-60; src/app/[locale]/app/admin/invoices/page.tsx:53-66; src/app/[locale]/app/meetings/page.tsx:24-39; src/app/[locale]/app/admin/page.tsx:19-32
- **Violation:** Six separate `statusBadgeClass` / `getStatusBadgeVariant` functions, each making subtly different choices for the same semantic state. No shared util.
- **Spec ref:** PRINCIPLES.md §2.6 (System consistency), COMPONENT_CONTRACTS.md §5.6 (status column alignment), UI_FRAMES.md §Detail ("Status badge … Colors follow semantic palette").
- **Why it matters:** "Active" is `bg-foreground text-background` in projects but `bg-blue-100 text-blue-700` in admin. Users cross-reference these screens — inconsistency reads as bugs. Phase 2.5 will add challenge statuses and repeat the mistake.
- **Recommended fix:** Extract a single `src/lib/ui/status-pill.ts` exposing `statusPill(kind, status)` that returns `{ className, variant, label }`. Page code just calls it.

---

### `<form>` inputs in share bypass `<Input>` / `<Textarea>` UI primitives `[BLOCKS 2.5]`
- **File:** src/components/share/comment-form.tsx:88-111; src/components/share/approve-button.tsx:93-100; src/components/share/fast-feedback-bar.tsx:197-213
- **Violation:** Raw `<input>` / `<textarea>` with ad-hoc classes instead of the existing `<Input>` / `<Textarea>` shadcn primitives.
- **Spec ref:** COMPONENT_CONTRACTS.md §5.2 (Input field contract), §2.3 (Base + variant + state), PRINCIPLES.md §2.6 (System consistency).
- **Why it matters:** The share pattern is the direct precedent for Phase 2.5 public submit form. Duplication means every state (error, disabled, focus) has to be re-invented. The `<Input>` primitive already handles focus-ring, disabled, and dark-mode — these raw inputs do none of that.
- **Recommended fix:** Port comment-form / approve-button / fast-feedback-bar to `<Input>`, `<Textarea>`, `<Label>`, `<Button>`. Delete the ad-hoc class strings.

---

### Landing home page uses `bg-black/10` and `bg-black/20` instead of tokens
- **File:** src/components/home/hero-block.tsx:16, 51; src/components/home/services-triad.tsx:27, 49, 56; src/components/home/title-emphasis.tsx (presumed similar)
- **Violation:** `bg-black/10`, `border-black/10`, `text-foreground/90` mix token-aware opacity with raw `black` — the rest of the system uses `--border` and `--foreground`.
- **Spec ref:** PRINCIPLES.md §3 ("Borders: `#EAEAEA` hairlines"), COMPONENT_CONTRACTS.md §2.2, ANTI_PATTERNS.md §4 (inline token values).
- **Why it matters:** Hairline dividers here won't dark-mode flip, producing visible black seams on any future dark variant. Public landing page is the first impression.
- **Recommended fix:** Swap `bg-black/10` → `bg-border`, `border-black/10` → `border-border`, `text-foreground/90` → `text-foreground` (or the muted token if lighter weight is needed).

---

### Inline `rounded-full uppercase tracking-[0.12em]` CTA pattern repeated, not componentized
- **File:** src/app/[locale]/app/projects/page.tsx:199; src/app/[locale]/app/meetings/page.tsx:118; and multiple "new X" empty-state CTAs across app pages
- **Violation:** Every "new project / new meeting / create-X" button is a bespoke anchor with `rounded-full uppercase tracking-[0.12em] px-6 py-3 bg-foreground text-background` rather than using the `<Button>` primitive with a consistent `pill` size variant.
- **Spec ref:** COMPONENT_CONTRACTS.md §5.1 (Button — variants; no `blue-button`-style one-offs), §4.2 (combo classes for variants), PRINCIPLES.md §2.6 (reusable rule over one-off).
- **Why it matters:** Inconsistent paddings across screens (`px-5 py-2` vs `px-6 py-3`); arbitrary tracking values outside the tracking scale. Phase 2.5 will add another CTA variant for submissions unless this is consolidated.
- **Recommended fix:** Add a `pill` size or `cta` variant to `src/components/ui/button.tsx` that bakes in `rounded-full`, `uppercase`, `tracking-widest`, and canonical padding. Replace the hand-rolled anchors.

---

### `text-[0.8rem]` in UI form primitives (12.8px — off-scale) contaminates system components
- **File:** src/components/ui/form.tsx:138, 160; src/components/ui/calendar.tsx:90, 99
- **Violation:** `text-[0.8rem]` is neither 12px nor 14px — it is 12.8px, snapped to nothing in the type scale. Although `ui/` is out of audit scope, form.tsx/calendar.tsx are consumed by every form in the app including Phase 2.5's submit form.
- **Spec ref:** TYPOGRAPHY_SPEC.md §4.2, §16.
- **Why it matters:** FLAGGED even though `ui/` is shadcn territory — this specific token is ubiquitous (every field description/error uses it). Phase 2.5 forms will render at 12.8px for helper/error text by default.
- **Recommended fix:** Change `text-[0.8rem]` → `text-xs` (12px) or `text-sm` (14px) per role. This is a one-line change that affects every form simultaneously; worth doing as part of the Phase 2.5 prep even if `ui/` is normally shadcn-owned.
