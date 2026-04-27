# YAGI Workshop — Phase 1.5 Autonomous Build (B-O-E)

> **Scope:** Invoicing — draft, issue, and file 전자세금계산서 (Korean electronic tax invoices) via 팝빌 API. Track paid/unpaid status.
> **Prereq:** Phase 1.2 complete (project + workspace.tax_id). Phase 1.3 complete (meetings for billable hours).
> **Estimated duration:** 4–5 hours.
> **Design decisions:** ARCHITECTURE.md §1.5 (팝빌 as chosen provider + draft fallback), §5.3 (failure isolation).

---

## Your Identity

Builder per `yagi-agent-design`. Load `/CLAUDE.md` and `/ARCHITECTURE.md`. Korean tax law is the hard constraint in this phase — **when in doubt, keep an invoice in 'draft' rather than file something incorrect to 국세청**.

Session: `--dangerously-skip-permissions`. Kill-switches below.

---

## Goal

By the end of Phase 1.5:

1. YAGI admin can create an invoice linked to a project
2. Invoice line items pull from meetings + deliverables (storyboards, etc.) as suggestions; YAGI can edit freely
3. Tax calculation: 공급가액 (supply) + 부가세 10% (VAT) = 합계금액 (total)
4. Draft invoices can be reviewed/edited indefinitely
5. "Issue" button calls 팝빌 API to file the 전자세금계산서 with 국세청
6. PDF is generated locally (via existing `@vercel/og` or a simple server-rendered template) for both draft and issued invoices
7. Clients can view issued invoices on their project detail page + download PDF
8. Status tracking: `draft → issued → paid | void`
9. Admin dashboard shows revenue by month, outstanding invoices

**Non-goals:**
- International invoicing (USD/JPY etc.) — KRW only
- Stripe / Toss / PayPal integration — payment is off-platform (bank transfer); we only record paid status
- Recurring invoices / subscriptions
- 원천징수 (withholding tax) for freelance workers — corporate 세금계산서 only
- Credit note / 수정세금계산서 beyond basic void (initial void-and-reissue pattern is enough)

---

## Korean tax invoice context (primer for Builder)

- **전자세금계산서** is mandatory for most B2B transactions in Korea above certain thresholds. YAGI Workshop is a 법인사업자 so they must issue them.
- The invoice must be filed with 국세청 within the month of the supply date (공급일자). Filing late = penalties.
- Key fields on a 전자세금계산서:
  - 공급자 (supplier): YAGI's 사업자등록번호, 상호, 대표자명, 주소, 업태/종목
  - 공급받는자 (buyer): client's 사업자등록번호 OR 주민등록번호 (for individuals), 상호, 대표자명, 주소
  - 작성일자 / 공급일자 (dates)
  - 품목 lines: 품목명, 규격, 수량, 단가, 공급가액, 세액
  - 합계금액, 공급가액 합계, 세액 합계
  - 현금 / 수표 / 어음 / 외상 (payment breakdown — use 외상 for "to be paid later")
  - 영수/청구 (receipt vs. bill — we issue as 청구)
- 영세율 (zero-rate) applies to exports; we don't ship this case yet.
- 면세 (tax-exempt) doesn't apply to our services.
- Filing via API (팝빌) stamps a 국세청 승인번호 on success. That's the definitive proof of filing.

Builder should treat 국세청 승인번호 as the "source of truth" state — if 팝빌 returns one, the invoice is legally filed. Storing the number in our DB is what transitions our local `status` from `draft` to `issued`.

---

## Data model

Migration: `YYYYMMDDHHMMSS_phase_1_5_invoicing.sql`

