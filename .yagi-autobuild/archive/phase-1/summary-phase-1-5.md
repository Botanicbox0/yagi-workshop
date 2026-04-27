# Phase 1.5 — Invoicing (팝빌, MOCK MODE) — Summary

**Status:** Complete. All 6 waves executed, build green, Codex K-05 HIGH/CRITICAL all mitigated.
**Date:** 2026-04-22
**Mode:** MOCK (popbill credentials pending approval; `POPBILL_MODE=mock` in `.env.local`)

## Wave inventory

| Wave | Scope | Agents | Outcome |
|------|-------|--------|---------|
| A | i18n (47+15+1 keys), migration (drop Phase 1.0 stub → Phase 1.5 schema), types regen | 2 | ✅ green |
| B | popbill mock client + Taxinvoice builder | 1 | ✅ green |
| C | Suggest line items + invoice list/new form + sidebar nav | 2 // | ✅ green |
| D | issue/markPaid/void actions + editor + print page | 3 // | ✅ green |
| E | Issue email (Resend) + admin invoicing dashboard | 2 // | ✅ green |
| F | Codex K-05 + build + HIGH fixes + summary + Telegram | foreground | ✅ green |

All pnpm tsc checks clean. Final `pnpm build` exit 0 with 5 new routes registered:

```
/[locale]/app/invoices                   196 B
/[locale]/app/invoices/[id]             9.7 kB
/[locale]/app/invoices/[id]/print      2.95 kB
/[locale]/app/invoices/new             4.36 kB
/[locale]/app/admin/invoices             196 B
```

## What shipped (files)

**DB migration** (`supabase/migrations/20260421173130_phase_1_5_invoicing_20260422.sql`):
- Drops empty Phase 1.0 stub `invoices` (0 rows, no code refs)
- Adds tax-registration columns to `workspaces` (BRN, representative, address, tax_invoice_email, …)
- New table `supplier_profile` (single-row, seeded with YAGI placeholder row)
- New table `invoices` (status enum: draft|issued|paid|void, KRW integer columns, is_mock, popbill_mgt_key UNIQUE, popbill_response jsonb, invoice_number, nts_approval_number)
- New table `invoice_line_items` (display_order, source_type, source_id)
- Trigger `recalc_invoice_totals()` uses `coalesce(NEW, OLD)` so DELETE path works
- Trigger `tg_touch_updated_at` on both tables
- RLS: PERMISSIVE `select` for yagi_admin OR ws_member. RESTRICTIVE drafts-hidden-from-clients + mocks-hidden-from-clients. `invoice_items_modify` ALL for yagi_admin only (verified present after commit)

**Popbill adapter** (`src/lib/popbill/`):
- `client.ts` — mode read at module top; HALTS module load if `POPBILL_MODE=mock && NEXT_PUBLIC_VERCEL_ENV=production`. Mock returns `MOCK-{YYYYMMDD}-{random}` nts_approval + `mock-{invoice_id}` mgt_key + jsonb `{mock:true, warning:"이 송장은 실제로 국세청에 신고되지 않았습니다."}`.
- `build-taxinvoice.ts` — validates supplier (10-digit BRN, corporate_name, ceo, address, contact_email), buyer (BRN, ceo, address, tax_invoice_email), ≥1 line items, totals match. Now uses **deterministic MgtKey** `INV-{id8}-{created_at base64url12}` so a race can't produce two different keys for the same row (HIGH-1 idempotency guard for the future production switch).

**Suggest engine** (`src/lib/invoices/suggest-line-items.ts`): queries completed meetings + shared/approved preprod_boards in date range, reads `supplier_profile.default_rates` jsonb for hourly/flat rates, batched lookup of `invoice_line_items.source_id/type` to mark `already_billed`.

