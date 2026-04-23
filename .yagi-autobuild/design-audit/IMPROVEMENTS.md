# Design-System Compliance Audit — IMPROVEMENTS

> Audit date: 2026-04-22
> Scope: `src/components/**` (excluding `src/components/ui/`) and `src/app/**/page.tsx`
> Audit target: opportunities where code works but drifts from preferred patterns. Nice-to-fix; does not block Phase 2.5.

---

### Projects Browse uses card grid where table is the default
- **File:** src/app/[locale]/app/projects/page.tsx:207-263
- **Violation:** Uses `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3` of bordered cards for the projects list.
- **Spec ref:** UI_FRAMES.md §Frame 2 — Browse ("Tables are the default for Browse. Cards are reserved for the rare case where each item has a dominant visual asset").
- **Why it matters:** Scan efficiency drops; no column sort/filter mapping; inconsistent with the parallel `/meetings` and `/invoices` pages which correctly use tables.
- **Recommended fix:** Convert to the same table pattern used in `src/app/[locale]/app/meetings/page.tsx` (hairline rows, sticky header, right-aligned actions). Reserve card-grid only if/when project covers become a dominant visual asset.

---

### Mixed KPI styling across admin dashboards
- **File:** src/app/[locale]/app/admin/invoices/page.tsx:314-403
- **Violation:** KPI "tiles" wrap in colored card backgrounds (`bg-red-50`, `border-red-200`) when the metric is positive; UI_FRAMES §Overview explicitly forbids colored backgrounds for KPI tiles.
- **Spec ref:** UI_FRAMES.md §Frame 1 — Overview ("KPI tiles are not cards. They are typographic blocks with a top-rule or hairline separator. No background color, no shadow.").
- **Why it matters:** Communicates "alert!" via background color alone; the typographic hierarchy (tiny label → large number → tiny delta) is buried under the red tint. Also breaks the "borders XOR shadows" rule.
- **Recommended fix:** Keep the border but drop the red tint. Show the alerting state via a semantic number color and a caption ("3 overdue") — let typography carry the weight.

---

### Status badge colors communicate state through color alone for some transitions
- **File:** src/app/[locale]/app/projects/page.tsx:42 (`in_discovery` / `in_production` / `in_revision` all mapped to the same black pill)
- **Violation:** Three distinct statuses collapse to one visual.
- **Spec ref:** COMPONENT_CONTRACTS.md §9.3 (forbidden state patterns: communicating state through color alone), PRINCIPLES.md §10 (non-color signal required).
- **Why it matters:** The only difference between "in_discovery" and "in_production" in the table is the label text. An icon or subtle prefix marker would help scan.
- **Recommended fix:** Either give each a distinct neutral hairline outline, or add a small icon marker (dot cluster / phase numeral) in addition to the label.

---

### Sidebar nav uses off-scale `text-[13px]` as the canonical nav type
- **File:** src/components/app/sidebar-nav.tsx:114
- **Violation:** Nav label typography at 13px — halfway between `label-sm` (12px) and `label` (14px).
- **Spec ref:** TYPOGRAPHY_SPEC.md §5.5 (Label scale).
- **Why it matters:** Nav chrome is the single most frequently-seen type on every app screen; it should anchor the scale, not drift off it. Pretendard at 13px also doesn't align cleanly to the 4pt baseline grid.
- **Recommended fix:** Pick `text-sm` (14px, `label`) or `text-xs` (12px, `label-sm`). Either is a valid choice per spec — 13px is not.

---

### Primary CTA buttons use `rounded-full` — conflicts with the 6/8px radius principle
- **File:** src/app/[locale]/app/projects/page.tsx:199; src/app/[locale]/app/meetings/page.tsx:118; src/components/share/approve-button.tsx:72, 106
- **Violation:** `rounded-full` on large primary action buttons. PRINCIPLES says `6px radius for inputs/buttons`; `rounded-full` is reserved for pills/chips.
- **Spec ref:** PRINCIPLES.md §3 ("Radius: 6px for inputs/buttons, 8px for cards/panels"), ANTI_PATTERNS.md §2.1 ("Rounded everything — pills on every button").
- **Why it matters:** CLAUDE.md Phase 1.0.6 notes "pill CTAs" as an explicit design token, so this is deliberate — but the design-system PRINCIPLES doc says otherwise. The two specs currently contradict.
- **Recommended fix:** Reconcile — either update PRINCIPLES.md §3 to permit pill CTAs (preferred, since the house style clearly chose pills), or migrate to `rounded-md`. Either way resolve the spec contradiction before Phase 2.5 adds new CTAs.

