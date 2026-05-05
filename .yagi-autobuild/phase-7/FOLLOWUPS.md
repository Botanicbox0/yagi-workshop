# Phase 7 — Follow-ups

Deferred items registered during Phase 7 Wave A K-05 LOOP-1 + K-06 LOOP-1
review. Inline-fixed items (K-05 F1 MED-A + K-06 F1/F2/F4 HIGH) shipped with
the LOOP-2 commit and are NOT in this list.

Format mirrors Phase 6 FOLLOWUPS.md (Trigger / Risk / Action / Owner / Status / Registered).

---

## FU-Phase7-A-K06-F3-showcase-asymmetric-grid

- **Trigger**: `ShowcaseGallery` in `src/app/campaigns/[slug]/page.tsx` uses a
  CSS columns layout with identical colSpanHint for all variants (all branches
  of the ternary resolve to `"break-inside-avoid mb-4 w-full"`). The
  "asymmetric mixed-size grid" intent from the design system is not realised.
- **Risk**: MED. Visual hierarchy for the showcase section is flat; premium
  editorial feel lost. No functional breakage.
- **Action**: Redesign `ShowcaseGallery` using a true asymmetric layout — e.g.,
  CSS grid with `grid-column: span 2` for featured entries (idx % 6 === 0),
  or a masonry approach with varying aspect-ratio placeholders. Requires design
  spec review before coding. Not a one-line fix.
- **Owner**: builder (Phase 7 Wave C candidate).
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 3, HIGH — deferred by
  kickoff decision: meaningful redesign, not surgical fix).

---

## FU-Phase7-A-K06-F5-hero-subhead-campaigns-list

- **Trigger**: `/campaigns` list page has no subheadline beneath the `list_title`
  H1. The hero section is title-only; design system §"Hero composition" calls for
  a supporting subhead on marketing surfaces.
- **Risk**: MED. Reduces landing page persuasion; first impression below yagi
  editorial standard.
- **Action**: Add `list_subtitle` i18n key (ko/en) and render as a
  `text-muted-foreground` paragraph beneath the H1, following the
  `font-body text-base md:text-lg leading-relaxed keep-all` pattern.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 5, MED).

---

## FU-Phase7-A-K06-F6-h1-font-display-italic-detail

- **Trigger**: Campaign detail page H1 (`campaign.title`) uses `font-semibold`
  only. Design system specifies `font-display italic` for primary H1 on editorial
  surfaces (non-admin, non-form).
- **Risk**: MED. Typography hierarchy violation on public-facing detail page.
- **Action**: Change `<h1>` in `CampaignDetailPage` to include `font-display italic`
  (keep `text-3xl md:text-4xl keep-all`). Verify KO title reads well in Fraunces
  italic — if not, scope to EN only with a locale-conditional class.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 6, MED).

---

## FU-Phase7-A-K06-F7-submit-cta-prominence

- **Trigger**: 응모하기 CTA on campaign detail is a small pill link
  (`px-8 py-3 text-sm`). On a long-scroll page it can be missed. Design system
  §"Primary CTA" calls for `h-12 px-10 text-base` minimum on primary actions.
- **Risk**: MED. Conversion impact on submission funnel entry point.
- **Action**: Increase CTA to `h-12 px-10 text-base font-semibold` pill. Consider
  a sticky bottom bar on mobile (below `md`). Requires responsive breakpoint check.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 7, MED).

---

## FU-Phase7-A-K06-F8-submit-page-404

- **Trigger**: `/campaigns/[slug]/submit` returns 404 — the route does not exist
  yet. The CTA on the detail page links to it when `status === "published"`.
- **Risk**: MED. Functional gap — clicking the primary CTA lands on a 404 for
  any published campaign. Deferred to Wave C.1 (submissions form ship).
- **Action**: Build `src/app/campaigns/[slug]/submit/page.tsx` as part of Wave
  C.1 submissions wave. The CTA link in `CampaignDetailPage` stays as-is.
- **Owner**: builder (Wave C.1).
- **Status**: deferred — waiting on Wave C.1.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 8, MED).

---

## FU-Phase7-A-K06-F9-inline-hex-to-sage-utility

- **Trigger**: Inline hex `#71D083` appears in one or more campaign surface
  components instead of the `bg-sage` / `text-sage` Tailwind utility. Violates
  design token discipline (single source of truth in tailwind.config).
- **Risk**: MED. Theme consistency — if sage token changes, hex will drift.
- **Action**: Grep for `#71D083` across `src/app/campaigns/` and replace with
  appropriate `bg-sage`, `text-sage`, or `border-sage` utility. Should be a
  one-liner per occurrence.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 9, MED).

---

## FU-Phase7-A-K06-F10-tracking-wide-ko-labels

- **Trigger**: Section labels in campaign pages use `tracking-wider` (which
  renders well in EN but adds excessive spacing in KO glyph-spaced text).
  Design system §"Typography / Korean" notes `tracking-normal` or `tracking-tight`
  for KO uppercase labels.