```sql
-- Extend workspaces with tax registration (beyond just tax_id from Phase 1.1)
alter table workspaces
  add column if not exists business_registration_number text,  -- 사업자등록번호 10 digits
  add column if not exists representative_name text,           -- 대표자명
  add column if not exists business_address text,              -- 사업장 주소
  add column if not exists business_type text,                 -- 업태
  add column if not exists business_item text,                 -- 종목
  add column if not exists tax_invoice_email text;             -- 세금계산서 수신 이메일

-- YAGI supplier profile (single row — the one that represents YAGI Workshop as the issuer)
create table supplier_profile (
  id uuid primary key default gen_random_uuid(),
  business_registration_number text not null unique,
  corporate_name text not null,
  representative_name text not null,
  address text not null,
  business_type text,
  business_item text,
  contact_email text not null,
  contact_phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed one row for YAGI Workshop (values placeholder — Yagi fills in before first filing)
insert into supplier_profile (business_registration_number, corporate_name, representative_name, address, contact_email)
values ('0000000000', '야기워크숍 주식회사', '윤병삼', 'TBD', 'hello@yagiworkshop.xyz')
on conflict (business_registration_number) do nothing;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete restrict,
  workspace_id uuid not null references workspaces(id) on delete restrict,
  -- workspace_id = the client's workspace (the buyer)
  supplier_id uuid not null references supplier_profile(id),
  invoice_number text,                      -- our internal number, format YYYY-NNNN
  nts_approval_number text,                 -- 국세청 승인번호 after filing
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'paid', 'void')),
  supply_date date not null,                -- 공급일자
  issue_date date,                          -- 발행일자, set on transition to issued
  due_date date,                            -- 결제 기한 (informational)
  subtotal_krw integer not null default 0,  -- 공급가액 합계
  vat_krw integer not null default 0,       -- 세액 합계 (10% of subtotal)
  total_krw integer not null default 0,     -- 합계금액
  memo text,
  popbill_mgt_key text unique,              -- 팝빌 고유 문서번호 (our side)
  popbill_response jsonb,                   -- full 팝빌 response for debugging
  filed_at timestamptz,
  paid_at timestamptz,
  void_reason text,
  void_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_invoices_project on invoices(project_id);
create index idx_invoices_workspace on invoices(workspace_id);
create index idx_invoices_status on invoices(status);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  display_order integer not null default 0,
  item_name text not null,                  -- 품목명
  specification text,                       -- 규격
  quantity numeric(12,2) not null default 1,
  unit_price_krw integer not null,
  supply_krw integer not null,              -- = quantity * unit_price (rounded)
  vat_krw integer not null,                 -- = round(supply * 0.1)
  note text,
  source_type text check (source_type in ('manual','meeting','storyboard','deliverable')),
  source_id uuid,
  created_at timestamptz default now()
);

create index idx_invoice_items_invoice on invoice_line_items(invoice_id);

-- RLS
alter table supplier_profile enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

create policy supplier_yagi_only on supplier_profile for select using (is_yagi_admin());

-- Invoices: workspace members see their own; yagi_admin sees all
create policy invoices_select on invoices for select using (
  is_ws_member(workspace_id) or is_yagi_admin()
);
create policy invoices_insert on invoices for insert with check (is_yagi_admin());
create policy invoices_update on invoices for update using (is_yagi_admin());

-- RESTRICTIVE: draft invoices are hidden from clients
create policy invoices_hide_drafts_from_clients on invoices as restrictive for select using (
  is_yagi_admin() or status <> 'draft'
);

create policy invoice_items_select on invoice_line_items for select using (
  exists (select 1 from invoices i where i.id = invoice_id
          and (is_ws_member(i.workspace_id) or is_yagi_admin()))
);
create policy invoice_items_cud on invoice_line_items for all using (is_yagi_admin());

-- trigger for totals recalculation
create or replace function recalc_invoice_totals() returns trigger as $$
begin
  update invoices set
    subtotal_krw = coalesce((select sum(supply_krw) from invoice_line_items where invoice_id = new.invoice_id), 0),
    vat_krw = coalesce((select sum(vat_krw) from invoice_line_items where invoice_id = new.invoice_id), 0)
  where id = new.invoice_id;
  update invoices set total_krw = subtotal_krw + vat_krw where id = new.invoice_id;
  return new;
end $$ language plpgsql;

create trigger invoice_items_recalc
  after insert or update or delete on invoice_line_items
  for each row execute function recalc_invoice_totals();
```

Regenerate types after apply.

---

## 팝빌 integration architecture

### Environments

팝빌 provides separate **TEST** and **PRODUCTION** infrastructures. Same SDK, different credentials + different base URL (`popbill-test.linkhub.co.kr` vs `popbill.linkhub.co.kr`).