---

### Inline arbitrary tracking `tracking-[0.10em]` / `tracking-[0.12em]` / `tracking-[0.18em]`
- **File:** src/components/team/channel-sidebar.tsx:140; src/components/team/channel-members-dialog.tsx:78; src/components/team/channel-view.tsx:701, 736; src/components/app/notification-panel.tsx:217; src/app/globals.css:95 (`.label-caps` uses 0.18em)
- **Violation:** Multiple tracking values that fall outside the tracking token scale (`tracking-tight-2: -0.02em`, `tracking-wide-1: 0.01em`, `tracking-wide-2: 0.06em`).
- **Spec ref:** TYPOGRAPHY_SPEC.md §8 (tracking tokens).
- **Why it matters:** Every uppercase label is tracking-drifted by a slightly different amount (10 / 12 / 18 em). Pick one per role.
- **Recommended fix:** Extend the tracking scale in `tailwind.config.ts` to match `TYPOGRAPHY_SPEC §8`, then use named tokens. Consolidate `.label-caps` to the canonical 0.06em (`tracking-wide-2`) per spec §5.5.

---

### Hairline-between-items done with explicit `border-b last:border-0` rather than gap
- **File:** src/components/app/notification-panel.tsx (entire notification list); src/app/[locale]/app/meetings/page.tsx:172
- **Violation:** Design principle is "use spacing instead, dividers only for semantic group boundaries."
- **Spec ref:** ANTI_PATTERNS.md §8 ("Dividers between every list item — overwhelming. Use spacing instead").
- **Why it matters:** Dense lists become visually noisy; the data-table pattern has semantic dividers per row which is fine, but composite panels should rely on spacing.
- **Recommended fix:** For notification-panel use `divide-y divide-border` only inside a single card; for chat-like panels, use whitespace + section headers.

---

### Inline `backdrop-blur-sm` on public share page chrome
- **File:** src/app/s/[token]/page.tsx:144, 324
- **Violation:** `bg-white/90 backdrop-blur-sm` used on sticky header and hero badge.
- **Spec ref:** PRINCIPLES.md §3 ("No glassmorphism. No backdrop-blur."), ANTI_PATTERNS.md §2.1.
- **Why it matters:** Backdrop-blur is a called-out generic SaaS tell. For a public-facing surface this especially violates the editorial direction.
- **Recommended fix:** Drop `backdrop-blur-sm`, use solid `bg-background` with a hairline border-bottom. Also hint worth: `border-gray-100` → `border-border`.

---

### Home hero CTA uses fluid `text-[clamp(2.5rem,8vw,6rem)]`
- **File:** src/components/home/hero-block.tsx:31; src/components/home/contact-block.tsx:32
- **Violation:** `clamp()` typography off-grid.
- **Spec ref:** TYPOGRAPHY_SPEC.md §12.1 ("we don't use `clamp()` for everything … breaks the 4pt grid"), §12.2 (clamp acceptable only on marketing surfaces with an intentional-drift comment).
- **Why it matters:** The home landing IS a marketing surface so this might be acceptable — but no `/* clamp: marketing surface, intentional grid drift */` comment justifies the choice, so it reads as a typography drift rather than an intentional exception.
- **Recommended fix:** Either step down to fixed-breakpoint type (display-lg desktop, display-md tablet, display-sm mobile per §12) OR add the required documentation comment.

---