**Server actions**:
- `src/app/[locale]/app/invoices/actions.ts` — `createInvoice` (yagi_admin; `is_mock:false` at draft)
- `src/app/[locale]/app/invoices/[id]/actions.ts` — `issueInvoice`, `markPaid`, `voidInvoice`. Issue path calls `buildTaxinvoice()` → `issueTaxInvoice()` → race-guarded `.eq("status","draft")` update with `race_already_issued` detection + logged manual-reconciliation case. `is_mock` set from `getPopbillMode() === "mock"` at issue. Fire-and-forget `sendInvoiceIssuedEmail(invoiceId)` after update succeeds.
- `src/app/[locale]/app/invoices/[id]/line-item-actions.ts` — `addLineItem`, `updateLineItem`, `deleteLineItem`, `reorderLineItems`, `bulkAddFromSuggestions`, `fetchSuggestions`. Every one gates on yagi_admin + `invoice.status === 'draft'`.
- `sendInvoiceIssuedEmail` (`src/lib/invoices/issue-email.ts`) — service-role Supabase client, Resend send with HTML + plain-text bodies, red MOCK disclosure banner, `(MOCK)` subject tag when is_mock, BCC EMAIL_FROM for audit, fully HTML-escaped.

**UI**:
- List page `/[locale]/app/invoices` — yagi_admin-aware, status/year/month filters, KRW currency, mock badge per row, status pill
- New invoice form — RHF+Zod, project select with buyer-BRN missing warning
- Editor `/[locale]/app/invoices/[id]` — two-column layout, line items table with add/edit/delete/reorder via Popover+Dialog, suggest-from-meetings/storyboards dialog, issued/void read-only metadata, sticky action footer with status-aware buttons (Draft→Issue, Issued→MarkPaid+Void, Paid→Void, Void→none). Red mock banner when `invoice.is_mock`. **New:** red pre-issue warning banner when `isDraft && popbillMode==="mock"` (HIGH-3 fix). Amber BRN-missing warning linking to `/app/settings/workspace`.
- Print page `/[locale]/app/invoices/[id]/print` — Korean 세금계산서 layout, Pretendard fallbacks, A4 @page CSS, diagonal red MOCK watermark (prints) + red banner (prints) when is_mock. Draft suffix `(임시 초안)` when status=draft. Uses `Intl.NumberFormat('ko-KR', 'currency','KRW')` regardless of locale. Print button in tiny client component.
- Admin dashboard `/[locale]/app/admin/invoices` — 4 KPI cards (mock count + sum, MTD, YTD, overdue count + sum). Red-tinted treatment when mock/overdue > 0. "MOCK 송장 — 재발행 필요" table + overdue table + YTD status-breakdown pills. Added `admin_invoices` entry to sidebar under `adminItems` (Receipt icon, yagi_admin only).

**i18n** (`messages/{ko,en}.json`): `invoices.*` namespace (~70 keys now), `admin.invoices.*` (19 keys), `nav.invoices` + `nav.admin_invoices`.

## Codex K-05 outcome

Codex CLI invoked (gpt-5.4, reasoning=high). Raw trace at `.yagi-autobuild/codex-phase-1-5.md` (5941 lines). CLI did not emit a structured report inside the budget (exhausted on PowerShell/ripgrep escaping for `[locale]` paths), so the review agent supplemented with direct codebase analysis. Findings inventory:

**CRITICAL — 1 (ADDRESSED)**
- **Phase 1.5 migration not in repo.** The full SQL was retrieved via Supabase MCP `execute_sql` against `supabase_migrations.schema_migrations` and committed at `supabase/migrations/20260421173130_phase_1_5_invoicing_20260422.sql`. RLS is verifiable from source again.
  - **Side finding:** Phases 1.1 / 1.2 / 1.2.5 / 1.3 / 1.4 migrations are also missing from the repo (only Phase 1.0 was committed). Added to the deferred follow-up list — not a Phase 1.5 blocker. See "Deferred follow-ups" below.

**HIGH — 4**

| # | Finding | Action |
|---|---------|--------|
| 1 | Double-issue race: popbill called before DB status update; two concurrent requests could file twice because `build-taxinvoice.ts` generated `Date.now()`-based MgtKeys that differ per call | **FIXED** — MgtKey now deterministic: `INV-{id8}-{created_at base64url12}`. Concurrent issuers submit the same key; popbill's UNIQUE constraint on MgtKey rejects the loser. |
| 2 | `is_mock` flips based on runtime mode at issue time, not creation time | **DESIGN INTENT** — `is_mock` must reflect how the invoice was ACTUALLY filed, not drafted. Mitigated by (3) below: admin now sees a pre-issue warning when under mock mode. Once issued, the value is locked (status never returns to draft). |
| 3 | No warning on a draft editor when under `POPBILL_MODE=mock` | **FIXED** — Added red pre-issue banner in `invoice-editor.tsx` rendered when `isDraft && popbillMode === "mock"`. New i18n keys `invoices.mock_pre_issue_warning_title/body` in ko + en. |
| 4 | RLS for `invoice_line_items` CUD not verifiable (migration missing) | **FIXED** (follow-on from CRITICAL-1) — committed migration shows `invoice_items_modify` RESTRICTIVE ALL policy gated on `is_yagi_admin(auth.uid())`. |