We keep `POPBILL_MODE=test` in `.env.local` during development, switch to `production` only on Vercel for live deploys. Builder must never hardcode the production URL.

### SDK

```powershell
pnpm add popbill
```

`popbill` is the official Node SDK. Version-lock in `package.json` to avoid surprise behavior changes during filing windows.

### Auth / credentials

Required env vars:
- `POPBILL_LINK_ID` — 연동회원 아이디 (팝빌-assigned)
- `POPBILL_SECRET_KEY` — 연동회원 시크릿
- `POPBILL_CORP_NUM` — YAGI's 10-digit 사업자등록번호 (hyphenless)
- `POPBILL_USER_ID` — sub-user id, usually same as a YAGI admin's handle
- `POPBILL_MODE` — `test` | `production`

### Filing flow

1. Build a `Taxinvoice` object per 팝빌 schema (mapping from our `invoices` + `invoice_line_items` + `supplier_profile` + buyer workspace)
2. Generate a unique `MgtKey` (our side). Format: `INV-{invoice_id.short()}` — must be unique per 사업자. Save to `invoices.popbill_mgt_key`.
3. Call `taxinvoiceService.registIssue(corpNum, 'SELL', mgtKey, taxinvoice, ...)` — this registers + issues + transmits to 국세청 in one call (정발행 immediate mode)
4. On success: 팝빌 returns 국세청 승인번호 → save to `invoices.nts_approval_number`, transition status to `issued`, store full response in `invoices.popbill_response`.
5. On failure: keep invoice in `draft` status. Store the error in `popbill_response`. Surface the error to the user with a plain-language explanation (팝빌 errors are numerically coded; maintain a translation table for the common ones).

### Failure modes to handle explicitly

- 사업자등록번호 invalid (either supplier or buyer): block issuance, prompt correction
- Supply date in a 확정된 과세기간 that's already closed: block with clear message
- Duplicate MgtKey (retrying after our DB thinks it failed): detect via 팝빌's specific error code → treat the prior call as the source of truth, fetch the existing invoice
- Network timeout mid-call: leave as `draft`, provide manual "Check status" action that polls 팝빌 by MgtKey

### "Draft" mode: no 팝빌 call

Draft invoices don't touch 팝빌 at all. Everything works — PDF preview, client doesn't see it, totals computed — without any API round-trip. This is the MVP escape hatch: if 팝빌 is down, YAGI can draft invoices until 팝빌 is back, then issue.

---

## Subtasks (11)

### 01 — i18n: `invoices` + `settings.billing` namespaces

Add to both `messages/ko.json` and `messages/en.json`.

`invoices`:
- list_title, list_empty, new, filter_status, filter_year, filter_month
- status_draft, status_issued, status_paid, status_void
- detail_title, supply_date_label, due_date_label
- subtotal_label, vat_label, total_label
- line_items_title, add_line_item, item_name_label, item_name_ph, quantity_label, unit_price_label
- issue_button, issue_confirm_title, issue_confirm_body, issue_in_progress, issue_success, issue_failed
- void_button, void_confirm_title, void_reason_label
- mark_paid, paid_at_label
- download_pdf, send_email
- nts_approval_number_label, filed_at_label
- suggestions_title, suggestions_from_meetings, suggestions_from_storyboards

`settings.billing` (tab in existing settings layout):
- title, supplier_profile_title
- business_registration_number_label, business_registration_number_ph
- representative_name_label, corporate_name_label
- business_address_label, business_type_label, business_item_label
- tax_invoice_email_label, save_button
- popbill_integration_title, popbill_health_ok, popbill_health_missing, popbill_mode_badge

Korean 존댓말 + tax terms in Korean (공급가액, 부가세, 합계금액). English for English-speaking clients who need to reference it.

---

### 02 — Schema migration + supplier profile seed + types

🛑 **KILL-SWITCH before `supabase db push`.**

Apply the migration. Verify supplier_profile has exactly one row after apply. Regenerate types.

Acceptance:
- Migration clean
- supplier_profile has 1 row (placeholder values)
- Existing projects / workspaces unaffected
- Anon RLS: all 3 new tables return 0 rows