### Loading states use page-level spinners or disabled buttons with no skeleton
- **File:** Most `*/new/page.tsx` and form pages; src/components/invoices/invoice-editor.tsx (submit flow); src/components/meetings/new-meeting-form.tsx
- **Violation:** Forms show only "Saving…" button state; table pages show no skeleton on initial load — raw server-rendered rows appear.
- **Spec ref:** COMPONENT_CONTRACTS.md §11 (prefer skeleton; durations >800ms require skeleton), UI_FRAMES.md §Loading ("No spinners for page loads. Skeletons only.").
- **Why it matters:** Phase 2.5 will have public gallery listings (challenges list, submissions grid) where perceived latency matters. Today the app doesn't have a skeleton pattern to copy.
- **Recommended fix:** Establish one shared skeleton component (`<TableSkeleton rows={5} />`, `<CardGridSkeleton />`) under `src/components/ui/skeleton-*.tsx`; retrofit at least `/app/meetings`, `/app/invoices`, `/app/projects` as exemplars before Phase 2.5.

---

### Font-display (Fraunces) used for in-card titles
- **File:** src/app/[locale]/app/projects/page.tsx:181, 191; src/app/[locale]/app/page.tsx:72; src/app/[locale]/app/meetings/page.tsx:114
- **Violation:** `font-display` is the editorial serif (Fraunces) reserved for page-level Display moments; used here for empty-state titles and list page titles.
- **Spec ref:** TYPOGRAPHY_SPEC.md §3.2 ("For YAGI Workshop product UI we explicitly do not use editorial serif"), §15 ("Display sizes inside cards — Display roles are page-level, never card-level").
- **Why it matters:** Product-UI type spec says "no decorative serifs in product UI." CLAUDE.md Phase 1.0.6 tokens say Fraunces italic is allowed for emphasis — the two specs disagree.
- **Recommended fix:** Reconcile the spec contradiction. If Fraunces stays, restrict it to one page title per screen (page-level H1 only), never to empty-state titles or sub-headers in cards/panels.

---

### Pagination absent from Browse frames
- **File:** src/app/[locale]/app/projects/page.tsx, /meetings/page.tsx (both use `.limit(100)` and no pagination UI)
- **Violation:** Browse frame requires pagination component (UI_FRAMES §Frame 2 — "Page 2 of 7"); current code silently truncates at 100.
- **Spec ref:** UI_FRAMES.md §Frame 2, COMPONENT_CONTRACTS.md §5.9 (Pagination).
- **Why it matters:** When a workspace has >100 items the list silently hides data. Phase 2.5 public gallery needs pagination from day one for SEO deep-linking.
- **Recommended fix:** Build a shared `<Pagination>` primitive (per COMPONENT_CONTRACTS §5.9 — prev/next + current + "Page N of M" + URL-synced `?page=`) before Phase 2.5.

---

### Mobile table layout falls back to `hidden md:table-cell` hiding rather than card collapse
- **File:** src/app/[locale]/app/meetings/page.tsx:151-164; src/app/[locale]/app/admin/invoices/page.tsx:499, 585
- **Violation:** Columns disappear on mobile without surfacing elsewhere; UI_FRAMES §Browse says "table collapses to a list. Each row becomes a stacked layout."
- **Spec ref:** UI_FRAMES.md §Frame 2 mobile rules.
- **Why it matters:** A mobile user sees a neutered table — no project, no duration, no sync status — with no way to reach them.
- **Recommended fix:** At < 768px, render rows as stacked cards (primary identifier top, metadata below). Or, if that's too expensive, surface an expandable row-detail accordion.

---

### Channel status badges use raw color pills for "reconnecting"
- **File:** src/components/team/channel-view.tsx:292-296
- **Violation:** `bg-yellow-100 text-yellow-900` for reconnecting, `bg-red-100 text-red-900` for disconnected — same raw-Tailwind pattern flagged in CRITICAL.md for status badges.
- **Spec ref:** PRINCIPLES.md §7 semantic color, COMPONENT_CONTRACTS.md §5.8 toast tones (warning/error).
- **Why it matters:** Real-time status chip is safety information; should be identical to the error toast tones.
- **Recommended fix:** Unify with a `<Chip tone="warning" | "error">` primitive that reads from the (yet-to-be-added) `--warning` / `--destructive` tokens.

---