**MEDIUM — 5 (deferred)**
- `recalc_invoice_totals` trigger on DELETE. **FALSE POSITIVE** — migration uses `coalesce(new.invoice_id, old.invoice_id)`. Codex saw the applied DB state correctly; the review agent misread the spec draft, not the applied trigger. No action.
- Print page should block `status='draft'` in code (defense-in-depth beyond RLS). Not a security hole (restrictive draft policy + yagi_admin-only edit flow), but worth adding. Deferred.
- Email print URL hardcoded to `/ko/`. Deferred — buyer locale preference not yet modeled.
- `bcc: EMAIL_FROM` leaks every issue to YAGI inbox. Design intent (audit trail), keep.
- Form does not block insert when buyer BRN missing; fails later at issue. Current design surfaces it as a warning banner + a hard issue-time block. Acceptable MVP.

**LOW — 4 (deferred)**
- `suggestLineItems` uses `source_id` only in `billedSet` collision check (not `source_type`). Cosmic-bad-luck UUID collision. Cosmetic.
- `supplier_profile.default_rates` column presence — confirmed present in committed migration; spec note outdated.
- Print page doesn't big-watermark DRAFT the way it does MOCK. Deferred (UX polish).
- No rate limit on `fetchSuggestions` (yagi_admin only). Deferred.

### Mock-mode gate verdict (from memory spec)

| Check | Verdict |
|-------|---------|
| (a) Mock path REJECTED when `NEXT_PUBLIC_VERCEL_ENV=production` | **PASS** — `client.ts:9-13` throws at module load |
| (b) is_mock invoices visually distinct on client screens | **PASS** — list badge, detail+editor red banner, print watermark+banner, admin KPI+section, email subject+body. Plus new pre-issue warning on drafts (HIGH-3 fix). |
| (c) Mock→production transition has no data integrity holes | **PASS** — deterministic MgtKey prevents key-collision (HIGH-1 fix). Mock rows keep `MOCK-` prefix on `nts_approval_number` + stay in "재발행 필요" admin list. Once issued, row is locked (no reissue in-place; `issueInvoice` requires status='draft'). A real reissue requires creating a new invoice row. |

## Deferred follow-ups (not Phase 1.5 blockers)

Appended to task #24 on completion of this wave:
1. **Commit missing migrations for Phases 1.1 / 1.2 / 1.2.5 / 1.3 / 1.4** — retrieve SQL via Supabase MCP the same way Phase 1.5's was recovered.
2. Print page: block `status='draft'` rendering in code + add big "DRAFT" watermark analogous to the MOCK one (Codex MEDIUM).
3. Email: respect buyer locale for the `/print` URL once locale preference is modeled (Codex MEDIUM).
4. `suggestLineItems`: add `source_type` to `billedSet` collision key (Codex LOW).
5. Rate-limit `fetchSuggestions` once admin usage pattern is observed (Codex LOW).

## Mock→production migration path (operator runbook)

When popbill approves credentials:
1. Fill `POPBILL_LINK_ID` / `POPBILL_SECRET_KEY` / `POPBILL_CORP_NUM` in Vercel env
2. Install `popbill` SDK: `pnpm add popbill` — then implement the `production` branch of `issueTaxInvoice` in `src/lib/popbill/client.ts` (maps `Taxinvoice` type → SDK's `Taxinvoice`)
3. Flip `POPBILL_MODE=test` → verify end-to-end against popbill test environment
4. Flip `POPBILL_MODE=production`
5. Review `/app/admin/invoices` "재발행 필요" list — each row represents a MOCK that must be reissued as a NEW invoice (mock rows stay for historical reference; mock row `is_mock=true` is never flipped to false)
6. For each mock: create a new invoice in the same project with the same line items → issue → new `nts_approval_number` (real) + new `popbill_mgt_key` (real)

## Next phase

Phase 1.5 complete. Execution order: **1.5 (mock) ✅ → 1.6 → 1.7 → 1.8 → 1.9 → END**. Next up: Phase 1.6 — Public landing + MDX journal.