---

### 03 — 팝빌 SDK wrapper

🛑 **KILL-SWITCH before `pnpm add popbill`.**

File: `src/lib/popbill/client.ts`

```typescript
import * as popbill from 'popbill'

let configured = false

export function getPopbill() {
  if (!process.env.POPBILL_LINK_ID || !process.env.POPBILL_SECRET_KEY) return null
  if (!configured) {
    popbill.config({
      LinkID: process.env.POPBILL_LINK_ID,
      SecretKey: process.env.POPBILL_SECRET_KEY,
      IsTest: process.env.POPBILL_MODE !== 'production',
      IPRestrictOnOff: true,
      UseStaticIP: false,
      UseLocalTimeYN: true,
    })
    configured = true
  }
  return popbill
}

export function getTaxinvoiceService() {
  const p = getPopbill()
  if (!p) return null
  return p.TaxinvoiceService
}
```

File: `src/lib/popbill/health.ts`

```typescript
export async function checkPopbillHealth(): Promise<HealthResult>
```

Calls `checkIsMember` or similar low-cost endpoint to verify credentials are live. Returns `{ ok, mode, corp_num_valid }`.

Acceptance:
- With env vars unset: `getPopbill()` returns null, no throw
- With valid env vars: health check returns `ok: true, mode: 'test'`
- Type-check passes

---

### 04 — Invoice builder: mapping our schema → 팝빌 Taxinvoice

File: `src/lib/popbill/build-taxinvoice.ts`

```typescript
export function buildTaxinvoice(args: {
  supplier: SupplierProfileRow,
  buyer: WorkspaceRow,      // buyer's workspace with business_registration_number etc.
  invoice: InvoiceRow,
  lineItems: InvoiceLineItemRow[],
}): Taxinvoice  // 팝빌 Taxinvoice type
```