- **Risk**: MED. KO typography regression on public campaign surface.
- **Action**: Add locale-conditional `tracking` class on section label `<h2>`
  elements in both `page.tsx` files, or globally via `.keep-all` companion
  utility. Coordinate with next-intl locale detection at component level.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 10, MED).

---

## FU-Phase7-A-K06-F11-status-filter-missing-statuses

- **Trigger**: Campaign list filter (if/when added) should cover all 8 status
  values (`draft`, `pending_review`, `published`, `submission_closed`,
  `distributing`, `reviewing`, `archived`, `cancelled`). Current `getCampaignsList`
  query filters to 6 public statuses. Wave B will introduce `requested` rows.
- **Risk**: MED. Filter UX will be incomplete once Wave B ships. Wave B must
  extend the query and add filter chips for the new statuses.
- **Action**: Revisit `src/lib/campaigns/queries.ts` `getCampaignsList` after
  Wave B lands. Add `requested` to the public filter set or keep it admin-only
  with a separate query path.
- **Owner**: builder (Wave B entry point).
- **Status**: deferred — blocked on Wave B.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 11, MED).

---

## FU-Phase7-A-K06-F12-cancel-vs-delete-labeling

- **Trigger**: Admin campaign management UI uses ambiguous labels for
  destructive actions (cancel vs delete). Korean copy may also conflate
  "취소" (cancel/undo) with "삭제" (delete/remove), creating risk of
  accidental data loss.
- **Risk**: MED. Admin UX — wrong action taken under ambiguity. No RLS
  breakage but operational risk.
- **Action**: Audit `src/app/[locale]/app/admin/campaigns/` for all
  destructive action labels. Use "캠페인 삭제" / "Delete campaign" for
  hard delete; "캠페인 취소" / "Cancel campaign" for status→cancelled
  transition. Add confirmation dialog with action description.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 12, MED).

---

## FU-Phase7-A-K06-F13-category-edit-delete-missing

- **Trigger**: Admin campaign detail UI lacks edit and delete actions for
  existing `campaign_categories` rows. Only add is supported via
  `addCategoryAction`. Admin cannot fix a typo in a category name post-creation.
- **Risk**: MED. Operational gap — admin must use Supabase Studio to fix
  category errors.
- **Action**: Add `updateCategoryAction` + `deleteCategoryAction` server
  actions in `campaign-actions.ts`. Wire inline edit (click-to-edit row) and
  delete (trash icon with confirmation) in the admin category list UI.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 13, MED).

---

## FU-Phase7-A-K06-F14-hardcoded-edit-string

- **Trigger**: One or more admin campaign UI components hardcode the string
  `"편집"` (edit) directly in JSX instead of via an i18n key. Violates
  CLAUDE.md rule 4 (no hardcoded user-facing strings).
- **Risk**: LOW. EN locale will display Korean string. EN admin users affected.
- **Action**: Add `common.edit` or `admin.campaigns.edit` i18n key (ko: "편집",
  en: "Edit") and replace all occurrences. Run `grep -r '"편집"'
  src/app/[locale]/app/admin/campaigns/` to enumerate.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 14, LOW).

---

## FU-Phase7-A-K06-F15-form-placeholders-not-localized

- **Trigger**: Form inputs in the admin campaign create/edit form use
  hardcoded placeholder strings (likely Korean-only or English-only) instead
  of i18n keys.
- **Risk**: LOW. Cosmetic — admin-only surface. EN admin users see KO
  placeholders.
- **Action**: Audit `src/app/[locale]/app/admin/campaigns/` form components.
  Add `admin.campaigns.form.*` i18n keys for all placeholder strings. Replace
  hardcoded values.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 15, LOW).

---

## FU-Phase7-A-K06-F16-statusbadge-raw-enum-render

- **Trigger**: `StatusBadge` or similar component in admin campaign UI renders
  the raw DB enum value (e.g., `"submission_closed"`) when no translation key
  matches, instead of a formatted fallback label.
- **Risk**: LOW. Admin-only surface. Cosmetic — DB enum leaks to UI.
- **Action**: Add a `formatStatusLabel(status: string, t: TFunction): string`
  helper that always returns a human-readable string (fallback: title-case the
  enum). Wire to all `StatusBadge` render paths in campaign admin components.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 16, LOW).

---

## FU-Phase7-A-K06-F17-hex-literal-in-border

- **Trigger**: A hex literal (e.g., `border-[#...]`) appears in a campaign
  surface component's border styling instead of a design-token utility
  (`border-border`, `border-sage`, etc.).
- **Risk**: LOW. Token drift — if border token changes, hex will not follow.
- **Action**: Grep `src/app/campaigns/` for `border-\[#` and replace each
  occurrence with the appropriate border utility from tailwind.config tokens.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 7 Wave A K-06 finding 17, LOW).