### `shadow-xl` on dialogs contradicts "one elevation permitted" rule
- **File:** src/components/share/approve-button.tsx:81; src/components/share/revision-compare.tsx:78
- **Violation:** `shadow-xl` is a heavy Material-style shadow; PRINCIPLES §3 allows exactly one elevation `0 1px 2px rgba(0,0,0,0.04)`.
- **Spec ref:** PRINCIPLES.md §3 ("One permitted elevation … Nothing else"), ANTI_PATTERNS.md §2.1 (No Material Design shadows).
- **Why it matters:** `rounded-2xl` + `shadow-xl` on a modal is the Material-card look explicitly rejected in ANTI_PATTERNS §2.1.
- **Recommended fix:** Replace with `shadow-sm` (closest to the permitted elevation) and ideally use `<Dialog>` from `ui/` which respects this.

---

### Auto-grow textarea in team chat hardcodes `min-h-[40px] max-h-[160px]`
- **File:** src/components/team/message-composer.tsx:444
- **Violation:** Arbitrary pixel min/max — but INTERACTION_SPEC §9.2 permits auto-resize only when "capped at 10 lines maximum."
- **Spec ref:** INTERACTION_SPEC.md §9.2.
- **Why it matters:** At Pretendard body line-height 24px, 160px = ~6.5 lines which is below the 10-line cap — fine. But unit is px rather than `ch`/`em`, so responsive font-scale changes break the cap.
- **Recommended fix:** Move to `max-h-[10lh]` (10 line-heights) or compute in rem. Low priority.

---

### Overflow actions inline vs. per-contract position
- **File:** src/app/[locale]/app/meetings/[id]/page.tsx:186-188 (MeetingActionsMenu is in the header top-right)
- **Violation:** Per UI_FRAMES §Detail, "Archive, Cancel, Delete live in the overflow menu (L5), not in the header." Menu placement is correct but the menu sometimes includes primary actions (see the component internals) — audit MeetingActionsMenu if primary transitions accidentally live there.
- **Spec ref:** UI_FRAMES.md §Frame 3 Detail.
- **Why it matters:** L3 primary action must live next to the L2 title, not buried in a menu. Phase 2.5 challenge detail (submit / vote) must put the primary CTA visibly.
- **Recommended fix:** Audit `src/components/meetings/meeting-actions-menu.tsx` — ensure only destructive/secondary actions are in it. Primary transitions stay on the header row.

---

### Public share page header combines breadcrumb, title badge, and logo — dense chrome
- **File:** src/app/s/[token]/page.tsx:320-340
- **Violation:** ANTI_PATTERNS §8: "Sidebar + top nav + breadcrumb + tab stacked simultaneously — pick a navigation primitive per surface." The share page mixes sticky header + breadcrumb + product-name badge + CTA.
- **Spec ref:** ANTI_PATTERNS.md §8, PRINCIPLES.md §2.5 (Visual restraint).
- **Why it matters:** First impression for a public reviewer. Pare down to essentials.
- **Recommended fix:** Single-row header: left = "YAGI Workshop" wordmark as logo-link, right = sparingly used secondary action. No breadcrumb on public pages.

---

### No `prefers-reduced-motion` override in globals.css
- **File:** src/app/globals.css (entire file — no media query present)
- **Violation:** INTERACTION_SPEC §7 requires explicit `@media (prefers-reduced-motion: reduce)` block.
- **Spec ref:** INTERACTION_SPEC.md §7, PRINCIPLES.md §9 ("Respect `prefers-reduced-motion`").
- **Why it matters:** Any third-party component (tailwindcss-animate, radix) may animate; without the override, users with vestibular sensitivity get undesired motion. Phase 2.5 voting flow will include animated vote counters — this must land first.
- **Recommended fix:** Add the canonical block from INTERACTION_SPEC §7 to `globals.css`.

---

### Keyboard shortcut discoverability — command menu / `?` overlay missing
- **File:** No `command-menu` component exists in `src/components/` outside `ui/command.tsx`
- **Violation:** Anti-pattern #14 in PRINCIPLES: "Keyboard shortcuts without a discoverable reference (needs `?` overlay)."
- **Spec ref:** PRINCIPLES.md §12.14, COMPONENT_CONTRACTS.md §5.10 (Command/search — ⌘K).
- **Why it matters:** Positioned as Linear/Height-class product but has no global ⌘K or `?` overlay. Phase 2.5 (public platform) is a reasonable point to introduce it.
- **Recommended fix:** Implement a minimal `/app` global command menu using the existing `<Command>` primitive and a `?` cheatsheet as a follow-up to Phase 2.5.