Mapping:
- `writeDate`: `invoice.issue_date` (or today if null at issue time) in `YYYYMMDD`
- `chargeDirection`: `'정과금'` (we're billing the client)
- `issueType`: `'정발행'`
- `taxType`: `'과세'`
- `invoicerCorpNum`, `invoicerMgtKey`, `invoicerCorpName`, `invoicerCEOName`, `invoicerAddr`, `invoicerBizClass`, `invoicerBizType`, `invoicerContactName`, `invoicerEmail` — from supplier
- `invoiceeType`: `'사업자'` (or `'개인'` if buyer has no 사업자등록번호 but we only bill corps in MVP)
- `invoiceeCorpNum`, `invoiceeCorpName`, `invoiceeCEOName`, `invoiceeAddr`, `invoiceeBizClass`, `invoiceeBizType`, `invoiceeEmail1` — from buyer
- `supplyCostTotal`, `taxTotal`, `totalAmount` — from invoice totals (as strings, 팝빌 convention)
- `purposeType`: `'청구'` (we're billing, not receipting)
- `detailList`: map `lineItems` to 팝빌's line item format
  - `serialNum`, `purchaseDT`, `itemName`, `spec`, `qty`, `unitCost`, `supplyCost`, `tax`, `remark`

Edge cases:
- Round 부가세 per line consistently (banker's rounding, half-even) — must sum to the invoice-level total to avoid 팝빌 validation errors
- Dates in KST (Asia/Seoul), format `YYYYMMDD` (no separators)
- Strings not numbers for all money fields

Acceptance:
- Given a known fixture (supplier + buyer + invoice with 3 line items), output matches 팝빌's expected format exactly
- Unit-testable without network call

---

### 05 — Issue action (Server Action)

File: `src/app/[locale]/app/invoices/[id]/actions.ts`

```typescript
export async function issueInvoice(invoiceId: string): Promise<IssueResult>
```

Sequence:
1. Auth: yagi_admin only
2. Load invoice + lineItems + buyer workspace + supplier profile
3. Validate — all required fields present on buyer (사업자등록번호, 대표자명, 주소), at least 1 line item, totals consistent
4. Build Taxinvoice (subtask 04)
5. Generate MgtKey if not present: `INV-${invoice.id.slice(0,8)}-${Date.now().toString(36)}`; save it to the row
6. Call 팝빌 `registIssue(corpNum, mgtKey, taxinvoice, writeSpecification=false, forceIssue=false, dealInvoiceMgtKey='', memo=invoice.memo||'', emailSubject='', titleIncludingYN=true)`
7. On success: parse response for `ntsConfirmNum` (국세청 승인번호). Update invoice: `status='issued', issue_date=today, filed_at=now(), nts_approval_number=<num>, popbill_response=<full response>`
8. On failure: leave status unchanged, save error to `popbill_response`, return error to UI
9. `revalidatePath`
10. Send notification email to buyer's `tax_invoice_email` (subtask 09)

Acceptance:
- Happy path (test env): issue a valid invoice → status becomes `issued`, NTS number stored
- Invalid buyer registration: validation error, no 팝빌 call
- 팝빌 down: invoice stays draft, error surfaced to UI
- Retry issuing an already-issued invoice: blocked with clear message

---

### 06 — PDF generation

File: `src/app/api/invoices/[id]/pdf/route.ts`

Use `@vercel/og` (already in deps) to render a simple invoice PDF.

Wait — `@vercel/og` outputs PNG/JPEG, not PDF. Two options:
- **Option A:** Render HTML with `react-pdf` — adds a dep
- **Option B:** Use `puppeteer-core` + `@sparticuz/chromium` — heavy
- **Option C:** Server-render an HTML page at `/invoices/[id]/print`, let the client print-to-PDF in browser

Choose **Option C** for MVP (zero new deps, works everywhere). The print layout is a dedicated route:

File: `src/app/[locale]/invoices/[id]/print/page.tsx`
- Server Component, layout designed for A4 print
- CSS: `@media print { ... }` — hides nav, sets page size
- Korean fonts embed via Pretendard Variable (already present)

The "Download PDF" button: opens `/invoices/[id]/print` in new tab, triggers `window.print()` on load with page-to-PDF option as default.

🛑 If Builder thinks Option C is insufficient for quality, **kill-switch to ask Yagi** before adding `react-pdf` or puppeteer.

Acceptance:
- Print preview shows a clean, single-page invoice with all required fields
- Korean characters render correctly (Pretendard)
- Prints to PDF cleanly from Chrome on macOS/Windows

---

### 07 — Line item suggestions from meetings + deliverables

File: `src/lib/invoices/suggest-line-items.ts`

Given a project_id, query:
- Completed meetings (status='completed', in the current billing period)
- Shared/approved storyboards (count as a deliverable)
- (Future: project_deliverables rows)

Output suggestion rows Builder displays in the invoice editor. YAGI clicks to import into the line items table, then edits freely.

Suggestion format:
- Meeting: `{ item_name: '자문/미팅 — {meeting.title}', quantity: <duration_in_hours>, unit_price: <rate_from_settings>, source_type: 'meeting', source_id: <meeting.id> }`
- Storyboard: `{ item_name: '스토리보드 — {storyboard.title}', quantity: 1, unit_price: <rate_from_settings>, source_type: 'storyboard', source_id: <storyboard.id> }`

Rates: stored in `supplier_profile` as JSON `default_rates: { meeting_hourly_krw, storyboard_flat_krw, ... }` — editable in settings.

Acceptance:
- Opening the invoice editor for a project with 3 meetings + 1 storyboard shows 4 suggestions
- Importing a suggestion populates a line item; YAGI can edit quantity/price after
- Manually added line items have `source_type='manual'`

---

### 08 — Invoice editor UI

Files:
- `src/app/[locale]/app/invoices/page.tsx` — list
- `src/app/[locale]/app/invoices/new/page.tsx` — new
- `src/app/[locale]/app/invoices/[id]/page.tsx` — editor / detail
- `src/components/invoices/line-items-table.tsx`
- `src/components/invoices/issue-dialog.tsx`
- `src/components/invoices/void-dialog.tsx`

List: filters (status, year, month), columns (invoice_number, project, buyer, total, status, issue_date, paid_at).

New: select project → auto-populates buyer, pulls suggestions → user edits → save as draft → lands on editor.

Editor:
- Top: invoice number (auto-assigned on issue), status pill, breadcrumb
- Supplier block (read-only, pulled from supplier_profile)
- Buyer block (from workspace.business_registration_number etc. — with "incomplete" warnings if fields missing)
- Dates section (supply_date, due_date)
- Line items table (editable; reorder via drag handle)
- Totals auto-computed
- Memo field
- Action buttons (bottom, sticky): "Save draft", "Issue" (opens confirm dialog), "Download PDF", "Void" (after issued)

Issue dialog: shows a preview of what will be filed + big confirm button. Warning text: "This action files to 국세청 and cannot be undone — only voided."

Sidebar: enable `Invoices` for yagi_admin + ws_admin (ws_admin sees only issued invoices of their workspace).

Acceptance:
- Create draft, edit line items, save — persists
- Issue a valid invoice in test mode → status changes, NTS number appears, PDF downloadable
- Non-admin client user on their project sees issued invoices linked from project detail

---

### 09 — Email notification on issue

Extend `src/lib/email/resend.ts` (Phase 1.2) with:

```typescript
export async function sendInvoiceIssuedEmail(args: {
  to: string[]  // buyer's tax_invoice_email + any cc
  invoiceNumber: string
  projectTitle: string
  totalKrw: number
  pdfUrl: string  // public link to /invoices/[id]/print
  ntsApprovalNumber: string
}): Promise<{ ok: boolean }>
```

Subject: `[YAGI Workshop] 세금계산서 발행 — {invoiceNumber}`

Body: bilingual (Korean first). Includes total, NTS approval number, link to print/PDF view, YAGI supplier info.

Attach PDF if we can render one server-side cheaply; otherwise just link. MVP: link only.

Acceptance:
- Issuing an invoice sends email to buyer
- Email renders cleanly in Gmail, Outlook, Apple Mail

---

### 10 — Admin dashboard: revenue + outstanding

Extend admin dashboard (from Phase 1.3 & 1.4 subtasks 10 / 12).

New cards:
- "Revenue this month" — sum of `invoices.total_krw` where `status IN ('issued','paid')` AND `issue_date` in current month
- "Outstanding" — sum where `status='issued'` and `paid_at IS NULL` (breakdown by aging: 0-30 / 31-60 / 61+ days)
- "팝빌 health" pill — runs `/api/health/popbill` (similar to Google health from Phase 1.3)

Acceptance:
- Numbers match a manual SQL aggregate
- Health pill correctly reflects env configuration

---

### 11 — E2E runbook + summary

File: `.yagi-autobuild/phase-1-5-e2e.md`

Runbook:
1. Configure supplier_profile in Settings → 사업자등록번호 + 대표자명 + 주소 등 채우기
2. Ensure a client workspace has business_registration_number set (Settings → Workspace)
3. Complete 1 meeting + 1 storyboard share for a project
4. Create invoice from project → suggestions appear → import both → add manual line item
5. Save draft, download PDF preview → verify layout
6. Issue in test mode → NTS number returned, email sent
7. Mark paid manually → status transitions, dashboard updates
8. Void an issued invoice with reason → status transitions to void
9. Client user logs in → sees issued invoice on project page → downloads PDF

Final Builder actions:
1. `pnpm build` (🛑 kill-switch)
2. `.yagi-autobuild/summary-1-5.md`
3. Telegram: `✅ Phase 1.5 complete — invoicing live (test mode).`

**Yagi action required after Phase 1.5 ships:**
- Switch `POPBILL_MODE=production` in Vercel env
- Test with a low-stakes real invoice to one friendly buyer to verify 국세청 filing end-to-end

---

## Dependencies

```powershell
pnpm add popbill
```

🛑 **KILL-SWITCH** before install.

No other deps if Option C (HTML print) chosen for PDFs.

---

## Parallelism plan

```
Wave A: 01 ‖ 02  (i18n ‖ schema)
   ↓
Wave B: 03 (팝빌 client) → 04 (Taxinvoice builder)
   ↓
Wave C: 07 (suggestions) ‖ 08a (list + new form)
   ↓
Wave D: 05 (issue action needs 04) → 08b (editor needs 05) → 06 (PDF print page)
   ↓
Wave E: 09 (email) ‖ 10 (dashboard)
   ↓
Wave F: 11 (runbook + summary)
```

## Kill-switch triggers (6)

1. Before `pnpm add popbill` (subtask 03)
2. Before migration apply (subtask 02)
3. Before FIRST 팝빌 call in test mode (subtask 05 initial invocation) — Builder confirms credentials present
4. If subtask 06 Builder wants to pivot away from Option C (HTML print) to a library — ask first
5. Before final `pnpm build`
6. Before declaring Phase complete

## Success criteria

1. `pnpm build` clean
2. Migration clean, supplier_profile seeded
3. Draft invoice flow works entirely offline (no 팝빌 call)
4. Test-mode issue round-trips, NTS number returned, stored, shown in UI
5. PDF print page renders acceptably on A4
6. Client sees issued invoices but not drafts (RLS restrictive)
7. Void transitions work
8. Dashboard revenue math correct
9. RLS anon check on all invoice tables

## Model routing

- Builder: Opus 4.7
- Orchestrator: Sonnet 4.6
- Executor 01, 02, 06, 09, 10, 11 (config / docs / simple): Haiku 4.5
- Executor 03, 04, 05, 07, 08 (integrations + complex logic): Sonnet 4.6
- Evaluator: Sonnet 4.6 fresh context

---

## Forbidden

- Filing to 국세청 production from dev environment
- Hardcoding 사업자등록번호 or 대표자명 in source
- 원천징수 logic (out of scope — YAGI is 법인사업자, not freelance)
- Multi-currency / FX conversion
- Recurring invoice generation
- Batch issue (single-invoice-at-a-time for MVP; 팝빌's bulk API is for later)
- Integrating payment collection (Stripe, 토스, 카드결제) — explicitly out of scope
- Deleting issued invoices — must void, not delete

---

## Notes for Yagi

- **팝빌 가입:** https://www.popbill.com → 연동회원 가입 → LinkID / SecretKey 받기. 법인 사업자등록번호 필요.
- **테스트베드:** 가입 직후 바로 쓸 수 있음. 국세청 전송은 mock 처리됨. 실제 승인번호처럼 생긴 값이 반환되지만 국세청에는 안 들어감.
- **프로덕션 전환 체크리스트:**
  - `supplier_profile` 모든 필드 정확히 입력 (특히 사업자등록번호, 대표자명, 주소, 업태/종목)
  - 최소 1건 테스트베드 성공 발행 경험
  - 회계 담당자 (또는 세무사) 승인 후 전환
  - `POPBILL_MODE=production` 전환하는 순간부터 국세청에 실 신고됨 — 실수로 발행하면 세금 영향 있음
- **월 발행 마감일:** 세금계산서는 공급일자 속한 달의 **다음 달 10일**까지 발행해야 함. 팝빌이 이 경고를 띄워주긴 하지만 우리도 invoice.supply_date > 30 days ago && status='draft' 인 것들은 대시보드에 경고 표시


---

## ADDENDUM: Mock mode (2026-04-22 추가)

> 팝빌 가입 승인이 늦어져 Phase 1.5는 mock mode로 빌드됨. 승인 후 `POPBILL_MODE=test`로 전환하면 즉시 실제 API 사용 가능.

### Environment switch

`.env.local`:
```env
POPBILL_MODE=mock        # 'mock' | 'test' | 'production'
POPBILL_LINK_ID=         # mock 모드에서는 비워둬도 됨
POPBILL_SECRET_KEY=
POPBILL_CORP_NUM=
```

`src/lib/popbill/client.ts` 진입점에서 `POPBILL_MODE` 분기:

```typescript
type PopbillMode = 'mock' | 'test' | 'production'

const mode = (process.env.POPBILL_MODE ?? 'test') as PopbillMode

// CRITICAL SAFETY GUARD
if (mode === 'mock' && process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
  throw new Error(
    'POPBILL_MODE=mock is forbidden in production. Set POPBILL_MODE=production with real credentials.'
  )
}

export async function issueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
  if (mode === 'mock') return mockIssueTaxInvoice(args)
  if (mode === 'test') return realIssueTaxInvoice(args, TEST_BASE_URL)
  return realIssueTaxInvoice(args, PROD_BASE_URL)
}
```

### Mock implementation

```typescript
async function mockIssueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
  await new Promise(r => setTimeout(r, 200))  // simulate API latency

  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')

  return {
    ok: true,
    nts_approval_number: `MOCK-${ymd}-${random}`,
    popbill_mgt_key: `mock-${args.invoice_id}`,
    raw_response: {
      mock: true,
      issued_at: new Date().toISOString(),
      warning: '이 송장은 실제로 국세청에 신고되지 않았습니다.',
      args_received: args,  // for debugging
    },
  }
}
```

### Schema addition

Migration에 컬럼 1개 추가:
```sql
alter table invoices
  add column if not exists is_mock boolean not null default false;

create index if not exists idx_invoices_is_mock on invoices(is_mock) where is_mock = true;
```

`createInvoice` Server Action에서 issue 시점에 mode 체크:
```typescript
if (process.env.POPBILL_MODE === 'mock') {
  await supabase.from('invoices').update({ is_mock: true }).eq('id', invoice_id)
}
```

### UI markings (mandatory)

| 위치 | 표시 |
|------|------|
| Invoice detail 상단 (mock일 때) | 빨간 배너: "⚠️ MOCK 모드 — 실제 국세청 신고 아님. 팝빌 승인 후 재발행 필요" |
| Invoice list (admin) | mock 송장은 행에 🟡 MOCK 뱃지 |
| PDF 워터마크 | 대각선 회색 텍스트 "MOCK / 미신고" |
| Admin dashboard | 카운터: "MOCK 송장 N건 — 재발행 필요" 섹션 |
| 클라이언트 화면 | mock 송장은 **클라이언트에게 노출하지 않음** (RLS restrictive policy 추가) |

추가 RLS:
```sql
create policy invoices_hide_mocks_from_clients on invoices as restrictive for select using (
  is_yagi_admin() or is_mock = false
);
```

### Migration path: mock → real

야기가 팝빌 승인 받으면:
1. `.env.local` 수정: `POPBILL_MODE=test`, 3개 키 채우기
2. Dev 서버 재시작
3. Admin dashboard "재발행 필요" 섹션 진입
4. mock 송장 각각 클릭 → "재발행" 버튼 → 동일 데이터로 새 invoice row 생성 (test mode → 실제 팝빌 호출) → 원래 mock invoice는 status='void'로 마킹, void_reason='재발행: mock→real'
5. 클라이언트는 새로 발행된 real invoice만 보게 됨 (mock은 RLS로 가려짐)

### Codex K-05 추가 focus prompt

기존 Phase 1.5 review prompt에 다음 항목 추가:

```
7. Mock mode safety:
- POPBILL_MODE=mock이 NEXT_PUBLIC_VERCEL_ENV=production 환경에서 throw하는 가드가 client.ts 진입점 가장 먼저 실행되는가?
- mock 송장이 클라이언트 워크스페이스 멤버에게 노출되지 않도록 RLS restrictive policy가 정확히 적용됐는가?
- mock 모드에서 발행된 invoice의 PDF에 워터마크가 빠짐없이 들어가는가? (PDF 생성 함수에 unit test 필요)
- mock → real 재발행 경로가 idempotent한가? 같은 mock invoice를 두 번 재발행해도 real invoice는 한 번만 생성되어야 함.
```

### Success criteria 추가

| ID | 기존/추가 | 항목 |
|----|----------|------|
| 12 | 추가 | mock 모드에서 invoice 발행 → DB에 is_mock=true, fake nts_approval_number 저장됨 |
| 13 | 추가 | mock 모드 invoice가 클라이언트 화면 (`/app/projects/[id]`) 에 노출되지 않음 |
| 14 | 추가 | PDF 생성 시 mock 송장은 워터마크 포함, real 송장은 포함 안 함 |
| 15 | 추가 | `POPBILL_MODE=mock` 인 채로 `pnpm build` + Vercel preview 배포 시 production guard가 throw하는지 검증 (또는 build script에서 경고) |

---

**Mock mode 끝. Phase 1.5는 mock으로 빌드 진행, Phase 1.6 이후 정상 진행.**
