# Phase 6 Wave B.2 — has_external_brand_party Result

## Base SHA Verified

- Required: `ba1672bf1af62d07c6389067e19f1f0b865a539a`
- Actual: `ba1672bf1af62d07c6389067e19f1f0b865a539a` (verified via `git rev-parse HEAD` after `git reset --hard origin/g-b-10-phase-6`)
- L-051: PASS

## K-05 Verdict + Loop Count

- LOOP-1: NEEDS-ATTENTION (4 MED-A findings, 1 MED-B, 1 LOW)
  - F1 (MED-A): actions.ts schema missing has_external_brand_party — FIXED inline
  - F2 (MED-A): Missing i18n keys — FIXED inline (5 keys added to ko.json + en.json)
  - F3 (MED-A): Detail page not wiring — FIXED inline (SELECT, type, props, labels, render)
  - F4 (MED-B): projects_update RLS client branch overwritten by later migration — registered as FU-6-B2-K05-F4, deferred
  - F5 (LOW): DO-block assert doc note — FU only
- LOOP-2: CLEAN — all MED-A fixes verified

**Final verdict: CLEAN after 2 loops.**

## mcp.apply_migration Result

- Migration name: `phase_6_projects_has_external_brand_party`
- Result: `{"success": true}`
- Applied: 2026-05-05

## Post-Apply Verify Queries + Outputs

### Column grant check
```sql
SELECT has_column_privilege('authenticated', 'public.projects', 'has_external_brand_party', 'UPDATE')
```
Result: `col_grant_ok: true` ✓

### Column schema check
```sql
SELECT column_default, is_nullable, data_type
FROM information_schema.columns
WHERE table_name='projects' AND column_name='has_external_brand_party'
```
Result: `column_default: false`, `is_nullable: NO`, `data_type: boolean` ✓

### Security advisors
- Total items: 83 (all pre-existing)
- New items related to has_external_brand_party: 0
- ERROR level items: 0

## Files Changed

### DB
- `supabase/migrations/20260505200000_phase_6_projects_has_external_brand_party.sql` (new)
- `src/lib/supabase/database.types.ts` (regen + plugin trailer stripped)

### UI
- `src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx`
  - Added `has_external_brand_party: boolean` to CommitFormData + EMPTY_COMMIT
  - Added to ProjectRow type + DB fetch SELECT
  - Added to seed hydration from DB
  - Added to runSave call payload
  - Added external brand toggle checkbox UI (bottom of commit section, subdued card)
- `src/app/[locale]/app/projects/new/briefing-step3-actions.ts`
  - Added `has_external_brand_party: z.boolean().optional().default(false)` to commitInput
  - Added `has_external_brand_party` to fields list
- `src/components/project-detail/brief-tab.tsx`
  - Added `has_external_brand_party: boolean` to BriefTabProps
  - Added `field_external_brand_label` / `external_brand_yes` / `external_brand_no` to BriefTabLabels
  - Added function prop + FieldRow render in Stage 2 section
- `src/app/[locale]/app/projects/[id]/page.tsx`
  - Added `has_external_brand_party: boolean` to ProjectDetail type
  - Added `has_external_brand_party` to SELECT
  - Added mapping in project object (with `?? false` fallback for pre-migration rows)
  - Added prop + 3 labels passed to BriefTab

### i18n
- `messages/ko.json`
  - `projects.briefing.step3.external_brand_toggle`: "외부 광고주가 있는 작업입니다"
  - `projects.briefing.step3.external_brand_helper`: "(계약서 / brief 자료가 있다면 첨부 부탁드려요)"
  - `project_detail.brief_tab.field_external_brand_label`: "외부 광고주 여부"
  - `project_detail.brief_tab.external_brand_yes`: "예"
  - `project_detail.brief_tab.external_brand_no`: "아니요"
- `messages/en.json`
  - `projects.briefing.step3.external_brand_toggle`: "This includes a third-party Brand"
  - `projects.briefing.step3.external_brand_helper`: "(Attach the contract or brief if available)"
  - `project_detail.brief_tab.field_external_brand_label`: "External brand party"
  - `project_detail.brief_tab.external_brand_yes`: "Yes"
  - `project_detail.brief_tab.external_brand_no`: "No"

### Autobuild docs
- `.yagi-autobuild/phase-6/_wave_b_codex_review_prompt.md` (new)
- `.yagi-autobuild/phase-6/_wave_b_codex_review.md` (new — LOOP-1 result)
- `.yagi-autobuild/phase-6/_wave_b_codex_review_loop2.md` (new — LOOP-2 CLEAN)
- `.yagi-autobuild/phase-6/FOLLOWUPS.md` (appended FU-6-B2-K05-F4)
- `.yagi-autobuild/phase-6/_b2_toggle_result.md` (this file)

## tsc Status

Pre-existing errors only (`content-collections` / journal module — unrelated to Wave B.2). No new errors in changed files.

## Lint Status

Pre-existing errors in main project (26867 issues, 3177 errors — pre-existing). No new errors in Wave B.2 changed files.
