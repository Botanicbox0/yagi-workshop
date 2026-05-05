# Phase 7 Wave A.2 — Admin Campaign Tool Result

Date: 2026-05-05
Branch: g-b-10-phase-7
Wave: A.2 (MED tier, parallel)

## Base SHA verified

HEAD at start: `0454bcc96dee84b0c199f40ffad36d30664ca398`
Commit: "feat(phase-7/A.1): campaigns + 4 related tables + RLS + column grants" ✅

## Files created

### Server actions
- `src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts`
  - `createCampaignAction` — INSERT campaigns (status=draft, sponsor_workspace_id=NULL), generates slug, inserts categories
  - `updateCampaignAction` — UPDATE via typed CampaignUpdate (all editable fields)
  - `publishCampaignAction` — UPDATE draft→published, sets submission_open_at
  - `addCategoryAction` — INSERT campaign_categories with auto display_order

### Pages
- `src/app/[locale]/app/admin/campaigns/page.tsx` — list + status filter tabs
- `src/app/[locale]/app/admin/campaigns/new/page.tsx` — create form (Client Component, all fields)
- `src/app/[locale]/app/admin/campaigns/[id]/page.tsx` — Server Component wrapper, auth gate + data fetch
- `src/app/[locale]/app/admin/campaigns/[id]/_components/campaign-edit-client.tsx` — edit + publish + addCategory (Client Component)

## i18n keys

Total keys added: 30 (ko) + 30 (en)
Namespaces: `admin_campaigns` (nested under `form`)

### Key count breakdown
- Top-level: 9 keys (title, list_empty, new_cta, publish_cta, draft_label, published_label, status_filter_label, toast_*, status_*)
- form.*: 16 keys
- Status filter values: 6 keys

## yagi-wording-rules cross-check

Checked all KO values for forbidden internal taxonomy leakage:
- "Sponsor" — NOT present in KO values ✅
- "Submission" — NOT present in KO values (KO uses "응모") ✅
- "Track" — NOT present ✅
- "Roster" — NOT present ✅
- "Distribution" — NOT present in KO values ✅

EN values use "Publish", "Campaign", "Category", "Compensation" — all product-safe. ✅

## Auth gates

- List page (`page.tsx`): notFound() for non-yagi_admin (supabase.rpc is_yagi_admin check)
- New page: Client Component — auth enforced server-side by actions
- Detail/edit page (`[id]/page.tsx`): notFound() for non-yagi_admin
- All 4 server actions: `getAuthenticatedAdmin()` → is_yagi_admin RPC before any write
- All writes use service-role client (bypasses column-level RLS grant restriction on campaigns.status)

## yagi-design-system v1.0

- Sage accent `#71D083` used for publish CTA, active status badge, new category form border
- Card/section radius: `rounded-[24px]`
- Button radius: `rounded-[12px]` (form inputs), `rounded-full` (filter pills)
- No shadows
- No amber/orange/blue
- Keep-all on Korean text nodes

## tsc status

Zero errors in new files.
Pre-existing errors in `journal/*`, `content-collections`, `sitemap` — unrelated to A.2. ✅

## lint status

`✔ No ESLint warnings or errors` on all 5 changed files. ✅

## Out of scope (not added)

- B.1 sponsor request flow
- C.1 응모 form
- D.1 검수 admin
- D.2/D.3 distribution dashboards
