Reading additional input from stdin...
OpenAI Codex v0.122.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019db133-41c0-7c90-bfef-c291aabaf679
--------
user
You are Codex K-05, an adversarial security/correctness reviewer. Review Phase 1.5 (Invoicing, MOCK MODE) of the YAGI Workshop Next.js 15 / Supabase codebase at the current working directory. Find HIGH/CRITICAL bugs we'd regret shipping — be surgical, not nitpicky.

## Files in scope
- src/lib/popbill/client.ts
- src/lib/popbill/build-taxinvoice.ts
- src/lib/invoices/suggest-line-items.ts
- src/lib/invoices/issue-email.ts
- src/app/[locale]/app/invoices/page.tsx
- src/app/[locale]/app/invoices/actions.ts
- src/app/[locale]/app/invoices/new/page.tsx
- src/app/[locale]/app/invoices/[id]/page.tsx
- src/app/[locale]/app/invoices/[id]/actions.ts
- src/app/[locale]/app/invoices/[id]/line-item-actions.ts
- src/app/[locale]/app/invoices/[id]/print/page.tsx
- src/app/[locale]/app/admin/invoices/page.tsx
- src/components/invoices/new-invoice-form.tsx
- src/components/invoices/invoice-editor.tsx
- src/components/invoices/print-button.tsx
- supabase/migrations/20260421094855_phase1_schema.sql (Phase 1.5 sections: invoices, invoice_line_items, supplier_profile, RLS, is_mock col, recalc_invoice_totals trigger)

## Focus

### Standard adversarial checks
- Authorization: every Server Action and RSC page must gate by role (yagi_admin for mutations, ws_member for read). Cross-workspace leaks in RLS?
- Race conditions in status transitions (draft→issued→paid/void). Use of `.eq("status","draft")` guard sufficient?
- HTML injection / XSS in email templates (issue-email.ts) — any user-supplied fields interpolated into HTML without escaping?
- Korean tax-invoice data integrity: totals math, BRN (business registration number) validation, NTS approval number format.
- CSRF: any raw Route Handlers with mutations? (Server Actions have built-in protection.)
- SSRF / open redirect in print URL construction.
- Rate limiting / idempotency on issueInvoice.
- Print page auth gate: is /app/invoices/[id]/print accessible without auth?

### Phase 1.5 mock-mode specific (MUST VERIFY)

**(a) Mock rejected in production:** Does `src/lib/popbill/client.ts` HALT module load when `POPBILL_MODE=mock` AND `NEXT_PUBLIC_VERCEL_ENV === "production"`? Anything bypass this guard (fallback path, env shim, runtime override)? Are env vars read at module top level (good) or deferred (could skip check on warm Vercel instances)?

**(b) is_mock visual distinction:** Every surface rendering invoice data must visually mark mocks:
- Invoice list (/app/invoices): mock badge per row?
- Invoice detail/editor (/app/invoices/[id]): red banner?
- Print page (/app/invoices/[id]/print): red watermark + banner?
- Admin dashboard (/app/admin/invoices): "MOCK 송장" counter?
- Email template (issue-email.ts): red disclosure banner, `(MOCK)` in subject?
Flag any screen that could silently render a mock without distinction.

**(c) Mock→production transition integrity:** When POPBILL_MODE flips mock→production:
- is_mock=true rows remain visible + filterable ("재발행 필요" list)?
- Issued mock invoices have nts_approval_number="MOCK-…" and popbill_mgt_key="mock-…" — anything prevent real popbill path from re-using those keys? Reissue collision possible?
- popbill_response jsonb shape differences mock vs real that would break rendering?
- RLS: do mock rows leak to non-yagi members? RESTRICTIVE policies should hide is_mock=true from non-yagi. Verify.

### Other Phase 1.5 high-risk areas
- invoice_line_items CRUD: yagi_admin gate enforced AND invoice.status='draft'? A workspace member (non-yagi) must not mutate line items directly.
- buildTaxinvoice TOTALS_MISMATCH: trigger recalc_invoice_totals keeps totals consistent — any code path inserts line items without triggering recalc?
- Double-issuance race: popbill call happens BEFORE DB update. Two concurrent issueInvoice calls could double-file. Is popbill_mgt_key used as idempotency key? Flag as HIGH if not.

## Output format

For each finding, produce:
```
[SEVERITY: CRITICAL|HIGH|MEDIUM|LOW] <short title>
  File: <path:line>
  Issue: <what's wrong>
  Impact: <what attacker/bug can do>
  Fix: <exact change>
```

Group by severity. End with:
```
## Mock-mode gate verdict
(a) Production rejection: PASS | FAIL — <detail>
(b) Visual distinction: PASS | FAIL — <surfaces>
(c) Mock→prod transition: PASS | FAIL — <detail>
```

Be precise with file:line references. Don't invent issues — if a check passes, note it briefly and move on. Your job is to find the bugs that would cost us money or trust in production.
codex
Reviewing the Phase 1.5 invoicing path for auth, mock-mode separation, and issuance integrity. I’m reading the scoped files plus the Phase 1.5 migration first, then I’ll trace the issue flow end to end and only report ship-stopping findings.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/app/[locale]/app/invoices/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/app/[locale]/app/invoices/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/lib/popbill/client.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/lib/invoices/suggest-line-items.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/lib/popbill/build-taxinvoice.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/lib/invoices/issue-email.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 1201ms:
import "server-only";

export type PopbillMode = "mock" | "test" | "production";

const mode: PopbillMode = ((process.env.POPBILL_MODE ?? "test") as PopbillMode);

// CRITICAL SAFETY GUARD ??must be the very first thing the module does.
// Refuses mock mode in production deploys (per Codex K-05 mock-mode focus #7).
if (mode === "mock" && process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
  throw new Error(
    "POPBILL_MODE=mock is forbidden in production. Set POPBILL_MODE=production with real credentials."
  );
}

// ??? Types: shared between mock + real ???????????????????????????????????????
// These mirror the ?앸퉴 Taxinvoice schema fields we send. When the real SDK
// lands, prefer mapping these types onto the SDK's Taxinvoice type rather
// than rewriting every call site.

export type TaxinvoiceLineDetail = {
  serialNum: number;
  purchaseDT: string; // YYYYMMDD
  itemName: string;
  spec: string;
  qty: string;
  unitCost: string;
  supplyCost: string;
  tax: string;
  remark: string;
};

export type Taxinvoice = {
  writeDate: string;          // YYYYMMDD
  chargeDirection: "?뺢낵湲? | "??낵湲?;
  issueType: "?뺣컻?? | "??컻?? | "?꾩닔??;
  taxType: "怨쇱꽭" | "?곸꽭" | "硫댁꽭";
  purposeType: "?곸닔" | "泥?뎄";

  invoicerCorpNum: string;
  invoicerMgtKey: string;
  invoicerCorpName: string;
  invoicerCEOName: string;
  invoicerAddr: string;
  invoicerBizClass: string;
  invoicerBizType: string;
  invoicerContactName: string;
  invoicerEmail: string;

  invoiceeType: "?ъ뾽?? | "媛쒖씤" | "?멸뎅??;
  invoiceeCorpNum: string;
  invoiceeCorpName: string;
  invoiceeCEOName: string;
  invoiceeAddr: string;
  invoiceeBizClass: string;
  invoiceeBizType: string;
  invoiceeEmail1: string;

  supplyCostTotal: string;
  taxTotal: string;
  totalAmount: string;
  modifyCode: number | null;

  detailList: TaxinvoiceLineDetail[];
};

export type IssueArgs = {
  invoice_id: string;
  taxinvoice: Taxinvoice;
  memo?: string;
};

export type IssueResult =
  | {
      ok: true;
      nts_approval_number: string;   // 援?꽭泥??뱀씤踰덊샇
      popbill_mgt_key: string;
      mode: PopbillMode;
      raw_response: Record<string, unknown>;
    }
  | { ok: false; error_code: string; error_message: string; mode: PopbillMode };

// ??? Public API ??????????????????????????????????????????????????????????????

export function getPopbillMode(): PopbillMode {
  return mode;
}

export function isPopbillConfigured(): boolean {
  if (mode === "mock") return true;
  return Boolean(
    process.env.POPBILL_LINK_ID &&
    process.env.POPBILL_SECRET_KEY &&
    process.env.POPBILL_CORP_NUM,
  );
}

export async function issueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
  if (mode === "mock") return mockIssueTaxInvoice(args);
  // Real SDK paths not implemented yet ??popbill credentials pending.
  return {
    ok: false,
    error_code: "NOT_IMPLEMENTED",
    error_message: `POPBILL_MODE=${mode} requires the popbill SDK (not yet installed).`,
    mode,
  };
}

// ??? Mock implementation ?????????????????????????????????????????????????????

async function mockIssueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
  await new Promise((r) => setTimeout(r, 200)); // simulate API latency

  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");

  return {
    ok: true,
    mode: "mock",
    nts_approval_number: `MOCK-${ymd}-${random}`,
    popbill_mgt_key: `mock-${args.invoice_id}`,
    raw_response: {
      mock: true,
      issued_at: new Date().toISOString(),
      warning: "???≪옣? ?ㅼ젣濡?援?꽭泥?뿉 ?좉퀬?섏? ?딆븯?듬땲??",
      taxinvoice_summary: {
        writeDate: args.taxinvoice.writeDate,
        invoicerCorpNum: args.taxinvoice.invoicerCorpNum,
        invoiceeCorpNum: args.taxinvoice.invoiceeCorpNum,
        totalAmount: args.taxinvoice.totalAmount,
        lineCount: args.taxinvoice.detailList.length,
      },
    },
  };
}

 succeeded in 1204ms:
import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SuggestedLineItem = {
  item_name: string;
  specification: string | null;
  quantity: number;
  unit_price_krw: number;
  source_type: "meeting" | "storyboard";
  source_id: string;
  // Hint for the UI ??true when this source is already on a non-void invoice
  // for the same project (so YAGI can avoid duplicate billing).
  already_billed: boolean;
};

export type SuggestRangeFilter = {
  // ISO yyyy-mm-dd dates; both required.
  from: string;
  to: string;
};

/**
 * Build a list of suggested invoice line items for a project.
 *
 * Sources:
 *   - meetings with status='completed' AND scheduled_at within [from, to]
 *   - preprod_boards with status IN ('shared','approved') AND updated_at within [from, to]
 *
 * Returns items in display order: meetings first (by scheduled_at desc), then storyboards (by updated_at desc).
 *
 * The unit_price_krw comes from supplier_profile.default_rates JSON
 * (meeting_hourly_krw / storyboard_flat_krw). If a rate is missing, default
 * to 0 ??UI is responsible for surfacing zeros so YAGI sets a price.
 *
 * `already_billed` is true if the source already appears in an invoice_line_item
 * (any non-void invoice). Uses one batched lookup keyed on (source_type, source_id).
 */
export async function suggestLineItems(
  projectId: string,
  range: SuggestRangeFilter,
): Promise<SuggestedLineItem[]> {
  const supabase = await createSupabaseServer();

  // 1. Look up default rates from supplier_profile (single-row table)
  const { data: supplier } = await supabase
    .from("supplier_profile")
    .select("default_rates")
    .limit(1)
    .maybeSingle();

  const rates =
    (supplier?.default_rates as { meeting_hourly_krw?: number; storyboard_flat_krw?: number } | null) ??
    {};
  const meetingRate = Number(rates.meeting_hourly_krw ?? 0);
  const storyboardRate = Number(rates.storyboard_flat_krw ?? 0);

  // 2. Fetch completed meetings in range
  // NOTE: meetings table uses `scheduled_at` (not `starts_at`).
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, scheduled_at, duration_minutes")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .gte("scheduled_at", `${range.from}T00:00:00+09:00`)
    .lte("scheduled_at", `${range.to}T23:59:59+09:00`)
    .order("scheduled_at", { ascending: false });

  // 3. Fetch shared/approved preprod_boards in range (use updated_at as the proxy for "delivered")
  const { data: boards } = await supabase
    .from("preprod_boards")
    .select("id, title, updated_at, status")
    .eq("project_id", projectId)
    .in("status", ["shared", "approved"])
    .gte("updated_at", `${range.from}T00:00:00+09:00`)
    .lte("updated_at", `${range.to}T23:59:59+09:00`)
    .order("updated_at", { ascending: false });

  // 4. Batch-look up which sources are already on a non-void invoice line item
  // For correctness, restrict to invoices for THIS project.
  const sourceKeys: { source_type: "meeting" | "storyboard"; source_id: string }[] = [
    ...((meetings ?? []).map((m) => ({ source_type: "meeting" as const, source_id: m.id }))),
    ...((boards ?? []).map((b) => ({ source_type: "storyboard" as const, source_id: b.id }))),
  ];

  const billedSet = new Set<string>();
  if (sourceKeys.length > 0) {
    const sourceIds = sourceKeys.map((k) => k.source_id);
    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("source_type, source_id, invoices!inner(project_id, status)")
      .in("source_id", sourceIds);

    for (const li of lineItems ?? []) {
      // The joined "invoices" object can be unwrapped or nested depending on how
      // postgrest returned it; normalize to a single row.
      const inv = (li as { invoices: { project_id: string; status: string } | { project_id: string; status: string }[] }).invoices;
      const project_id = Array.isArray(inv) ? inv[0]?.project_id : inv?.project_id;
      const status = Array.isArray(inv) ? inv[0]?.status : inv?.status;
      if (project_id !== projectId) continue;
      if (status === "void") continue;
      if (li.source_type && li.source_id) {
        billedSet.add(`${li.source_type}:${li.source_id}`);
      }
    }
  }

  // 5. Build suggestions
  const suggestions: SuggestedLineItem[] = [];

  for (const m of meetings ?? []) {
    const hours = Math.round(((m.duration_minutes ?? 0) / 60) * 100) / 100;
    suggestions.push({
      item_name: `?먮Ц/誘명똿 ??${m.title}`,
      specification: null,
      quantity: hours,
      unit_price_krw: meetingRate,
      source_type: "meeting",
      source_id: m.id,
      already_billed: billedSet.has(`meeting:${m.id}`),
    });
  }

  for (const b of boards ?? []) {
    suggestions.push({
      item_name: `?ㅽ넗由щ낫????${b.title}`,
      specification: null,
      quantity: 1,
      unit_price_krw: storyboardRate,
      source_type: "storyboard",
      source_id: b.id,
      already_billed: billedSet.has(`storyboard:${b.id}`),
    });
  }

  return suggestions;
}

2026-04-21T18:00:34.841053Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 1.3 seconds
Output:
Get-Content : 지정한 경로 src/app/[locale]/app/invoices/actions.ts에 개체가 없거나 -Include 또는 -Exclude 매개 변수로 필터링되었습니다.
위치 줄:2 문자:1
+ Get-Content -Path 'src/app/[locale]/app/invoices/actions.ts'
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (System.String[]:String[]) [Get-Content], Exception
    + FullyQualifiedErrorId : ItemNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

 exited 1 in 1262ms:
Get-Content : 지정한 경로 src/app/[locale]/app/invoices/actions.ts에 개체가 없거나 -Include 또는 -Exclude 매개 변수로 필터링되었습니다.
위치 줄:2 문자:1
+ Get-Content -Path 'src/app/[locale]/app/invoices/actions.ts'
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (System.String[]:String[]) [Get-Content], Exception
    + FullyQualifiedErrorId : ItemNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

 exited 1 in 1264ms:
Get-Content : 지정한 경로 src/app/[locale]/app/invoices/page.tsx에 개체가 없거나 -Include 또는 -Exclude 매개 변수로 필터링되었습니다.
위치 줄:2 문자:1
+ Get-Content -Path 'src/app/[locale]/app/invoices/page.tsx'
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (System.String[]:String[]) [Get-Content], Exception
    + FullyQualifiedErrorId : ItemNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

2026-04-21T18:00:34.841838Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 1.3 seconds
Output:
Get-Content : 지정한 경로 src/app/[locale]/app/invoices/page.tsx에 개체가 없거나 -Include 또는 -Exclude 매개 변수로 필터링되었습니다.
위치 줄:2 문자:1
+ Get-Content -Path 'src/app/[locale]/app/invoices/page.tsx'
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (System.String[]:String[]) [Get-Content], Exception
    + FullyQualifiedErrorId : ItemNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

 succeeded in 1264ms:
import "server-only";
import type { Tables } from "@/lib/supabase/database.types";
import type { Taxinvoice, TaxinvoiceLineDetail } from "./client";

export type SupplierProfileRow = Tables<"supplier_profile">;
export type WorkspaceRow = Tables<"workspaces">;
export type InvoiceRow = Tables<"invoices">;
export type InvoiceLineItemRow = Tables<"invoice_line_items">;

export type BuildArgs = {
  supplier: SupplierProfileRow;
  buyer: WorkspaceRow;
  invoice: InvoiceRow;
  lineItems: InvoiceLineItemRow[];
  // Optional override; defaults to today in KST when invoice.issue_date is null
  writeDate?: string;
};

export type BuildResult =
  | { ok: true; taxinvoice: Taxinvoice }
  | { ok: false; error_code: string; missing_fields?: string[] };

/**
 * Map our DB rows to a ?앸퉴 Taxinvoice payload.
 *
 * Validations performed:
 * - Supplier: business_registration_number (10 digits), corporate_name, representative_name, address, contact_email
 * - Buyer: business_registration_number, representative_name, business_address, tax_invoice_email
 * - Invoice: at least 1 line item
 *
 * If validation fails returns { ok: false, missing_fields: [...] } so callers
 * can surface a precise UI message before any popbill call.
 */
export function buildTaxinvoice(args: BuildArgs): BuildResult {
  const missing: string[] = [];

  // Supplier validation
  if (!args.supplier.business_registration_number?.match(/^\d{10}$/)) {
    missing.push("supplier.business_registration_number");
  }
  if (!args.supplier.corporate_name) missing.push("supplier.corporate_name");
  if (!args.supplier.representative_name) missing.push("supplier.representative_name");
  if (!args.supplier.address) missing.push("supplier.address");
  if (!args.supplier.contact_email) missing.push("supplier.contact_email");

  // Buyer validation
  if (!args.buyer.business_registration_number?.match(/^\d{10}$/)) {
    missing.push("buyer.business_registration_number");
  }
  if (!args.buyer.representative_name) missing.push("buyer.representative_name");
  if (!args.buyer.business_address) missing.push("buyer.business_address");
  if (!args.buyer.tax_invoice_email) missing.push("buyer.tax_invoice_email");

  if (args.lineItems.length === 0) missing.push("invoice.lineItems");

  if (missing.length > 0) {
    return { ok: false, error_code: "VALIDATION_FAILED", missing_fields: missing };
  }

  // Build write date: invoice.issue_date if set, else today in KST.
  const writeDate =
    args.writeDate ??
    (args.invoice.issue_date
      ? args.invoice.issue_date.replace(/-/g, "")
      : todayKstYmd());

  // Build line items
  const detailList: TaxinvoiceLineDetail[] = args.lineItems.map((li, idx) => ({
    serialNum: idx + 1,
    purchaseDT: writeDate,
    itemName: li.item_name,
    spec: li.specification ?? "",
    qty: String(li.quantity),
    unitCost: String(li.unit_price_krw),
    supplyCost: String(li.supply_krw),
    tax: String(li.vat_krw),
    remark: li.note ?? "",
  }));

  // Verify totals add up ??popbill rejects mismatched totals
  const sumSupply = args.lineItems.reduce((a, li) => a + li.supply_krw, 0);
  const sumTax = args.lineItems.reduce((a, li) => a + li.vat_krw, 0);
  if (sumSupply !== args.invoice.subtotal_krw) {
    return { ok: false, error_code: "TOTALS_MISMATCH" };
  }
  if (sumTax !== args.invoice.vat_krw) {
    return { ok: false, error_code: "TOTALS_MISMATCH" };
  }

  // Generate MgtKey if invoice doesn't have one yet
  const mgtKey =
    args.invoice.popbill_mgt_key ??
    `INV-${args.invoice.id.slice(0, 8)}-${Date.now().toString(36)}`;

  const taxinvoice: Taxinvoice = {
    writeDate,
    chargeDirection: "?뺢낵湲?,
    issueType: "?뺣컻??,
    taxType: "怨쇱꽭",
    purposeType: "泥?뎄",

    invoicerCorpNum: args.supplier.business_registration_number!,
    invoicerMgtKey: mgtKey,
    invoicerCorpName: args.supplier.corporate_name,
    invoicerCEOName: args.supplier.representative_name,
    invoicerAddr: args.supplier.address,
    invoicerBizClass: args.supplier.business_item ?? "",
    invoicerBizType: args.supplier.business_type ?? "",
    invoicerContactName: args.supplier.representative_name,
    invoicerEmail: args.supplier.contact_email,

    invoiceeType: "?ъ뾽??,
    invoiceeCorpNum: args.buyer.business_registration_number!,
    invoiceeCorpName: args.buyer.name,
    invoiceeCEOName: args.buyer.representative_name!,
    invoiceeAddr: args.buyer.business_address!,
    invoiceeBizClass: args.buyer.business_item ?? "",
    invoiceeBizType: args.buyer.business_type ?? "",
    invoiceeEmail1: args.buyer.tax_invoice_email!,

    supplyCostTotal: String(args.invoice.subtotal_krw),
    taxTotal: String(args.invoice.vat_krw),
    totalAmount: String(args.invoice.total_krw),
    modifyCode: null,

    detailList,
  };

  return { ok: true, taxinvoice };
}

function todayKstYmd(): string {
  // Convert UTC now to KST (UTC+9), then format YYYYMMDD.
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + 9 * 60 * 60_000);
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const d = String(kst.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

 succeeded in 1271ms:
import "server-only";
import { createSupabaseService } from "@/lib/supabase/service";
import { getResend, EMAIL_FROM } from "@/lib/resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
}

export async function sendInvoiceIssuedEmail(invoiceId: string): Promise<void> {
  const svc = createSupabaseService();

  const { data: invoice, error: invoiceErr } = await svc
    .from("invoices")
    .select(
      "id, status, invoice_number, nts_approval_number, supply_date, due_date, subtotal_krw, vat_krw, total_krw, is_mock, project_id, workspace_id, supplier_id",
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceErr || !invoice) {
    console.error("[invoices] email: invoice not found", {
      invoiceId,
      invoiceErr,
    });
    return;
  }

  if (invoice.status !== "issued") {
    console.error("[invoices] email: invoice status is not 'issued'", {
      invoiceId,
      status: invoice.status,
    });
    return;
  }

  const [projectRes, buyerRes, supplierRes] = await Promise.all([
    svc
      .from("projects")
      .select("id, title")
      .eq("id", invoice.project_id)
      .maybeSingle(),
    svc
      .from("workspaces")
      .select("id, name, tax_invoice_email")
      .eq("id", invoice.workspace_id)
      .maybeSingle(),
    svc
      .from("supplier_profile")
      .select("id, corporate_name, contact_email")
      .eq("id", invoice.supplier_id)
      .maybeSingle(),
  ]);

  const project = projectRes.data;
  const buyer = buyerRes.data;
  const supplier = supplierRes.data;

  if (!buyer || !buyer.tax_invoice_email) {
    console.error("[invoices] email: buyer or tax_invoice_email missing", {
      invoiceId,
      workspaceId: invoice.workspace_id,
    });
    return;
  }

  const resend = getResend();
  if (!resend) {
    console.error("[invoices] email: Resend client not configured", {
      invoiceId,
    });
    return;
  }

  const projectTitle = project?.title ?? "??;
  const buyerName = buyer.name ?? "??;
  const supplierName = supplier?.corporate_name ?? "YAGI Workshop";
  const supplierContactEmail = supplier?.contact_email ?? "yagi@yagiworkshop.xyz";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const printUrl = `${siteUrl}/ko/app/invoices/${invoice.id}/print`;

  const subject = invoice.is_mock
    ? `[YAGI] ?멸툑怨꾩궛??(MOCK) ??${invoice.invoice_number ?? invoice.id}`
    : `[YAGI] ?멸툑怨꾩궛??諛쒗뻾 ?뚮┝ ??${invoice.invoice_number ?? invoice.id}`;

  const mockBanner = invoice.is_mock
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:8px;margin:16px 0">
  <strong>?좑툘 二쇱쓽: ???멸툑怨꾩궛?쒕뒗 ?꾩옱 MOCK 紐⑤뱶濡?諛쒗뻾?섏뿀?듬땲??</strong>
  <p style="margin:8px 0 0;font-size:14px">?앸퉴 ?쒕퉬???뱀씤 ?湲?以묒씠硫? 援?꽭泥?뿉 ?ㅼ젣 ?좉퀬??臾몄꽌媛 ?꾨떃?덈떎. ?앸퉴 ?뱀씤 ???щ컻???덉젙?낅땲??</p>
</div>`
    : "";

  const htmlBody = `<h2 style="font-family: system-ui, sans-serif">?멸툑怨꾩궛??諛쒗뻾 ?뚮┝</h2>
<p>?덈뀞?섏꽭?? <strong>${escapeHtml(buyerName)}</strong> ?대떦?먮떂.</p>
<p><strong>${escapeHtml(supplierName)}</strong>?먯꽌 ?멸툑怨꾩궛?쒕? 諛쒗뻾?섏??듬땲??</p>
${mockBanner}
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td>?≪옣 踰덊샇</td><td>${escapeHtml(invoice.invoice_number ?? "??)}</td></tr>
  <tr><td>援?꽭泥??뱀씤踰덊샇</td><td>${escapeHtml(invoice.nts_approval_number ?? "??)}</td></tr>
  <tr><td>?꾨줈?앺듃</td><td>${escapeHtml(projectTitle)}</td></tr>
  <tr><td>怨듦툒?쇱옄</td><td>${escapeHtml(invoice.supply_date)}</td></tr>
  <tr><td>寃곗젣湲고븳</td><td>${escapeHtml(invoice.due_date ?? "??)}</td></tr>
  <tr><td>怨듦툒媛??/td><td>${escapeHtml(formatKRW(invoice.subtotal_krw))}</td></tr>
  <tr><td>遺媛??/td><td>${escapeHtml(formatKRW(invoice.vat_krw))}</td></tr>
  <tr><td><strong>?⑷퀎</strong></td><td><strong>${escapeHtml(formatKRW(invoice.total_krw))}</strong></td></tr>
</table>
<p style="margin:24px 0"><a href="${escapeHtml(printUrl)}" style="display:inline-block;background:#000;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">?멸툑怨꾩궛??PDF 蹂닿린 ??/a></p>
<p style="color:#6b7280;font-size:12px;margin-top:32px">
  臾몄쓽?ы빆???덉쑝?쒕㈃ ${escapeHtml(supplierContactEmail)} 濡??뚯떊??二쇱꽭??
</p>`;

  const mockWarningText = invoice.is_mock
    ? "[WARNING] This invoice was issued in MOCK mode. It has NOT been filed with the Korean National Tax Service (NTS). A real filing will follow once Popbill approval is granted.\n\n"
    : "";

  const textBody =
    `${subject}\n\n` +
    mockWarningText +
    `Invoice Number: ${invoice.invoice_number ?? "-"}\n` +
    `NTS Approval Number: ${invoice.nts_approval_number ?? "-"}\n` +
    `Project: ${projectTitle}\n` +
    `Supply Date: ${invoice.supply_date}\n` +
    `Due Date: ${invoice.due_date ?? "-"}\n` +
    `Subtotal: KRW ${invoice.subtotal_krw}\n` +
    `VAT: KRW ${invoice.vat_krw}\n` +
    `Total: KRW ${invoice.total_krw}\n\n` +
    `${printUrl}\n\n` +
    `Contact: ${supplierContactEmail}\n`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: buyer.tax_invoice_email,
      bcc: EMAIL_FROM,
      subject,
      html: htmlBody,
      text: textBody,
    });
  } catch (err) {
    console.error("[invoices] email send failed", err);
  }
}

codex
The first pass is in. I’ve confirmed the Popbill mock guard exists at module load, and I’m now tracing the invoice pages/actions and the Phase 1.5 RLS/trigger SQL with literal-path reads so I can pin exact lines for auth and race defects.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/invoices/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/invoices/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/invoices/new/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/invoices/[id]/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/invoices/[id]/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/invoices/[id]/line-item-actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 631ms:
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; year?: string; month?: string }>;
};

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  status: string;
  supply_date: string;
  issue_date: string | null;
  paid_at: string | null;
  total_krw: number;
  is_mock: boolean;
  project: { title: string } | null;
  workspace: { name: string } | null;
};

function getStatusBadgeVariant(
  status: string
): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "issued":
      return "default";
    case "paid":
      return "outline";
    case "void":
      return "destructive";
    default:
      return "secondary";
  }
}

function lastDayOfMonth(year: string, month: string): string {
  const y = Number(year);
  const m = Number(month);
  // last day = first day of next month - 1 day
  const d = new Date(Date.UTC(y, m, 0));
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${dd}`;
}

export default async function InvoicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const t = await getTranslations({ locale, namespace: "invoices" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const uid = user.id;

  // Detect yagi_admin (controls "+ New invoice" button)
  const { data: yagiAdminRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  const isYagiAdmin = !!(yagiAdminRows && yagiAdminRows.length > 0);

  // RLS handles visibility (non-yagi sees only non-draft/non-mock rows)
  let query = supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      status,
      supply_date,
      issue_date,
      paid_at,
      total_krw,
      is_mock,
      project:projects(title),
      workspace:workspaces(name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.year && sp.month) {
    const start = `${sp.year}-${sp.month}-01`;
    const end = lastDayOfMonth(sp.year, sp.month);
    query = query.gte("issue_date", start).lte("issue_date", end);
  }

  const { data: invoicesData, error } = await query;

  if (error) {
    console.error("[InvoicesPage] Supabase error:", error.message);
  }

  // postgrest may return nested joins as an array OR a single object
  const invoices: InvoiceRow[] = (invoicesData ?? []).map((row) => {
    const proj = row.project as
      | { title: string }
      | { title: string }[]
      | null
      | undefined;
    const ws = row.workspace as
      | { name: string }
      | { name: string }[]
      | null
      | undefined;
    return {
      id: row.id,
      invoice_number: row.invoice_number,
      status: row.status,
      supply_date: row.supply_date,
      issue_date: row.issue_date,
      paid_at: row.paid_at,
      total_krw: row.total_krw,
      is_mock: row.is_mock,
      project: Array.isArray(proj) ? (proj[0] ?? null) : (proj ?? null),
      workspace: Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null),
    };
  });

  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const currencyFmt = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  });

  const statuses = ["draft", "issued", "paid", "void"] as const;

  // Year/month filter options: current year and previous year
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearOptions = [currentYear, currentYear - 1].map(String);
  const monthOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("list_title")}</em>
        </h1>
        {isYagiAdmin && (
          <Link
            href="/app/invoices/new"
            className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
          >
            {t("new")}
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-6 flex-wrap">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t("filter_status")}
        >
          <option value="">{t("filter_all")}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={sp.year ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t("filter_year")}
        >
          <option value="">{t("filter_year")}</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="month"
          defaultValue={sp.month ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t("filter_month")}
        >
          <option value="">{t("filter_month")}</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full uppercase tracking-[0.12em] px-4 py-1.5 border border-input bg-background text-foreground hover:bg-accent text-sm font-medium transition-colors"
        >
          {t("filter_status")}
        </button>
      </form>

      {/* Empty state */}
      {invoices.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
          <p className="font-display text-xl tracking-tight mb-2 keep-all">
            <em>{t("list_empty")}</em>
          </p>
          {isYagiAdmin && (
            <Link
              href="/app/invoices/new"
              className="mt-4 rounded-full uppercase tracking-[0.12em] px-6 py-3 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
            >
              {t("new")}
            </Link>
          )}
        </div>
      )}

      {/* Invoices table */}
      {invoices.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("invoice_number_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  {t("project_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  {t("buyer_label")}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {t("total_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("filter_status")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  {t("issue_date_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  {t("paid_at_label")}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 hover:bg-accent transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={
                        `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                      }
                      className="font-medium hover:underline keep-all line-clamp-1 tabular-nums"
                    >
                      {inv.invoice_number ?? "??}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[180px]">
                    {inv.project?.title ?? "??}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[160px]">
                    {inv.workspace?.name ?? "??}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {currencyFmt.format(inv.total_krw)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={getStatusBadgeVariant(inv.status)}
                        className={cn("rounded-full text-[11px] px-2.5 py-0.5")}
                      >
                        {t(
                          `status_${inv.status}` as
                            | "status_draft"
                            | "status_issued"
                            | "status_paid"
                            | "status_void"
                        )}
                      </Badge>
                      {inv.is_mock && (
                        <Badge
                          variant="outline"
                          className="rounded-full text-[10px] px-2 py-0.5 border-amber-300 text-amber-700 bg-amber-50"
                        >
                          {t("mock_badge")}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap tabular-nums">
                    {inv.issue_date
                      ? dateFmt.format(new Date(inv.issue_date))
                      : "??}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap tabular-nums">
                    {inv.paid_at ? dateFmt.format(new Date(inv.paid_at)) : "??}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

 succeeded in 661ms:
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const createInvoiceSchema = z.object({
  projectId: z.string().uuid(),
  supplyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  memo: z.string().max(1000).optional().nullable(),
});

export async function createInvoice(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // yagi_admin gate
  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isYagiAdmin) return { ok: false, error: "forbidden" };

  // Load project + its workspace_id
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: "project_not_found" };

  // Load supplier (single-row, must exist; seeded in migration)
  const { data: supplier } = await supabase
    .from("supplier_profile")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!supplier) return { ok: false, error: "no_supplier_profile" };

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      project_id: project.id,
      workspace_id: project.workspace_id,
      supplier_id: supplier.id,
      supply_date: parsed.data.supplyDate,
      due_date: parsed.data.dueDate ?? null,
      memo: parsed.data.memo ?? null,
      status: "draft",
      is_mock: false, // becomes true at issue time if POPBILL_MODE=mock
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[invoices] createInvoice insert", error.message);
    return { ok: false, error: "insert_failed" };
  }

  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/invoices`);
  }
  return { ok: true, id: data.id };
}

 succeeded in 704ms:
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewInvoicePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invoices" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // yagi_admin only
  const { data: yagiAdminRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  if (!yagiAdminRows || yagiAdminRows.length === 0) notFound();

  // Projects accessible via RLS + their workspace info
  const { data: projectsData } = await supabase
    .from("projects")
    .select(
      "id, title, workspace_id, workspace:workspaces(id, name, business_registration_number)"
    )
    .order("created_at", { ascending: false });

  const projects = (projectsData ?? []).map((p) => {
    const ws = p.workspace as
      | { id: string; name: string; business_registration_number: string | null }
      | { id: string; name: string; business_registration_number: string | null }[]
      | null
      | undefined;
    const workspace = Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null);
    return {
      id: p.id,
      title: p.title,
      workspace_id: p.workspace_id,
      workspace,
    };
  });

  return (
    <div className="min-h-dvh bg-background">
      <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          <em>{t("new_title")}</em>
        </h1>
      </div>
      <NewInvoiceForm projects={projects} />
    </div>
  );
}

 succeeded in 728ms:
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildTaxinvoice } from "@/lib/popbill/build-taxinvoice";
import { issueTaxInvoice, getPopbillMode } from "@/lib/popbill/client";
import { sendInvoiceIssuedEmail } from "@/lib/invoices/issue-email";
import type { Json } from "@/lib/supabase/database.types";

const uuidSchema = z.string().uuid();

const voidSchema = z.object({
  invoiceId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

function revalidateInvoicePaths(invoiceId: string) {
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/invoices`);
    revalidatePath(`/${locale}/app/invoices/${invoiceId}`);
  }
}

export async function issueInvoice(
  invoiceId: string
): Promise<
  | { ok: true }
  | { ok: false; error: string; missing_fields?: string[] }
> {
  const parsed = uuidSchema.safeParse(invoiceId);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isYagiAdmin) return { ok: false, error: "forbidden" };

  // Load invoice
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return { ok: false, error: "invoice_not_found" };
  if (invoice.status !== "draft") return { ok: false, error: "not_draft" };

  // Load supplier (single-row)
  const { data: supplier } = await supabase
    .from("supplier_profile")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (!supplier) return { ok: false, error: "no_supplier_profile" };

  // Load buyer (workspace)
  const { data: buyer, error: buyerErr } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", invoice.workspace_id)
    .single();
  if (buyerErr || !buyer) return { ok: false, error: "buyer_not_found" };

  // Load line items
  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("display_order");

  if (!lineItems || lineItems.length === 0) {
    return { ok: false, error: "no_line_items", missing_fields: [] };
  }

  // Build the popbill payload
  const buildResult = buildTaxinvoice({
    supplier,
    buyer,
    invoice,
    lineItems,
  });
  if (!buildResult.ok) {
    return {
      ok: false,
      error: buildResult.error_code,
      missing_fields: buildResult.missing_fields,
    };
  }

  // Issue via popbill (mock or real)
  const popbillResult = await issueTaxInvoice({
    invoice_id: invoice.id,
    taxinvoice: buildResult.taxinvoice,
  });
  if (!popbillResult.ok) {
    console.error("[invoices] issueInvoice popbill failed", popbillResult);
    return { ok: false, error: popbillResult.error_code };
  }

  // Generate invoice_number if not already set.
  // Format: INV-YYYYMMDD-XXXX (deterministic; avoids needing a sequence).
  const issueDate = new Date().toISOString().slice(0, 10);
  const invoiceNumber =
    invoice.invoice_number ??
    `INV-${issueDate.replace(/-/g, "")}-${invoice.id.slice(0, 4).toUpperCase()}`;

  // Race-guarded update: only flip draft ??issued.
  const { data: updated, error: updateErr } = await supabase
    .from("invoices")
    .update({
      status: "issued",
      issue_date: issueDate,
      filed_at: new Date().toISOString(),
      popbill_mgt_key: popbillResult.popbill_mgt_key,
      nts_approval_number: popbillResult.nts_approval_number,
      popbill_response: popbillResult.raw_response as Json,
      is_mock: getPopbillMode() === "mock",
      invoice_number: invoiceNumber,
    })
    .eq("id", invoiceId)
    .eq("status", "draft")
    .select("id");

  if (updateErr) {
    console.error("[invoices] issueInvoice db update failed", updateErr);
    return { ok: false, error: "db_update_failed" };
  }

  if (!updated || updated.length === 0) {
    console.error(
      "[invoices] issueInvoice race: popbill issued but DB status drifted",
      { invoiceId, popbill_mgt_key: popbillResult.popbill_mgt_key }
    );
    return { ok: false, error: "race_already_issued" };
  }

  // Fire-and-forget the buyer notification email. Failures are logged but
  // must not affect the action's return value or block revalidation.
  sendInvoiceIssuedEmail(invoiceId).catch((err) => {
    console.error("[invoices] issue email dispatch failed", err);
  });

  revalidateInvoicePaths(invoiceId);
  return { ok: true };
}

export async function markPaid(
  invoiceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = uuidSchema.safeParse(invoiceId);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isYagiAdmin) return { ok: false, error: "forbidden" };

  const { data: updated, error: updateErr } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("status", "issued")
    .select("id");

  if (updateErr) {
    console.error("[invoices] markPaid db update failed", updateErr);
    return { ok: false, error: "db_update_failed" };
  }

  if (!updated || updated.length === 0) {
    return { ok: false, error: "not_issued" };
  }

  revalidateInvoicePaths(invoiceId);
  return { ok: true };
}

export async function voidInvoice(
  invoiceId: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = voidSchema.safeParse({ invoiceId, reason });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isYagiAdmin) return { ok: false, error: "forbidden" };

  // Popbill-side void is deferred ??only the DB status changes for now.
  const { data: updated, error: updateErr } = await supabase
    .from("invoices")
    .update({
      status: "void",
      void_at: new Date().toISOString(),
      void_reason: parsed.data.reason ?? null,
    })
    .eq("id", invoiceId)
    .in("status", ["issued", "paid"])
    .select("id");

  if (updateErr) {
    console.error("[invoices] voidInvoice db update failed", updateErr);
    return { ok: false, error: "db_update_failed" };
  }

  if (!updated || updated.length === 0) {
    return { ok: false, error: "not_voidable" };
  }

  revalidateInvoicePaths(invoiceId);
  return { ok: true };
}

 succeeded in 732ms:
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/routing";
import { ChevronLeft, Printer } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPopbillMode } from "@/lib/popbill/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  InvoiceEditor,
  type BuyerInfo,
  type SupplierInfo,
} from "@/components/invoices/invoice-editor";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getStatusBadgeVariant(
  status: string
): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "issued":
      return "default";
    case "paid":
      return "outline";
    case "void":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { locale, id } = await params;

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "invoices" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const uid = user.id;

  // yagi_admin detection (matches list page pattern)
  const { data: yagiAdminRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  const isYagiAdmin = !!(yagiAdminRows && yagiAdminRows.length > 0);

  // Load invoice with nested project + workspace.
  const { data: invoiceRow } = await supabase
    .from("invoices")
    .select(
      `
      *,
      project:projects!inner(
        id,
        title,
        workspace_id,
        workspace:workspaces!inner(
          id,
          name,
          business_registration_number,
          representative_name,
          business_address,
          tax_invoice_email
        )
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!invoiceRow) {
    notFound();
  }

  // Unwrap project/workspace arrays (postgrest may return array or object).
  const projectRaw = invoiceRow.project as
    | {
        id: string;
        title: string;
        workspace_id: string;
        workspace:
          | {
              id: string;
              name: string;
              business_registration_number: string | null;
              representative_name: string | null;
              business_address: string | null;
              tax_invoice_email: string | null;
            }
          | {
              id: string;
              name: string;
              business_registration_number: string | null;
              representative_name: string | null;
              business_address: string | null;
              tax_invoice_email: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        title: string;
        workspace_id: string;
        workspace:
          | {
              id: string;
              name: string;
              business_registration_number: string | null;
              representative_name: string | null;
              business_address: string | null;
              tax_invoice_email: string | null;
            }
          | {
              id: string;
              name: string;
              business_registration_number: string | null;
              representative_name: string | null;
              business_address: string | null;
              tax_invoice_email: string | null;
            }[]
          | null;
      }[]
    | null;
  const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;
  if (!project) {
    notFound();
  }
  const workspaceRaw = project.workspace;
  const workspace = Array.isArray(workspaceRaw) ? workspaceRaw[0] : workspaceRaw;
  if (!workspace) {
    notFound();
  }

  // Load supplier (single-row, seeded in migration).
  const { data: supplierRow } = await supabase
    .from("supplier_profile")
    .select("*")
    .limit(1)
    .maybeSingle();

  // Load line items ordered by display_order.
  const { data: lineItemsData } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", id)
    .order("display_order");

  const lineItems = (lineItemsData ?? []).map((li) => ({
    id: li.id,
    item_name: li.item_name,
    specification: li.specification,
    quantity: Number(li.quantity),
    unit_price_krw: Number(li.unit_price_krw),
    supply_krw: Number(li.supply_krw),
    vat_krw: Number(li.vat_krw),
    display_order: li.display_order,
    source_type: li.source_type,
    source_id: li.source_id,
  }));

  const popbillMode = getPopbillMode();

  const supplier: SupplierInfo | null = supplierRow
    ? {
        corporate_name: supplierRow.corporate_name,
        business_registration_number: supplierRow.business_registration_number,
        representative_name: supplierRow.representative_name,
        address: supplierRow.address,
        contact_email: supplierRow.contact_email,
        business_type: supplierRow.business_type,
        business_item: supplierRow.business_item,
      }
    : null;

  const buyer: BuyerInfo = {
    id: workspace.id,
    name: workspace.name,
    business_registration_number: workspace.business_registration_number,
    representative_name: workspace.representative_name,
    business_address: workspace.business_address,
    tax_invoice_email: workspace.tax_invoice_email,
  };

  const invoiceForEditor = {
    id: invoiceRow.id,
    project_id: invoiceRow.project_id,
    workspace_id: invoiceRow.workspace_id,
    status: invoiceRow.status,
    invoice_number: invoiceRow.invoice_number,
    supply_date: invoiceRow.supply_date,
    due_date: invoiceRow.due_date,
    issue_date: invoiceRow.issue_date,
    paid_at: invoiceRow.paid_at,
    void_at: invoiceRow.void_at,
    void_reason: invoiceRow.void_reason,
    subtotal_krw: invoiceRow.subtotal_krw,
    vat_krw: invoiceRow.vat_krw,
    total_krw: invoiceRow.total_krw,
    is_mock: invoiceRow.is_mock,
    filed_at: invoiceRow.filed_at,
    nts_approval_number: invoiceRow.nts_approval_number,
    memo: invoiceRow.memo,
  };

  const status = invoiceRow.status;
  const showPrint = status === "issued" || status === "paid" || status === "void";

  return (
    <div className="px-10 py-8 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {t("back_to_list")}
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="font-display text-3xl tracking-tight">
              <em>
                {invoiceRow.invoice_number ?? t("status_draft")}
              </em>
            </h1>
            <p className="text-sm text-muted-foreground keep-all">
              {project.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={getStatusBadgeVariant(status)}
              className={cn("rounded-full text-[11px] px-2.5 py-0.5")}
            >
              {t(
                `status_${status}` as
                  | "status_draft"
                  | "status_issued"
                  | "status_paid"
                  | "status_void"
              )}
            </Badge>
            {invoiceRow.is_mock && (
              <Badge
                variant="outline"
                className="rounded-full text-[10px] px-2 py-0.5 border-red-300 text-red-800 bg-red-50"
              >
                {t("mock_badge")}
              </Badge>
            )}
            {showPrint && (
              <a
                href={`/${locale}/app/invoices/${id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full uppercase tracking-[0.12em] px-4 py-1.5 border border-input bg-background text-foreground hover:bg-accent text-xs font-medium transition-colors"
              >
                <Printer className="w-3 h-3" />
                {t("print_pdf")}
              </a>
            )}
          </div>
        </div>
      </div>

      <InvoiceEditor
        invoice={invoiceForEditor}
        lineItems={lineItems}
        supplier={supplier}
        buyer={buyer}
        projectTitle={project.title}
        isYagiAdmin={isYagiAdmin}
        locale={locale}
        popbillMode={popbillMode}
      />
    </div>
  );
}

 succeeded in 764ms:
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  suggestLineItems,
  type SuggestedLineItem,
} from "@/lib/invoices/suggest-line-items";

// ??? Shared helpers ??????????????????????????????????????????????????????????

const uuidSchema = z.string().uuid();

function revalidateInvoicePaths(invoiceId: string) {
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/invoices`);
    revalidatePath(`/${locale}/app/invoices/${invoiceId}`);
  }
}

async function loadInvoiceForEdit(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  invoiceId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return { ok: false, error: "invoice_not_found" };
  if (invoice.status !== "draft") return { ok: false, error: "not_draft" };
  return { ok: true, id: invoice.id };
}

async function authAndAdminGate(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServer>> }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isYagiAdmin) return { ok: false, error: "forbidden" };

  return { ok: true, supabase };
}

function computeAmounts(quantity: number, unitPriceKrw: number): {
  supply_krw: number;
  vat_krw: number;
} {
  const supply = Math.round(quantity * unitPriceKrw);
  const vat = Math.round(supply * 0.1);
  return { supply_krw: supply, vat_krw: vat };
}

// ??? addLineItem ?????????????????????????????????????????????????????????????

const addLineItemSchema = z.object({
  item_name: z.string().min(1).max(300),
  specification: z.string().max(300).optional().nullable(),
  quantity: z.number().nonnegative(),
  unit_price_krw: z.number().int().nonnegative(),
  source_type: z.enum(["meeting", "storyboard"]).optional().nullable(),
  source_id: z.string().uuid().optional().nullable(),
  display_order: z.number().int().nonnegative().optional(),
});

export async function addLineItem(
  invoiceId: string,
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const idParsed = uuidSchema.safeParse(invoiceId);
  if (!idParsed.success) return { ok: false, error: "invalid_input" };

  const parsed = addLineItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const authResult = await authAndAdminGate();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  const { supabase } = authResult;

  const invResult = await loadInvoiceForEdit(supabase, invoiceId);
  if (!invResult.ok) return { ok: false, error: invResult.error };

  const { supply_krw, vat_krw } = computeAmounts(
    parsed.data.quantity,
    parsed.data.unit_price_krw
  );

  // Default display_order to (max + 1) if not provided.
  let displayOrder = parsed.data.display_order;
  if (displayOrder === undefined) {
    const { data: existing } = await supabase
      .from("invoice_line_items")
      .select("display_order")
      .eq("invoice_id", invoiceId)
      .order("display_order", { ascending: false })
      .limit(1);
    displayOrder =
      existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0;
  }

  const { data, error } = await supabase
    .from("invoice_line_items")
    .insert({
      invoice_id: invoiceId,
      item_name: parsed.data.item_name,
      specification: parsed.data.specification ?? null,
      quantity: parsed.data.quantity,
      unit_price_krw: parsed.data.unit_price_krw,
      supply_krw,
      vat_krw,
      source_type: parsed.data.source_type ?? null,
      source_id: parsed.data.source_id ?? null,
      display_order: displayOrder,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[invoices] addLineItem insert", error.message);
    return { ok: false, error: "insert_failed" };
  }

  revalidateInvoicePaths(invoiceId);
  return { ok: true, id: data.id };
}

// ??? updateLineItem ??????????????????????????????????????????????????????????

const updateLineItemSchema = z.object({
  item_name: z.string().min(1).max(300).optional(),
  specification: z.string().max(300).optional().nullable(),
  quantity: z.number().nonnegative().optional(),
  unit_price_krw: z.number().int().nonnegative().optional(),
  display_order: z.number().int().nonnegative().optional(),
});

export async function updateLineItem(
  lineItemId: string,
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const idParsed = uuidSchema.safeParse(lineItemId);
  if (!idParsed.success) return { ok: false, error: "invalid_input" };

  const parsed = updateLineItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const authResult = await authAndAdminGate();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  const { supabase } = authResult;

  // Load the line item + joined invoice to verify draft status.
  const { data: existing } = await supabase
    .from("invoice_line_items")
    .select("id, invoice_id, quantity, unit_price_krw, invoices!inner(status)")
    .eq("id", lineItemId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "line_item_not_found" };

  const inv = existing.invoices as
    | { status: string }
    | { status: string }[]
    | null;
  const status = Array.isArray(inv) ? inv[0]?.status : inv?.status;
  if (status !== "draft") return { ok: false, error: "not_draft" };

  // Recompute supply + vat if either quantity or unit price changed.
  const nextQty =
    parsed.data.quantity !== undefined ? parsed.data.quantity : existing.quantity;
  const nextUnit =
    parsed.data.unit_price_krw !== undefined
      ? parsed.data.unit_price_krw
      : existing.unit_price_krw;
  const { supply_krw, vat_krw } = computeAmounts(nextQty, nextUnit);

  const updatePayload: {
    item_name?: string;
    specification?: string | null;
    quantity?: number;
    unit_price_krw?: number;
    display_order?: number;
    supply_krw: number;
    vat_krw: number;
  } = {
    supply_krw,
    vat_krw,
  };
  if (parsed.data.item_name !== undefined)
    updatePayload.item_name = parsed.data.item_name;
  if (parsed.data.specification !== undefined)
    updatePayload.specification = parsed.data.specification;
  if (parsed.data.quantity !== undefined)
    updatePayload.quantity = parsed.data.quantity;
  if (parsed.data.unit_price_krw !== undefined)
    updatePayload.unit_price_krw = parsed.data.unit_price_krw;
  if (parsed.data.display_order !== undefined)
    updatePayload.display_order = parsed.data.display_order;

  const { error: updateErr } = await supabase
    .from("invoice_line_items")
    .update(updatePayload)
    .eq("id", lineItemId);

  if (updateErr) {
    console.error("[invoices] updateLineItem failed", updateErr.message);
    return { ok: false, error: "update_failed" };
  }

  revalidateInvoicePaths(existing.invoice_id);
  return { ok: true };
}

// ??? deleteLineItem ??????????????????????????????????????????????????????????

export async function deleteLineItem(
  lineItemId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const idParsed = uuidSchema.safeParse(lineItemId);
  if (!idParsed.success) return { ok: false, error: "invalid_input" };

  const authResult = await authAndAdminGate();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  const { supabase } = authResult;

  const { data: existing } = await supabase
    .from("invoice_line_items")
    .select("id, invoice_id, invoices!inner(status)")
    .eq("id", lineItemId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "line_item_not_found" };

  const inv = existing.invoices as
    | { status: string }
    | { status: string }[]
    | null;
  const status = Array.isArray(inv) ? inv[0]?.status : inv?.status;
  if (status !== "draft") return { ok: false, error: "not_draft" };

  const { error: deleteErr } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("id", lineItemId);

  if (deleteErr) {
    console.error("[invoices] deleteLineItem failed", deleteErr.message);
    return { ok: false, error: "delete_failed" };
  }

  revalidateInvoicePaths(existing.invoice_id);
  return { ok: true };
}

// ??? reorderLineItems ????????????????????????????????????????????????????????

const reorderSchema = z.object({
  invoiceId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});

export async function reorderLineItems(
  invoiceId: string,
  ids: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = reorderSchema.safeParse({ invoiceId, ids });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const authResult = await authAndAdminGate();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  const { supabase } = authResult;

  const invResult = await loadInvoiceForEdit(supabase, invoiceId);
  if (!invResult.ok) return { ok: false, error: invResult.error };

  // Sequentially update display_order. Pedestrian but reliable.
  for (let i = 0; i < parsed.data.ids.length; i += 1) {
    const { error } = await supabase
      .from("invoice_line_items")
      .update({ display_order: i })
      .eq("id", parsed.data.ids[i])
      .eq("invoice_id", invoiceId);
    if (error) {
      console.error("[invoices] reorderLineItems failed", error.message);
      return { ok: false, error: "update_failed" };
    }
  }

  revalidateInvoicePaths(invoiceId);
  return { ok: true };
}

// ??? bulkAddFromSuggestions ??????????????????????????????????????????????????

const suggestedItemSchema = z.object({
  item_name: z.string().min(1).max(300),
  specification: z.string().max(300).nullable(),
  quantity: z.number().nonnegative(),
  unit_price_krw: z.number().int().nonnegative(),
  source_type: z.enum(["meeting", "storyboard"]),
  source_id: z.string().uuid(),
  already_billed: z.boolean(),
});

const bulkAddSchema = z.object({
  invoiceId: z.string().uuid(),
  items: z.array(suggestedItemSchema).min(1),
});

export async function bulkAddFromSuggestions(
  invoiceId: string,
  items: unknown
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const parsed = bulkAddSchema.safeParse({ invoiceId, items });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const authResult = await authAndAdminGate();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  const { supabase } = authResult;

  const invResult = await loadInvoiceForEdit(supabase, invoiceId);
  if (!invResult.ok) return { ok: false, error: invResult.error };

  // Compute the starting display_order.
  const { data: existing } = await supabase
    .from("invoice_line_items")
    .select("display_order")
    .eq("invoice_id", invoiceId)
    .order("display_order", { ascending: false })
    .limit(1);
  const startOrder =
    existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0;

  const rows = parsed.data.items.map((it, idx) => {
    const { supply_krw, vat_krw } = computeAmounts(it.quantity, it.unit_price_krw);
    return {
      invoice_id: invoiceId,
      item_name: it.item_name,
      specification: it.specification,
      quantity: it.quantity,
      unit_price_krw: it.unit_price_krw,
      supply_krw,
      vat_krw,
      source_type: it.source_type,
      source_id: it.source_id,
      display_order: startOrder + idx,
    };
  });

  const { error } = await supabase.from("invoice_line_items").insert(rows);
  if (error) {
    console.error("[invoices] bulkAddFromSuggestions failed", error.message);
    return { ok: false, error: "insert_failed" };
  }

  revalidateInvoicePaths(invoiceId);
  return { ok: true, inserted: rows.length };
}

// ??? fetchSuggestions (server action wrapper around suggestLineItems) ????????

const rangeSchema = z.object({
  projectId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function fetchSuggestions(input: {
  projectId: string;
  from: string;
  to: string;
}): Promise<
  { ok: true; items: SuggestedLineItem[] } | { ok: false; error: string }
> {
  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const authResult = await authAndAdminGate();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  const items = await suggestLineItems(parsed.data.projectId, {
    from: parsed.data.from,
    to: parsed.data.to,
  });
  return { ok: true, items };
}

codex
The action layer is mapped now. Next I’m checking the remaining UI surfaces and the SQL policies/triggers, because the highest-risk gaps at this point are likely in print-page exposure, mock visibility rules, and RLS assumptions under service-role reads.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/invoices/[id]/print/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/admin/invoices/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/components/invoices/new-invoice-form.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/components/invoices/invoice-editor.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/components/invoices/print-button.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'supabase/migrations/20260421094855_phase1_schema.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 388ms:
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PrintButton } from "@/components/invoices/print-button";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const uuidSchema = z.string().uuid();

const currencyFmt = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
});

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmtDateValue(value: string | null | undefined): string {
  if (!value) return "??;
  // If value is already YYYY-MM-DD (date column), return as-is to avoid TZ shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Otherwise treat as timestamptz and project to KST.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "??;
  return dateFmt.format(d);
}

function orDash(value: string | null | undefined): string {
  if (value === null || value === undefined) return "??;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? "?? : trimmed;
}

export default async function InvoicePrintPage({ params }: Props) {
  const { locale, id } = await params;

  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "invoices" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const { data: invoice, error: invoiceErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (invoiceErr || !invoice) {
    notFound();
  }

  // Parallel loads for the related rows (RLS-scoped).
  const [projectRes, buyerRes, supplierRes, lineItemsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title")
      .eq("id", invoice.project_id)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select(
        "id, name, business_registration_number, representative_name, business_address, business_type, business_item, tax_invoice_email"
      )
      .eq("id", invoice.workspace_id)
      .maybeSingle(),
    supabase
      .from("supplier_profile")
      .select("*")
      .eq("id", invoice.supplier_id)
      .maybeSingle(),
    supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("display_order", { ascending: true }),
  ]);

  const project = projectRes.data;
  const buyer = buyerRes.data;
  const supplier = supplierRes.data;
  const lineItems = lineItemsRes.data ?? [];

  const isDraft = invoice.status === "draft";
  const isMock = invoice.is_mock === true;

  const titleSuffix = isDraft ? ` ${t("print_draft_mark")}` : "";

  return (
    <>
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          html, body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .print-root { box-shadow: none !important; }
        }
        .print-page {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 24px 16px;
          font-family: Pretendard, -apple-system, BlinkMacSystemFont,
            "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #000000;
        }
        @media print {
          .print-page { background: #ffffff; padding: 0; }
        }
        .print-root {
          position: relative;
          background: #ffffff;
          color: #000000;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          word-break: keep-all;
        }
        .print-topbar {
          max-width: 210mm;
          margin: 0 auto 12px auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .print-topbar a {
          font-size: 14px;
          color: #374151;
          text-decoration: none;
        }
        .print-topbar a:hover { text-decoration: underline; }
        .print-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin: 0;
        }
        .print-subtitle {
          font-size: 12px;
          color: #4b5563;
          margin-top: 4px;
        }
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000000;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .print-meta {
          font-size: 12px;
          text-align: right;
        }
        .print-meta .meta-row { margin-bottom: 4px; }
        .print-meta .meta-label {
          color: #4b5563;
          margin-right: 8px;
        }
        .print-meta .meta-value {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid #000000;
          margin-bottom: 12px;
        }
        .party-block {
          padding: 10px 12px;
          font-size: 12px;
        }
        .party-block + .party-block {
          border-left: 1px solid #000000;
        }
        .party-title {
          font-size: 12px;
          font-weight: 700;
          text-align: center;
          padding: 4px 0;
          border-bottom: 1px solid #000000;
          background: #f3f4f6;
          margin: -10px -12px 8px -12px;
        }
        .party-row {
          display: grid;
          grid-template-columns: 80px 1fr;
          padding: 3px 0;
          line-height: 1.4;
        }
        .party-row .label {
          color: #4b5563;
          font-weight: 500;
        }
        .party-row .value {
          font-weight: 500;
          word-break: break-all;
        }
        .date-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid #000000;
          border-top: none;
          margin-bottom: 16px;
          font-size: 12px;
        }
        .date-cell {
          padding: 8px 12px;
        }
        .date-cell + .date-cell {
          border-left: 1px solid #000000;
        }
        .date-cell .label {
          color: #4b5563;
          margin-right: 8px;
        }
        .date-cell .value {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #000000;
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
        }
        .items-table thead th {
          background: #f3f4f6;
          font-weight: 700;
          text-align: center;
        }
        .items-table .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .items-table .no-col { text-align: center; width: 36px; }
        .items-table .spec-col { width: 80px; }
        .items-table .qty-col { width: 56px; text-align: right; }
        .items-table .price-col { width: 110px; text-align: right; }
        .items-table .supply-col { width: 120px; text-align: right; }
        .items-table .vat-col { width: 110px; text-align: right; }
        .totals-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .totals-table td {
          border: 1px solid #000000;
          padding: 8px 12px;
        }
        .totals-table .label {
          background: #f3f4f6;
          font-weight: 600;
          width: 30%;
        }
        .totals-table .value {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .totals-table .grand-row .label,
        .totals-table .grand-row .value {
          font-weight: 800;
          font-size: 15px;
          background: #f9fafb;
        }
        .note-block {
          border: 1px solid #000000;
          padding: 10px 12px;
          font-size: 12px;
          min-height: 48px;
        }
        .note-block .label {
          font-weight: 700;
          margin-bottom: 4px;
        }
        .note-block .body { white-space: pre-wrap; }
        .mock-banner {
          background: #fee2e2;
          border: 1px solid #dc2626;
          color: #991b1b;
          padding: 10px 14px;
          margin-bottom: 16px;
          font-size: 13px;
          border-radius: 4px;
        }
        .mock-banner .title { font-weight: 700; margin-bottom: 2px; }
        .mock-banner .body { font-size: 12px; }
        .mock-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 110px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: rgba(220, 38, 38, 0.15);
          pointer-events: none;
          z-index: 1;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .content-layer { position: relative; z-index: 2; }
      `}</style>

      <div className="print-page">
        <div className="print-topbar no-print">
          <Link href={`/app/invoices/${id}` as `/app/invoices/${string}`}>
            ??{t("print_back")}
          </Link>
          <PrintButton label={t("print_button")} />
        </div>

        <div className="print-root">
          {isMock && (
            <div className="mock-watermark" aria-hidden="true">
              {t("mock_pdf_watermark")}
            </div>
          )}

          <div className="content-layer">
            {isMock && (
              <div className="mock-banner">
                <div className="title">{t("mock_banner_title")}</div>
                <div className="body">{t("mock_banner_body")}</div>
              </div>
            )}

            <div className="print-header">
              <div>
                <h1 className="print-title">
                  {t("print_title_tax")}
                  {titleSuffix}
                </h1>
                <div className="print-subtitle">{t("print_for_supplier")}</div>
              </div>
              <div className="print-meta">
                <div className="meta-row">
                  <span className="meta-label">
                    {t("invoice_number_label")}
                  </span>
                  <span className="meta-value">
                    {orDash(invoice.invoice_number)}
                  </span>
                </div>
                {invoice.nts_approval_number && (
                  <div className="meta-row">
                    <span className="meta-label">{t("print_nts_approval")}</span>
                    <span className="meta-value">
                      {invoice.nts_approval_number}
                    </span>
                  </div>
                )}
                {project && (
                  <div className="meta-row">
                    <span className="meta-label">{t("project_label")}</span>
                    <span className="meta-value">{orDash(project.title)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="party-grid">
              <div className="party-block">
                <div className="party-title">{t("print_supplier_block")}</div>
                <div className="party-row">
                  <span className="label">{t("print_reg_no")}</span>
                  <span className="value">
                    {orDash(supplier?.business_registration_number)}
                  </span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_corp_name")}</span>
                  <span className="value">{orDash(supplier?.corporate_name)}</span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_ceo")}</span>
                  <span className="value">
                    {orDash(supplier?.representative_name)}
                  </span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_address")}</span>
                  <span className="value">{orDash(supplier?.address)}</span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_biz_type")}</span>
                  <span className="value">{orDash(supplier?.business_type)}</span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_biz_item")}</span>
                  <span className="value">{orDash(supplier?.business_item)}</span>
                </div>
              </div>
              <div className="party-block">
                <div className="party-title">{t("print_buyer_block")}</div>
                <div className="party-row">
                  <span className="label">{t("print_reg_no")}</span>
                  <span className="value">
                    {orDash(buyer?.business_registration_number)}
                  </span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_corp_name")}</span>
                  <span className="value">{orDash(buyer?.name)}</span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_ceo")}</span>
                  <span className="value">
                    {orDash(buyer?.representative_name)}
                  </span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_address")}</span>
                  <span className="value">{orDash(buyer?.business_address)}</span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_biz_type")}</span>
                  <span className="value">{orDash(buyer?.business_type)}</span>
                </div>
                <div className="party-row">
                  <span className="label">{t("print_biz_item")}</span>
                  <span className="value">{orDash(buyer?.business_item)}</span>
                </div>
              </div>
            </div>

            <div className="date-row">
              <div className="date-cell">
                <span className="label">{t("print_supply_date")}</span>
                <span className="value">{fmtDateValue(invoice.supply_date)}</span>
              </div>
              <div className="date-cell">
                <span className="label">{t("print_issue_date")}</span>
                <span className="value">{fmtDateValue(invoice.issue_date)}</span>
              </div>
            </div>

            <table className="items-table">
              <thead>
                <tr>
                  <th className="no-col">{t("print_col_no")}</th>
                  <th>{t("print_col_item")}</th>
                  <th className="spec-col">{t("print_col_spec")}</th>
                  <th className="qty-col">{t("print_col_qty")}</th>
                  <th className="price-col">{t("print_col_unit_price")}</th>
                  <th className="supply-col">{t("print_col_supply")}</th>
                  <th className="vat-col">{t("print_col_vat")}</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#6b7280" }}>
                      ??                    </td>
                  </tr>
                )}
                {lineItems.map((li, idx) => (
                  <tr key={li.id}>
                    <td className="no-col">{idx + 1}</td>
                    <td>{orDash(li.item_name)}</td>
                    <td className="spec-col">{orDash(li.specification)}</td>
                    <td className="qty-col num">{li.quantity}</td>
                    <td className="price-col num">
                      {currencyFmt.format(li.unit_price_krw)}
                    </td>
                    <td className="supply-col num">
                      {currencyFmt.format(li.supply_krw)}
                    </td>
                    <td className="vat-col num">
                      {currencyFmt.format(li.vat_krw)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="label">{t("print_total_supply")}</td>
                  <td className="value">
                    {currencyFmt.format(invoice.subtotal_krw)}
                  </td>
                </tr>
                <tr>
                  <td className="label">{t("print_total_vat")}</td>
                  <td className="value">{currencyFmt.format(invoice.vat_krw)}</td>
                </tr>
                <tr className="grand-row">
                  <td className="label">{t("print_total_grand")}</td>
                  <td className="value">
                    {currencyFmt.format(invoice.total_krw)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="note-block">
              <div className="label">{t("print_note")}</div>
              <div className="body">{orDash(invoice.memo)}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

 succeeded in 433ms:
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

type InvoiceListRow = {
  id: string;
  invoice_number: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_krw: number;
  is_mock: boolean;
  project: { title: string } | null;
  workspace: { name: string } | null;
};

type StatusCountRow = {
  id: string;
  status: string;
};

type AggregateRow = {
  total_krw: number;
};

type InvoiceStatus = "draft" | "issued" | "paid" | "void";

function todayKstDateStr(): string {
  const now = new Date();
  const kst = new Date(
    now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60_000
  );
  return kst.toISOString().slice(0, 10);
}

function firstOfMonthKstStr(): string {
  const today = todayKstDateStr();
  return `${today.slice(0, 7)}-01`;
}

function firstOfYearKstStr(): string {
  const today = todayKstDateStr();
  return `${today.slice(0, 4)}-01-01`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
      return "border-transparent bg-muted text-muted-foreground";
    case "issued":
      return "border-transparent bg-blue-100 text-blue-700";
    case "paid":
      return "border-transparent bg-green-100 text-green-700";
    case "void":
      return "border-transparent bg-red-100 text-red-700";
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

function normalizeJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toInvoiceRow(row: {
  id: string;
  invoice_number: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_krw: number;
  is_mock: boolean;
  project: { title: string } | { title: string }[] | null;
  workspace: { name: string } | { name: string }[] | null;
}): InvoiceListRow {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    issue_date: row.issue_date,
    due_date: row.due_date,
    total_krw: row.total_krw,
    is_mock: row.is_mock,
    project: normalizeJoin(row.project),
    workspace: normalizeJoin(row.workspace),
  };
}

export default async function AdminInvoicesPage({ params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");

  if (!roles || roles.length === 0) notFound();

  const t = await getTranslations({ locale, namespace: "admin.invoices" });
  const tInvoices = await getTranslations({ locale, namespace: "invoices" });

  const today = todayKstDateStr();
  const firstOfMonth = firstOfMonthKstStr();
  const firstOfYear = firstOfYearKstStr();

  // Parallel queries
  const [
    mockAggRes,
    mtdAggRes,
    ytdAggRes,
    overdueAggRes,
    mockListRes,
    overdueListRes,
    statusBreakdownRes,
  ] = await Promise.all([
    // 1a. mock_count + sum
    supabase
      .from("invoices")
      .select("total_krw", { count: "exact" })
      .eq("is_mock", true)
      .in("status", ["issued", "paid"]),

    // 1b. MTD issued total
    supabase
      .from("invoices")
      .select("total_krw")
      .in("status", ["issued", "paid"])
      .gte("issue_date", firstOfMonth),

    // 1c. YTD issued total
    supabase
      .from("invoices")
      .select("total_krw")
      .in("status", ["issued", "paid"])
      .gte("issue_date", firstOfYear),

    // 1d. Overdue count + sum
    supabase
      .from("invoices")
      .select("total_krw", { count: "exact" })
      .eq("status", "issued")
      .not("due_date", "is", null)
      .lt("due_date", today),

    // 2. Mock invoices list
    supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        total_krw,
        is_mock,
        project:projects(title),
        workspace:workspaces(name)
      `
      )
      .eq("is_mock", true)
      .in("status", ["issued", "paid"])
      .order("issue_date", { ascending: true, nullsFirst: false })
      .limit(50),

    // 3. Overdue list
    supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        total_krw,
        is_mock,
        project:projects(title),
        workspace:workspaces(name)
      `
      )
      .eq("status", "issued")
      .not("due_date", "is", null)
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(50),

    // 4. Status breakdown (YTD)
    supabase
      .from("invoices")
      .select("id, status")
      .gte("created_at", `${firstOfYear}T00:00:00+09:00`),
  ]);

  if (mockAggRes.error)
    console.error("[AdminInvoicesPage] mock agg:", mockAggRes.error);
  if (mtdAggRes.error)
    console.error("[AdminInvoicesPage] mtd agg:", mtdAggRes.error);
  if (ytdAggRes.error)
    console.error("[AdminInvoicesPage] ytd agg:", ytdAggRes.error);
  if (overdueAggRes.error)
    console.error("[AdminInvoicesPage] overdue agg:", overdueAggRes.error);
  if (mockListRes.error)
    console.error("[AdminInvoicesPage] mock list:", mockListRes.error);
  if (overdueListRes.error)
    console.error("[AdminInvoicesPage] overdue list:", overdueListRes.error);
  if (statusBreakdownRes.error)
    console.error(
      "[AdminInvoicesPage] status breakdown:",
      statusBreakdownRes.error
    );

  const mockAggRows = (mockAggRes.data ?? []) as AggregateRow[];
  const mockCount = mockAggRes.count ?? mockAggRows.length;
  const mockTotal = mockAggRows.reduce((acc, r) => acc + (r.total_krw ?? 0), 0);

  const mtdTotal = ((mtdAggRes.data ?? []) as AggregateRow[]).reduce(
    (acc, r) => acc + (r.total_krw ?? 0),
    0
  );
  const ytdTotal = ((ytdAggRes.data ?? []) as AggregateRow[]).reduce(
    (acc, r) => acc + (r.total_krw ?? 0),
    0
  );

  const overdueAggRows = (overdueAggRes.data ?? []) as AggregateRow[];
  const overdueCount = overdueAggRes.count ?? overdueAggRows.length;
  const overdueTotal = overdueAggRows.reduce(
    (acc, r) => acc + (r.total_krw ?? 0),
    0
  );

  const mockList: InvoiceListRow[] = (mockListRes.data ?? []).map(toInvoiceRow);
  const overdueList: InvoiceListRow[] = (overdueListRes.data ?? []).map(
    toInvoiceRow
  );

  const statusBreakdownRows = (statusBreakdownRes.data ??
    []) as StatusCountRow[];
  const statusCounts: Record<InvoiceStatus, number> = {
    draft: 0,
    issued: 0,
    paid: 0,
    void: 0,
  };
  for (const row of statusBreakdownRows) {
    if (
      row.status === "draft" ||
      row.status === "issued" ||
      row.status === "paid" ||
      row.status === "void"
    ) {
      statusCounts[row.status] += 1;
    }
  }

  // Formatters
  const currencyFmt = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  });
  const shortDateFmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });

  function formatDate(value: string | null): string {
    if (!value) return "??;
    // If value is already YYYY-MM-DD (date column), parse as KST midnight.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return shortDateFmt.format(new Date(Date.UTC(y, m - 1, d)));
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "??;
    return shortDateFmt.format(d);
  }

  const statusKeys: InvoiceStatus[] = ["draft", "issued", "paid", "void"];

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          <em>{t("title")}</em>
        </h1>
      </div>

      {/* KPI cards */}
      <section className="mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Mock */}
          <div
            className={cn(
              "border rounded-lg p-5",
              mockCount > 0
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-border"
            )}
          >
            <p
              className={cn(
                "text-[11px] font-medium uppercase tracking-wide mb-2",
                mockCount > 0 ? "text-red-700" : "text-muted-foreground"
              )}
            >
              {t("kpi_mock_label")}
            </p>
            <p className="font-display text-3xl tracking-tight tabular-nums">
              {mockCount}
            </p>
            <p
              className={cn(
                "text-[11px] mt-2 tabular-nums",
                mockCount > 0 ? "text-red-700" : "text-muted-foreground"
              )}
            >
              {currencyFmt.format(mockTotal)}
            </p>
            <p
              className={cn(
                "text-[10px] mt-1 keep-all",
                mockCount > 0 ? "text-red-700/80" : "text-muted-foreground"
              )}
            >
              {t("kpi_mock_sub")}
            </p>
          </div>

          {/* MTD */}
          <div className="border border-border rounded-lg p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              {t("kpi_mtd_label")}
            </p>
            <p className="font-display text-3xl tracking-tight tabular-nums">
              {currencyFmt.format(mtdTotal)}
            </p>
          </div>

          {/* YTD */}
          <div className="border border-border rounded-lg p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              {t("kpi_ytd_label")}
            </p>
            <p className="font-display text-3xl tracking-tight tabular-nums">
              {currencyFmt.format(ytdTotal)}
            </p>
          </div>

          {/* Overdue */}
          <div
            className={cn(
              "border rounded-lg p-5",
              overdueCount > 0
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-border"
            )}
          >
            <p
              className={cn(
                "text-[11px] font-medium uppercase tracking-wide mb-2",
                overdueCount > 0 ? "text-red-700" : "text-muted-foreground"
              )}
            >
              {t("kpi_overdue_label")}
            </p>
            <p className="font-display text-3xl tracking-tight tabular-nums">
              {overdueCount}
            </p>
            <p
              className={cn(
                "text-[11px] mt-2 tabular-nums",
                overdueCount > 0 ? "text-red-700" : "text-muted-foreground"
              )}
            >
              {currencyFmt.format(overdueTotal)}
            </p>
            <p
              className={cn(
                "text-[10px] mt-1 keep-all",
                overdueCount > 0 ? "text-red-700/80" : "text-muted-foreground"
              )}
            >
              {t("kpi_overdue_sub")}
            </p>
          </div>
        </div>
      </section>

      {/* Mock list */}
      {mockCount > 0 && (
        <section className="mb-12">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {t("mock_section_title")}
            <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted-foreground tabular-nums">
              {t("count_label", { count: mockCount })}
            </span>
          </h2>

          {mockList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {t("mock_section_empty")}
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_invoice_number")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      {t("col_project")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      {t("col_workspace")}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_total")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_status")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      {t("col_issue_date")}
                    </th>
                    <th className="px-4 py-3" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {mockList.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={
                            `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                          }
                          className="font-medium hover:underline keep-all tabular-nums"
                        >
                          {inv.invoice_number ?? "??}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[180px]">
                        {inv.project?.title ?? "??}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[160px]">
                        {inv.workspace?.name ?? "??}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {currencyFmt.format(inv.total_krw)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={cn(
                              "rounded-full text-[11px] px-2.5 py-0.5",
                              statusBadgeClass(inv.status)
                            )}
                          >
                            {tInvoices(
                              `status_${inv.status}` as
                                | "status_draft"
                                | "status_issued"
                                | "status_paid"
                                | "status_void"
                            )}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="rounded-full text-[10px] px-2 py-0.5 border-amber-300 text-amber-700 bg-amber-50"
                          >
                            {tInvoices("mock_badge")}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[12px] text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={
                            `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                          }
                          className="text-muted-foreground hover:text-foreground text-sm"
                          aria-label="Open"
                        >
                          ??                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Overdue list */}
      {overdueCount > 0 && (
        <section className="mb-12">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {t("overdue_section_title")}
            <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted-foreground tabular-nums">
              {t("count_label", { count: overdueCount })}
            </span>
          </h2>

          {overdueList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {t("overdue_section_empty")}
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_invoice_number")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      {t("col_project")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      {t("col_workspace")}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_total")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_due_date")}
                    </th>
                    <th className="px-4 py-3" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {overdueList.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={
                            `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                          }
                          className="font-medium hover:underline keep-all tabular-nums"
                        >
                          {inv.invoice_number ?? "??}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[180px]">
                        {inv.project?.title ?? "??}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[160px]">
                        {inv.workspace?.name ?? "??}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {currencyFmt.format(inv.total_krw)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[12px] text-red-700 whitespace-nowrap">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={
                            `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                          }
                          className="text-muted-foreground hover:text-foreground text-sm"
                          aria-label="Open"
                        >
                          ??                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Status breakdown */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("status_breakdown_title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {statusKeys.map((s) => (
            <Badge
              key={s}
              className={cn(
                "rounded-full text-[12px] px-3 py-1 tabular-nums",
                statusBadgeClass(s)
              )}
            >
              {tInvoices(
                `status_${s}` as
                  | "status_draft"
                  | "status_issued"
                  | "status_paid"
                  | "status_void"
              )}{" "}
              쨌 {statusCounts[s]}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}

 succeeded in 436ms:
"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type Props = {
  label: string;
};

export function PrintButton({ label }: Props) {
  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
    >
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}

 succeeded in 443ms:
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createInvoice } from "@/app/[locale]/app/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  projectId: z.string().uuid(),
  supplyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  memo: z.string().max(1000).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

type ProjectOption = {
  id: string;
  title: string;
  workspace_id: string;
  workspace: {
    id: string;
    name: string;
    business_registration_number: string | null;
  } | null;
};

interface NewInvoiceFormProps {
  projects: ProjectOption[];
}

function todayInSeoul(): string {
  // en-CA formats as YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function NewInvoiceForm({ projects }: NewInvoiceFormProps) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultProjectId = projects[0]?.id ?? "";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: defaultProjectId,
      supplyDate: todayInSeoul(),
      dueDate: "",
      memo: "",
    },
  });

  const selectedProjectId = watch("projectId");
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const result = await createInvoice({
        projectId: data.projectId,
        supplyDate: data.supplyDate,
        dueDate: data.dueDate && data.dueDate.length > 0 ? data.dueDate : null,
        memo: data.memo && data.memo.length > 0 ? data.memo : null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("new_title"));
      router.push(
        `/app/invoices/${result.id}` as `/app/invoices/${string}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="px-6 pb-16 max-w-2xl mx-auto space-y-6"
    >
      {/* Project */}
      <div className="space-y-1.5">
        <Label htmlFor="projectId" className="keep-all">
          {t("project_label")}
        </Label>
        <select
          id="projectId"
          {...register("projectId")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
              {p.workspace?.name ? ` 쨌 ${p.workspace.name}` : ""}
            </option>
          ))}
        </select>
        {errors.projectId && (
          <p className="text-xs text-destructive">{errors.projectId.message}</p>
        )}

        {/* Buyer preview */}
        {selectedProject?.workspace && (
          <div className="mt-2 text-xs text-muted-foreground keep-all">
            <span className="font-medium">{t("buyer_label")}:</span>{" "}
            {selectedProject.workspace.name}
            {selectedProject.workspace.business_registration_number ? (
              <span className="tabular-nums">
                {" 쨌 "}
                {selectedProject.workspace.business_registration_number}
              </span>
            ) : (
              <span className="ml-1 text-amber-700">
                쨌 {t("buyer_registration_missing")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Supply date */}
      <div className="space-y-1.5">
        <Label htmlFor="supplyDate" className="keep-all">
          {t("supply_date_label")}
        </Label>
        <Input
          id="supplyDate"
          type="date"
          {...register("supplyDate")}
          className={errors.supplyDate ? "border-destructive" : ""}
        />
        {errors.supplyDate && (
          <p className="text-xs text-destructive">
            {errors.supplyDate.message}
          </p>
        )}
      </div>

      {/* Due date (optional) */}
      <div className="space-y-1.5">
        <Label htmlFor="dueDate" className="keep-all">
          {t("due_date_label")}
        </Label>
        <Input
          id="dueDate"
          type="date"
          {...register("dueDate")}
          className={errors.dueDate ? "border-destructive" : ""}
        />
        {errors.dueDate && (
          <p className="text-xs text-destructive">{errors.dueDate.message}</p>
        )}
      </div>

      {/* Memo */}
      <div className="space-y-1.5">
        <Label htmlFor="memo" className="keep-all">
          {t("memo_label")}
        </Label>
        <Textarea
          id="memo"
          rows={3}
          placeholder={t("memo_ph")}
          {...register("memo")}
          className={errors.memo ? "border-destructive" : ""}
        />
        {errors.memo && (
          <p className="text-xs text-destructive">{errors.memo.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full uppercase tracking-[0.12em] px-6 py-2.5 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {t("create_invoice_submit")}
        </Button>
      </div>
    </form>
  );
}

 succeeded in 456ms:
-- ==========================================================
-- YAGI Workshop ??Phase 1.1 Schema + RLS + Storage
-- Tenancy: Workspace > Brand > Project
-- ==========================================================

-- =========== Tables ===========

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  logo_url text,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'custom')),
  tax_id text,
  tax_invoice_email text,
  brand_guide jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_slug_idx on public.workspaces(slug);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$'),
  logo_url text,
  industry text,
  description text,
  brand_guide jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index brands_workspace_idx on public.brands(workspace_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_-]{3,30}$'),
  display_name text not null,
  bio text,
  avatar_url text,
  locale text not null default 'ko' check (locale in ('ko', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('creator', 'workspace_admin', 'workspace_member', 'yagi_admin')),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint ws_role_requires_ws
    check ((role like 'workspace_%' and workspace_id is not null) or (role not like 'workspace_%' and workspace_id is null)),
  unique (user_id, role, workspace_id)
);
create index user_roles_user_idx on public.user_roles(user_id);
create index user_roles_ws_idx on public.user_roles(workspace_id);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  invited_by uuid references public.profiles(id),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index ws_members_ws_idx on public.workspace_members(workspace_id);
create index ws_members_user_idx on public.workspace_members(user_id);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token text not null unique,
  invited_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  project_type text not null default 'direct_commission'
    check (project_type in ('direct_commission', 'contest_brief')),
  created_by uuid not null references public.profiles(id),
  title text not null,
  brief text,
  deliverable_types text[] not null default '{}',
  estimated_budget_range text,
  target_delivery_at timestamptz,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'in_discovery', 'in_production',
    'in_revision', 'delivered', 'approved', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_workspace_idx on public.projects(workspace_id);
create index projects_brand_idx on public.projects(brand_id);
create index projects_type_status_idx on public.projects(project_type, status);

create table public.project_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  added_by uuid not null references public.profiles(id),
  storage_path text,
  external_url text,
  og_title text,
  og_description text,
  og_image_url text,
  caption text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  constraint ref_has_source check (storage_path is not null or external_url is not null)
);
create index project_refs_project_idx on public.project_references(project_id);

create table public.project_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index project_threads_project_idx on public.project_threads(project_id);

create table public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.project_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text,
  attachments jsonb not null default '[]'::jsonb,
  visibility text not null default 'shared' check (visibility in ('internal', 'shared')),
  parent_message_id uuid references public.thread_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index thread_messages_thread_idx on public.thread_messages(thread_id);

create table public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null default 1,
  submitted_by uuid not null references public.profiles(id),
  storage_paths text[] not null default '{}',
  external_urls text[] not null default '{}',
  note text,
  status text not null default 'submitted' check (status in ('submitted', 'changes_requested', 'approved')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create index deliverables_project_idx on public.project_deliverables(project_id);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index milestones_project_idx on public.project_milestones(project_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_number text unique not null,
  amount numeric(14, 2) not null,
  currency text not null default 'KRW',
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  paid_at timestamptz,
  status text not null default 'issued' check (status in ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
  note text,
  tax_invoice_issued boolean not null default false,
  tax_invoice_issued_at timestamptz,
  created_by uuid not null references public.profiles(id)
);
create index invoices_ws_idx on public.invoices(workspace_id);
create index invoices_project_idx on public.invoices(project_id);

-- =========== Triggers ===========

create or replace function public.tg_touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger workspaces_touch before update on public.workspaces
  for each row execute function public.tg_touch_updated_at();
create trigger brands_touch before update on public.brands
  for each row execute function public.tg_touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.tg_touch_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function public.tg_touch_updated_at();

-- =========== Security-definer helpers ===========

create or replace function public.is_yagi_admin(uid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
$$;

create or replace function public.is_ws_member(uid uuid, wsid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
$$;

create or replace function public.is_ws_admin(uid uuid, wsid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from workspace_members
    where user_id = uid and workspace_id = wsid and role = 'admin'
  );
$$;

-- =========== Enable RLS ===========

alter table public.workspaces enable row level security;
alter table public.brands enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.project_references enable row level security;
alter table public.project_threads enable row level security;
alter table public.thread_messages enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.project_milestones enable row level security;
alter table public.invoices enable row level security;

-- =========== Policies: profiles ===========

create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_upsert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- =========== Policies: user_roles ===========

create policy "user_roles_read_self" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_yagi_admin(auth.uid()));
create policy "user_roles_self_insert_creator" on public.user_roles for insert to authenticated
  with check (user_id = auth.uid() and role = 'creator' and workspace_id is null);
create policy "user_roles_self_insert_ws_admin" on public.user_roles for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'workspace_admin' and workspace_id is not null
    and public.is_ws_admin(auth.uid(), workspace_id)
  );
create policy "user_roles_yagi_admin" on public.user_roles for all to authenticated
  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));

-- =========== Policies: workspaces ===========

create policy "ws_read_members" on public.workspaces for select to authenticated
  using (public.is_ws_member(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
create policy "ws_create_any_auth" on public.workspaces for insert to authenticated with check (true);
create policy "ws_update_admin" on public.workspaces for update to authenticated
  using (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()))
  with check (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
create policy "ws_delete_yagi" on public.workspaces for delete to authenticated
  using (public.is_yagi_admin(auth.uid()));

-- =========== Policies: brands ===========

create policy "brands_read" on public.brands for select to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "brands_write_admin" on public.brands for all to authenticated
  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));

-- =========== Policies: workspace_members ===========

create policy "ws_members_read" on public.workspace_members for select to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "ws_members_self_bootstrap" on public.workspace_members for insert to authenticated
  with check (
    (user_id = auth.uid() and role = 'admin'
     and not exists (select 1 from workspace_members m where m.workspace_id = workspace_members.workspace_id))
    or public.is_ws_admin(auth.uid(), workspace_id)
    or public.is_yagi_admin(auth.uid())
  );
create policy "ws_members_delete_admin" on public.workspace_members for delete to authenticated
  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));

-- =========== Policies: workspace_invitations ===========

create policy "ws_inv_read_admin" on public.workspace_invitations for select to authenticated
  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "ws_inv_write_admin" on public.workspace_invitations for all to authenticated
  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));

-- =========== Policies: projects ===========

create policy "projects_read" on public.projects for select to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "projects_insert" on public.projects for insert to authenticated
  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "projects_update" on public.projects for update to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
  with check (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "projects_delete_yagi" on public.projects for delete to authenticated
  using (public.is_yagi_admin(auth.uid()));

-- =========== Policies: project child tables ===========

create policy "proj_refs_rw" on public.project_references for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "proj_threads_rw" on public.project_threads for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "thread_msgs_rw" on public.thread_messages for all to authenticated
  using (exists (select 1 from project_threads t join projects p on p.id = t.project_id
    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from project_threads t join projects p on p.id = t.project_id
    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "thread_msgs_hide_internal_from_clients" on public.thread_messages as restrictive for select to authenticated
  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());

create policy "deliverables_rw" on public.project_deliverables for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "milestones_rw" on public.project_milestones for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_admin(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "invoices_read" on public.invoices for select to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "invoices_yagi_write" on public.invoices for all to authenticated
  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));

-- =========== Storage buckets ===========

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('workspace-logos', 'workspace-logos', true),
  ('brand-logos', 'brand-logos', true),
  ('project-references', 'project-references', false),
  ('project-deliverables', 'project-deliverables', false)
on conflict (id) do nothing;

create policy "avatars_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "ws_logos_read" on storage.objects for select using (bucket_id = 'workspace-logos');
create policy "ws_logos_write" on storage.objects for insert to authenticated with check (bucket_id = 'workspace-logos');

create policy "brand_logos_read" on storage.objects for select using (bucket_id = 'brand-logos');
create policy "brand_logos_write" on storage.objects for insert to authenticated with check (bucket_id = 'brand-logos');

create policy "refs_read" on storage.objects for select to authenticated
  using (bucket_id = 'project-references' and exists (
    select 1 from project_references pr join projects p on p.id = pr.project_id
    where pr.storage_path = name
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
  ));
create policy "refs_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-references');

create policy "deliverables_read" on storage.objects for select to authenticated
  using (bucket_id = 'project-deliverables' and exists (
    select 1 from project_deliverables d join projects p on p.id = d.project_id
    where name = any(d.storage_paths)
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
  ));
create policy "deliverables_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-deliverables');

 succeeded in 489ms:
"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  addLineItem,
  deleteLineItem,
  reorderLineItems,
  bulkAddFromSuggestions,
  fetchSuggestions,
} from "@/app/[locale]/app/invoices/[id]/line-item-actions";
import {
  issueInvoice,
  markPaid,
  voidInvoice,
} from "@/app/[locale]/app/invoices/[id]/actions";
import type { SuggestedLineItem } from "@/lib/invoices/suggest-line-items";

// ??? Types ???????????????????????????????????????????????????????????????????

type InvoiceRow = {
  id: string;
  project_id: string;
  workspace_id: string;
  status: string;
  invoice_number: string | null;
  supply_date: string;
  due_date: string | null;
  issue_date: string | null;
  paid_at: string | null;
  void_at: string | null;
  void_reason: string | null;
  subtotal_krw: number;
  vat_krw: number;
  total_krw: number;
  is_mock: boolean;
  filed_at: string | null;
  nts_approval_number: string | null;
  memo: string | null;
};

type LineItemRow = {
  id: string;
  item_name: string;
  specification: string | null;
  quantity: number;
  unit_price_krw: number;
  supply_krw: number;
  vat_krw: number;
  display_order: number;
  source_type: string | null;
  source_id: string | null;
};

export type BuyerInfo = {
  id: string;
  name: string;
  business_registration_number: string | null;
  representative_name: string | null;
  business_address: string | null;
  tax_invoice_email: string | null;
};

export type SupplierInfo = {
  corporate_name: string;
  business_registration_number: string;
  representative_name: string;
  address: string;
  contact_email: string;
  business_type: string | null;
  business_item: string | null;
};

type PopbillMode = "mock" | "test" | "production";

interface InvoiceEditorProps {
  invoice: InvoiceRow;
  lineItems: LineItemRow[];
  supplier: SupplierInfo | null;
  buyer: BuyerInfo;
  projectTitle: string;
  isYagiAdmin: boolean;
  locale: string;
  popbillMode: PopbillMode;
}

// ??? Helpers ?????????????????????????????????????????????????????????????????

const krwFmt = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
});

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function todayInSeoul(): string {
  return dateFmt.format(new Date());
}

function monthAgoInSeoul(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 1);
  return dateFmt.format(d);
}

// ??? Line item add form ??????????????????????????????????????????????????????

const lineItemSchema = z.object({
  item_name: z.string().min(1, "required").max(300),
  specification: z.string().max(300).optional().or(z.literal("")),
  quantity: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: "invalid_number",
    }),
  unit_price_krw: z
    .string()
    .min(1)
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number.isInteger(Number(v)),
      { message: "invalid_number" }
    ),
});

type LineItemFormData = z.infer<typeof lineItemSchema>;

interface AddLineItemPopoverProps {
  invoiceId: string;
  onAdded: () => void;
}

function AddLineItemPopover({ invoiceId, onAdded }: AddLineItemPopoverProps) {
  const t = useTranslations("invoices");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      item_name: "",
      specification: "",
      quantity: "1",
      unit_price_krw: "0",
    },
  });

  function onSubmit(data: LineItemFormData) {
    startTransition(async () => {
      const result = await addLineItem(invoiceId, {
        item_name: data.item_name,
        specification:
          data.specification && data.specification.length > 0
            ? data.specification
            : null,
        quantity: Number(data.quantity),
        unit_price_krw: Number(data.unit_price_krw),
      });
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        return;
      }
      toast.success(t("line_item_saved"));
      reset();
      setOpen(false);
      onAdded();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {t("add_line_item")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="item_name" className="text-xs keep-all">
              {t("item_name_label")}
            </Label>
            <Input
              id="item_name"
              placeholder={t("item_name_ph")}
              {...register("item_name")}
            />
            {errors.item_name && (
              <p className="text-[11px] text-destructive">
                {errors.item_name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="specification" className="text-xs keep-all">
              {t("specification_label")}
            </Label>
            <Input
              id="specification"
              placeholder={t("specification_ph")}
              {...register("specification")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-xs keep-all">
                {t("quantity_label")}
              </Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                placeholder={t("quantity_ph")}
                {...register("quantity")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_price_krw" className="text-xs keep-all">
                {t("unit_price_label")}
              </Label>
              <Input
                id="unit_price_krw"
                type="number"
                step="1"
                min="0"
                placeholder={t("unit_price_ph")}
                {...register("unit_price_krw")}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="w-full rounded-full text-xs"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {t("add_line_item")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ??? Suggest dialog ??????????????????????????????????????????????????????????

interface SuggestDialogProps {
  invoiceId: string;
  projectId: string;
  onApplied: () => void;
}

function SuggestDialog({ invoiceId, projectId, onApplied }: SuggestDialogProps) {
  const t = useTranslations("invoices");
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(monthAgoInSeoul());
  const [to, setTo] = useState(todayInSeoul());
  const [suggestions, setSuggestions] = useState<SuggestedLineItem[] | null>(
    null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, startApply] = useTransition();

  async function loadSuggestions() {
    setIsLoading(true);
    setSuggestions(null);
    setSelected(new Set());
    try {
      const result = await fetchSuggestions({ projectId, from, to });
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        return;
      }
      setSuggestions(result.items);
    } catch (err) {
      console.error("[invoices] suggest fetch failed", err);
      toast.error(t("line_item_failed"));
    } finally {
      setIsLoading(false);
    }
  }

  function keyFor(s: SuggestedLineItem): string {
    return `${s.source_type}:${s.source_id}`;
  }

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applySelected() {
    if (!suggestions) return;
    const items = suggestions.filter((s) => selected.has(keyFor(s)));
    if (items.length === 0) return;
    startApply(async () => {
      const result = await bulkAddFromSuggestions(invoiceId, items);
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        return;
      }
      toast.success(t("line_item_saved"));
      setOpen(false);
      setSuggestions(null);
      setSelected(new Set());
      onApplied();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          {t("suggestions_title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {t("suggestions_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="suggest-from" className="text-xs">
              {t("suggest_range_from")}
            </Label>
            <Input
              id="suggest-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="suggest-to" className="text-xs">
              {t("suggest_range_to")}
            </Label>
            <Input
              id="suggest-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full text-xs"
            disabled={isLoading}
            onClick={loadSuggestions}
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {t("suggest_load_button")}
          </Button>
        </div>

        <div className="max-h-[300px] overflow-y-auto border border-border rounded-md">
          {suggestions === null ? (
            <p className="text-xs text-muted-foreground p-4 keep-all">
              {t("reorder_hint")}
            </p>
          ) : suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 keep-all">
              {t("no_suggestions")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {suggestions.map((s) => {
                const k = keyFor(s);
                const isSelected = selected.has(k);
                return (
                  <li
                    key={k}
                    className={cn(
                      "flex items-start gap-2 px-3 py-2 text-xs",
                      s.already_billed && "opacity-70"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(k)}
                      className="mt-0.5"
                      aria-label={s.item_name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate keep-all">
                        {s.item_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {s.quantity} 횞 {krwFmt.format(s.unit_price_krw)}
                      </p>
                    </div>
                    {s.already_billed && (
                      <Badge
                        variant="outline"
                        className="rounded-full text-[10px] px-2 border-amber-300 text-amber-700 bg-amber-50"
                      >
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        {t("already_billed_warning")}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            size="sm"
            className="rounded-full text-xs"
            disabled={isApplying || selected.size === 0}
            onClick={applySelected}
          >
            {isApplying && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {t("suggest_apply_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ??? Line item row (read-only + editable variants) ??????????????????????????

interface LineItemRowViewProps {
  item: LineItemRow;
  index: number;
  total: number;
  editable: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDeleted: () => void;
}

function LineItemRowView({
  item,
  index,
  total,
  editable,
  onMoveUp,
  onMoveDown,
  onDeleted,
}: LineItemRowViewProps) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLineItem(item.id);
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        return;
      }
      toast.success(t("line_item_deleted"));
      onDeleted();
    });
  }

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="font-medium keep-all">{item.item_name}</div>
        {item.specification && (
          <div className="text-[11px] text-muted-foreground keep-all">
            {item.specification}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {item.quantity}
      </TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {krwFmt.format(item.unit_price_krw)}
      </TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {krwFmt.format(item.supply_krw)}
      </TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {krwFmt.format(item.vat_krw)}
      </TableCell>
      {editable && (
        <TableCell className="w-[120px] align-top">
          <div className="flex items-center gap-0.5 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={index === 0}
              onClick={onMoveUp}
              aria-label="move up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={index === total - 1}
              onClick={onMoveDown}
              aria-label="move down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  aria-label={t("delete_line_item")}
                  disabled={isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("delete_confirm_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="keep-all">
                    {item.item_name}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">
                    {tCommon("cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-full bg-destructive hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    {t("delete_line_item")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

// ??? Action footer (issue / markPaid / void) ?????????????????????????????????

interface ActionFooterProps {
  invoice: InvoiceRow;
  buyerRegistrationMissing: boolean;
}

function ActionFooter({ invoice, buyerRegistrationMissing }: ActionFooterProps) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [voidReason, setVoidReason] = useState("");

  function handleIssue() {
    startTransition(async () => {
      const result = await issueInvoice(invoice.id);
      if (!result.ok) {
        const missing =
          "missing_fields" in result && result.missing_fields
            ? result.missing_fields.join(", ")
            : undefined;
        toast.error(t("issue_failed"), {
          description: missing
            ? `${t("missing_fields_title")}: ${missing}`
            : result.error,
        });
        return;
      }
      toast.success(t("issue_success"));
      router.refresh();
    });
  }

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markPaid(invoice.id);
      if (!result.ok) {
        toast.error(t("mark_paid_failed"), { description: result.error });
        return;
      }
      toast.success(t("mark_paid_success"));
      router.refresh();
    });
  }

  function handleVoid() {
    startTransition(async () => {
      const result = await voidInvoice(
        invoice.id,
        voidReason.length > 0 ? voidReason : undefined
      );
      if (!result.ok) {
        toast.error(t("void_failed"), { description: result.error });
        return;
      }
      toast.success(t("void_success"));
      setVoidReason("");
      router.refresh();
    });
  }

  if (invoice.status === "void") return null;

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between gap-3 z-10">
      <div className="text-xs text-muted-foreground keep-all">
        {t("action_footer_title")}
      </div>
      <div className="flex items-center gap-2">
        {/* Draft ??Issue */}
        {invoice.status === "draft" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                disabled={isPending || buyerRegistrationMissing}
                className="rounded-full uppercase tracking-[0.12em] px-6 py-2.5 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {t("issue_button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("issue_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription className="keep-all">
                  {t("issue_confirm_body")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">
                  {tCommon("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-full"
                  onClick={handleIssue}
                >
                  {t("issue_button")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Issued ??Mark paid */}
        {invoice.status === "issued" && (
          <Button
            type="button"
            disabled={isPending}
            onClick={handleMarkPaid}
            className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {t("mark_paid")}
          </Button>
        )}

        {/* Issued | Paid ??Void */}
        {(invoice.status === "issued" || invoice.status === "paid") && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                className="rounded-full text-sm border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {t("void_button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("void_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription className="keep-all">
                  {t("void_reason_label")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder={t("void_reason_ph")}
                rows={3}
                className="text-sm"
              />
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">
                  {tCommon("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-full bg-destructive hover:bg-destructive/90"
                  onClick={handleVoid}
                >
                  {t("void_button")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ??? Main editor ?????????????????????????????????????????????????????????????

export function InvoiceEditor({
  invoice,
  lineItems: initialLineItems,
  supplier,
  buyer,
  isYagiAdmin,
  popbillMode,
}: InvoiceEditorProps) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [lineItems, setLineItems] = useState<LineItemRow[]>(initialLineItems);
  const [isReordering, startReorder] = useTransition();

  const isDraft = invoice.status === "draft";
  const editable = isDraft && isYagiAdmin;

  const buyerRegistrationMissing = useMemo(
    () => !buyer.business_registration_number,
    [buyer]
  );

  function refreshFromServer() {
    router.refresh();
  }

  function moveItem(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= lineItems.length) return;
    const next = [...lineItems];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setLineItems(next);
    startReorder(async () => {
      const result = await reorderLineItems(
        invoice.id,
        next.map((it) => it.id)
      );
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        // revert
        setLineItems(initialLineItems);
        return;
      }
      refreshFromServer();
    });
  }

  const subtotal = lineItems.reduce((acc, it) => acc + it.supply_krw, 0);
  const vatSum = lineItems.reduce((acc, it) => acc + it.vat_krw, 0);
  const total = subtotal + vatSum;

  return (
    <div className="flex flex-col gap-8">
      {/* Mock banner */}
      {invoice.is_mock && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 px-4 py-3">
          <p className="font-semibold text-sm keep-all">
            {t("mock_banner_title")}
          </p>
          <p className="text-xs mt-1 keep-all">{t("mock_banner_body")}</p>
          {popbillMode !== "mock" && (
            <p className="text-[11px] mt-1 opacity-70">
              (current mode: {popbillMode})
            </p>
          )}
        </div>
      )}

      {/* Buyer registration warning */}
      {isDraft && buyerRegistrationMissing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm keep-all flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {t("buyer_registration_missing")}{" "}
            <Link
              href="/app/settings/workspace"
              className="underline font-medium"
            >
              /app/settings/workspace
            </Link>
          </span>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column ??line items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg tracking-tight">
              <em>{t("line_items_title")}</em>
            </h2>
            {editable && (
              <div className="flex items-center gap-2">
                <AddLineItemPopover
                  invoiceId={invoice.id}
                  onAdded={refreshFromServer}
                />
                <SuggestDialog
                  invoiceId={invoice.id}
                  projectId={invoice.project_id}
                  onApplied={refreshFromServer}
                />
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("item_name_label")}</TableHead>
                  <TableHead className="text-right">
                    {t("quantity_label")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("unit_price_label")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("subtotal_label")}
                  </TableHead>
                  <TableHead className="text-right">{t("vat_label")}</TableHead>
                  {editable && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={editable ? 6 : 5}
                      className="text-center text-muted-foreground py-6 keep-all text-xs"
                    >
                      {t("list_empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, idx) => (
                    <LineItemRowView
                      key={item.id}
                      item={item}
                      index={idx}
                      total={lineItems.length}
                      editable={editable}
                      onMoveUp={() => moveItem(idx, idx - 1)}
                      onMoveDown={() => moveItem(idx, idx + 1)}
                      onDeleted={refreshFromServer}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {editable && isReordering && (
            <p className="text-[11px] text-muted-foreground">{t("reorder_hint")}</p>
          )}

          {/* Issued info */}
          {(invoice.status === "issued" || invoice.status === "paid") && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs space-y-1">
              {invoice.nts_approval_number && (
                <div className="flex items-baseline gap-2">
                  <span className="font-medium keep-all">
                    {t("nts_approval_number_label")}:
                  </span>
                  <span className="tabular-nums">
                    {invoice.nts_approval_number}
                  </span>
                </div>
              )}
              {invoice.filed_at && (
                <div className="flex items-baseline gap-2">
                  <span className="font-medium keep-all">
                    {t("filed_at_label")}:
                  </span>
                  <span className="tabular-nums">
                    {new Date(invoice.filed_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </span>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex items-baseline gap-2">
                  <span className="font-medium keep-all">
                    {t("paid_at_label")}:
                  </span>
                  <span className="tabular-nums">
                    {new Date(invoice.paid_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Void info */}
          {invoice.status === "void" && (
            <div className="rounded-lg border border-border bg-muted/60 px-4 py-3 text-xs space-y-1 text-muted-foreground">
              <div className="flex items-baseline gap-2">
                <span className="font-medium keep-all">
                  {t("status_void")}:
                </span>
                {invoice.void_at && (
                  <span className="tabular-nums">
                    {new Date(invoice.void_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </span>
                )}
              </div>
              {invoice.void_reason && (
                <p className="keep-all">{invoice.void_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Right column ??supplier/buyer + totals */}
        <div className="space-y-4">
          {/* Totals */}
          <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground keep-all">
                {t("subtotal_label")}
              </span>
              <span className="tabular-nums">{krwFmt.format(subtotal)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground keep-all">
                {t("vat_label")}
              </span>
              <span className="tabular-nums">{krwFmt.format(vatSum)}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-baseline justify-between">
              <span className="font-semibold keep-all">{t("total_label")}</span>
              <span className="tabular-nums font-semibold">
                {krwFmt.format(total)}
              </span>
            </div>
          </div>

          {/* Supplier */}
          {supplier && (
            <div className="rounded-lg border border-border p-4 text-xs space-y-1">
              <p className="font-semibold text-sm mb-2 keep-all">
                {t("supplier_block_title")}
              </p>
              <p className="font-medium">{supplier.corporate_name}</p>
              <p className="text-muted-foreground tabular-nums">
                {supplier.business_registration_number}
              </p>
              <p className="text-muted-foreground keep-all">
                {supplier.representative_name}
              </p>
              <p className="text-muted-foreground keep-all">
                {supplier.address}
              </p>
              {(supplier.business_type || supplier.business_item) && (
                <p className="text-muted-foreground keep-all">
                  {supplier.business_type}
                  {supplier.business_type && supplier.business_item ? " 쨌 " : ""}
                  {supplier.business_item}
                </p>
              )}
              <p className="text-muted-foreground">{supplier.contact_email}</p>
            </div>
          )}

          {/* Buyer */}
          <div className="rounded-lg border border-border p-4 text-xs space-y-1">
            <p className="font-semibold text-sm mb-2 keep-all">
              {t("buyer_block_title")}
            </p>
            <p className="font-medium keep-all">{buyer.name}</p>
            {buyer.business_registration_number ? (
              <p className="text-muted-foreground tabular-nums">
                {buyer.business_registration_number}
              </p>
            ) : (
              <p className="text-amber-700 keep-all">
                {t("buyer_registration_missing")}
              </p>
            )}
            {buyer.representative_name && (
              <p className="text-muted-foreground keep-all">
                {buyer.representative_name}
              </p>
            )}
            {buyer.business_address && (
              <p className="text-muted-foreground keep-all">
                {buyer.business_address}
              </p>
            )}
            {buyer.tax_invoice_email && (
              <p className="text-muted-foreground">
                {buyer.tax_invoice_email}
              </p>
            )}
          </div>

          {/* Memo */}
          {invoice.memo && (
            <div className="rounded-lg border border-border p-4 text-xs space-y-1">
              <p className="font-semibold text-sm mb-2 keep-all">
                {t("memo_label")}
              </p>
              <p className="text-muted-foreground keep-all whitespace-pre-wrap">
                {invoice.memo}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action footer (yagi admin only) */}
      {isYagiAdmin && (
        <ActionFooter
          invoice={invoice}
          buyerRegistrationMissing={buyerRegistrationMissing}
        />
      )}
    </div>
  );
}

codex
I’ve got the UI surfaces. One likely defect is already emerging in the detail screen: a mock invoice only gets a small badge in the header, not the required red banner on the page shell. I’m pulling exact SQL fragments and line numbers now to separate policy-level failures from UI misses.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"supplier_profile|invoice_line_items|is_mock|recalc_invoice_totals|create policy .*invoices|create policy .*invoice_line_items|restrictive|nts_approval_number|popbill_mgt_key\" 'supabase/migrations/20260421094855_phase1_schema.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:01:12.940053Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/actions.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/actions.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/actions.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
2026-04-21T18:01:12.994439Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
2026-04-21T18:01:12.996106Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/print/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/print/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/invoices/[id]/print/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
2026-04-21T18:01:12.998328Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -Path '"'src/lib/invoices/issue-email.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -Path '"'src/lib/invoices/issue-email.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -Path '"'src/lib/invoices/issue-email.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
2026-04-21T18:01:12.999481Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -Path '"'src/lib/popbill/client.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -Path '"'src/lib/popbill/client.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -Path '"'src/lib/popbill/client.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }'` rejected: blocked by policy
 succeeded in 333ms:
340:create policy "thread_msgs_hide_internal_from_clients" on public.thread_messages as restrictive for select to authenticated
355:create policy "invoices_read" on public.invoices for select to authenticated
357:create policy "invoices_yagi_write" on public.invoices for all to authenticated

codex
The line-number helper hit a command-policy edge, so I’m switching to `rg -n` on exact symbols and surrounding context. I’m also checking whether the Phase 1.5 SQL actually exists in the named migration or if the app code is already ahead of the schema file, because that mismatch itself can create high-severity release risk.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 4 \"export async function issueInvoice|issueTaxInvoice\\(|\\.update\\(|\\.eq\\(\\\"status\\\", \\\"draft\\\"\\)|sendInvoiceIssuedEmail|invoiceNumber|popbill_mgt_key|nts_approval_number|is_mock\" src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"mock_badge|mock_banner_title|mock_banner_body|showPrint|href=\\"'`/'"\\"'$'"\\{locale\\}/app/invoices/\\"'$'"\\{id\\}/print\\"'`|getPopbillMode|createSupabaseServer'"\\(|auth.getUser\\(|from\\(\\\"invoices\\\"\\)\" src/app/[locale]/app/invoices/[id]/page.tsx" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:01:33.472685Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"auth.getUser\\(|from\\(\\\"invoices\\\"\\)|mock-watermark|mock-banner|redirect\\(|printUrl|window.print|open redirect|href=\\"'`/'"\\"'$'"\\{locale\\}/app/invoices/\\"'$'"\\{id\\}/print\\"'`" src/app/[locale]/app/invoices/[id]/print/page.tsx src/components/invoices/print-button.tsx'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"auth.getUser\\(|from\\(\\\"invoices\\\"\\)|mock-watermark|mock-banner|redirect\\(|printUrl|window.print|open redirect|href=\\"'`/'"\\"'$'"\\{locale\\}/app/invoices/\\"'$'"\\{id\\}/print\\"'`" src/app/[locale]/app/invoices/[id]/print/page.tsx src/components/invoices/print-button.tsx' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"escapeHtml|subject =|mockBanner|printUrl|siteUrl|resend\\.emails\\.send|htmlBody|textBody\" src/lib/invoices/issue-email.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"auth.getUser\\(|from\\(\\\"invoices\\\"\\)|mock-watermark|mock-banner|redirect\\(|printUrl|window.print|open redirect|href=\\"'`/'"\\"'$'"\\{locale\\}/app/invoices/\\"'$'"\\{id\\}/print\\"'`" src/app/[locale]/app/invoices/[id]/print/page.tsx src/components/invoices/print-button.tsx'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -C 3 "const mode|NEXT_PUBLIC_VERCEL_ENV|throw new Error|getPopbillMode|issueTaxInvoice|mockIssueTaxInvoice|popbill_mgt_key|nts_approval_number" src/lib/popbill/client.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -C 4 "supplier_profile|invoice_line_items|recalc_invoice_totals|is_mock|popbill_mgt_key|nts_approval_number|restrictive|invoices_read|invoice_line_items|create table public.invoices|alter table public.invoices" supabase/migrations/20260421094855_phase1_schema.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:01:33.963562Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:
rg: \draft\\)|sendInvoiceIssuedEmail|invoiceNumber|popbill_mgt_key|nts_approval_number|is_mock src/app/[locale]/app/invoices/[id]/actions.ts: IO error for operation on \draft\\)|sendInvoiceIssuedEmail|invoiceNumber|popbill_mgt_key|nts_approval_number|is_mock src/app/[locale]/app/invoices/[id]/actions.ts: 지정된 경로를 찾을 수 없습니다. (os error 3)

 exited 1 in 567ms:
rg: \draft\\)|sendInvoiceIssuedEmail|invoiceNumber|popbill_mgt_key|nts_approval_number|is_mock src/app/[locale]/app/invoices/[id]/actions.ts: IO error for operation on \draft\\)|sendInvoiceIssuedEmail|invoiceNumber|popbill_mgt_key|nts_approval_number|is_mock src/app/[locale]/app/invoices/[id]/actions.ts: 지정된 경로를 찾을 수 없습니다. (os error 3)

2026-04-21T18:01:34.014071Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:
rg: regex parse error:
    (?:mock_badge|mock_banner_title|mock_banner_body|showPrint|href=\/\$\{locale\}/app/invoices/\$\{id\}/print\|getPopbillMode|createSupabaseServer\(|auth.getUser\(|from\(\)
    ^
error: unclosed group

 exited 1 in 615ms:
rg: regex parse error:
    (?:mock_badge|mock_banner_title|mock_banner_body|showPrint|href=\/\$\{locale\}/app/invoices/\$\{id\}/print\|getPopbillMode|createSupabaseServer\(|auth.getUser\(|from\(\)
    ^
error: unclosed group

 succeeded in 593ms:
2-import { createSupabaseService } from "@/lib/supabase/service";
3-import { getResend, EMAIL_FROM } from "@/lib/resend";
4-
5:function escapeHtml(s: string): string {
6-  return s
7-    .replace(/&/g, "&amp;")
8-    .replace(/</g, "&lt;")
--
88-  const supplierName = supplier?.corporate_name ?? "YAGI Workshop";
89-  const supplierContactEmail = supplier?.contact_email ?? "yagi@yagiworkshop.xyz";
90-
91:  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
92:  const printUrl = `${siteUrl}/ko/app/invoices/${invoice.id}/print`;
93-
94:  const subject = invoice.is_mock
95-    ? `[YAGI] 세금계산서 (MOCK) — ${invoice.invoice_number ?? invoice.id}`
96-    : `[YAGI] 세금계산서 발행 알림 — ${invoice.invoice_number ?? invoice.id}`;
97-
98:  const mockBanner = invoice.is_mock
99-    ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:8px;margin:16px 0">
100-  <strong>⚠️ 주의: 이 세금계산서는 현재 MOCK 모드로 발행되었습니다.</strong>
101-  <p style="margin:8px 0 0;font-size:14px">팝빌 서비스 승인 대기 중이며, 국세청에 실제 신고된 문서가 아닙니다. 팝빌 승인 후 재발행 예정입니다.</p>
102-</div>`
103-    : "";
104-
105:  const htmlBody = `<h2 style="font-family: system-ui, sans-serif">세금계산서 발행 알림</h2>
106:<p>안녕하세요, <strong>${escapeHtml(buyerName)}</strong> 담당자님.</p>
107:<p><strong>${escapeHtml(supplierName)}</strong>에서 세금계산서를 발행하였습니다.</p>
108:${mockBanner}
109-<table style="width:100%;border-collapse:collapse;margin:16px 0">
110:  <tr><td>송장 번호</td><td>${escapeHtml(invoice.invoice_number ?? "—")}</td></tr>
111:  <tr><td>국세청 승인번호</td><td>${escapeHtml(invoice.nts_approval_number ?? "—")}</td></tr>
112:  <tr><td>프로젝트</td><td>${escapeHtml(projectTitle)}</td></tr>
113:  <tr><td>공급일자</td><td>${escapeHtml(invoice.supply_date)}</td></tr>
114:  <tr><td>결제기한</td><td>${escapeHtml(invoice.due_date ?? "—")}</td></tr>
115:  <tr><td>공급가액</td><td>${escapeHtml(formatKRW(invoice.subtotal_krw))}</td></tr>
116:  <tr><td>부가세</td><td>${escapeHtml(formatKRW(invoice.vat_krw))}</td></tr>
117:  <tr><td><strong>합계</strong></td><td><strong>${escapeHtml(formatKRW(invoice.total_krw))}</strong></td></tr>
118-</table>
119:<p style="margin:24px 0"><a href="${escapeHtml(printUrl)}" style="display:inline-block;background:#000;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">세금계산서 PDF 보기 →</a></p>
120-<p style="color:#6b7280;font-size:12px;margin-top:32px">
121:  문의사항이 있으시면 ${escapeHtml(supplierContactEmail)} 로 회신해 주세요.
122-</p>`;
123-
124-  const mockWarningText = invoice.is_mock
125-    ? "[WARNING] This invoice was issued in MOCK mode. It has NOT been filed with the Korean National Tax Service (NTS). A real filing will follow once Popbill approval is granted.\n\n"
126-    : "";
127-
128:  const textBody =
129-    `${subject}\n\n` +
130-    mockWarningText +
131-    `Invoice Number: ${invoice.invoice_number ?? "-"}\n` +
--
136-    `Subtotal: KRW ${invoice.subtotal_krw}\n` +
137-    `VAT: KRW ${invoice.vat_krw}\n` +
138-    `Total: KRW ${invoice.total_krw}\n\n` +
139:    `${printUrl}\n\n` +
140-    `Contact: ${supplierContactEmail}\n`;
141-
142-  try {
143:    await resend.emails.send({
144-      from: EMAIL_FROM,
145-      to: buyer.tax_invoice_email,
146-      bcc: EMAIL_FROM,
147-      subject,
148:      html: htmlBody,
149:      text: textBody,
150-    });
151-  } catch (err) {
152-    console.error("[invoices] email send failed", err);

 succeeded in 645ms:
2-
3-export type PopbillMode = "mock" | "test" | "production";
4-
5:const mode: PopbillMode = ((process.env.POPBILL_MODE ?? "test") as PopbillMode);
6-
7-// CRITICAL SAFETY GUARD — must be the very first thing the module does.
8-// Refuses mock mode in production deploys (per Codex K-05 mock-mode focus #7).
9:if (mode === "mock" && process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
10:  throw new Error(
11-    "POPBILL_MODE=mock is forbidden in production. Set POPBILL_MODE=production with real credentials."
12-  );
13-}
--
72-export type IssueResult =
73-  | {
74-      ok: true;
75:      nts_approval_number: string;   // 국세청 승인번호
76:      popbill_mgt_key: string;
77-      mode: PopbillMode;
78-      raw_response: Record<string, unknown>;
79-    }
--
81-
82-// ─── Public API ──────────────────────────────────────────────────────────────
83-
84:export function getPopbillMode(): PopbillMode {
85-  return mode;
86-}
87-
--
94-  );
95-}
96-
97:export async function issueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
98:  if (mode === "mock") return mockIssueTaxInvoice(args);
99-  // Real SDK paths not implemented yet — popbill credentials pending.
100-  return {
101-    ok: false,
--
107-
108-// ─── Mock implementation ─────────────────────────────────────────────────────
109-
110:async function mockIssueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
111-  await new Promise((r) => setTimeout(r, 200)); // simulate API latency
112-
113-  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
--
118-  return {
119-    ok: true,
120-    mode: "mock",
121:    nts_approval_number: `MOCK-${ymd}-${random}`,
122:    popbill_mgt_key: `mock-${args.invoice_id}`,
123-    raw_response: {
124-      mock: true,
125-      issued_at: new Date().toISOString(),

 succeeded in 667ms:
173-  created_at timestamptz not null default now()
174-);
175-create index milestones_project_idx on public.project_milestones(project_id);
176-
177:create table public.invoices (
178-  id uuid primary key default gen_random_uuid(),
179-  project_id uuid references public.projects(id) on delete set null,
180-  workspace_id uuid not null references public.workspaces(id) on delete cascade,
181-  invoice_number text unique not null,
--
241-alter table public.project_threads enable row level security;
242-alter table public.thread_messages enable row level security;
243-alter table public.project_deliverables enable row level security;
244-alter table public.project_milestones enable row level security;
245:alter table public.invoices enable row level security;
246-
247--- =========== Policies: profiles ===========
248-
249-create policy "profiles_read" on public.profiles for select to authenticated using (true);
--
336-    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
337-  with check (exists (select 1 from project_threads t join projects p on p.id = t.project_id
338-    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
339-
340:create policy "thread_msgs_hide_internal_from_clients" on public.thread_messages as restrictive for select to authenticated
341-  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());
342-
343-create policy "deliverables_rw" on public.project_deliverables for all to authenticated
344-  using (exists (select 1 from projects p where p.id = project_id
--
351-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
352-  with check (exists (select 1 from projects p where p.id = project_id
353-    and (public.is_ws_admin(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
354-
355:create policy "invoices_read" on public.invoices for select to authenticated
356-  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
357-create policy "invoices_yagi_write" on public.invoices for all to authenticated
358-  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));
359-

2026-04-21T18:01:49.272758Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"auth.getUser\\(|yagiAdminRows|showPrint|mock_badge|mock_banner_title|mock_banner_body|href={"'` src/app/[locale]/app/invoices/[id]/page.tsx'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"export async function issueInvoice|issueTaxInvoice\\(|invoice\\.status "'!== '"\\\"draft\\\"|invoiceNumber|from\\(\\\"invoices\\\"\\)\\.update|status: \\\"issued\\\"|eq\\(\\\"status\\\", \\\"draft\\\"\\)|sendInvoiceIssuedEmail|getPopbillMode\\(\\) === \\\"mock\\\"|race_already_issued\" src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"auth.getUser\\(|yagiAdminRows|showPrint|mock_badge|mock_banner_title|mock_banner_body|href={"'` src/app/[locale]/app/invoices/[id]/page.tsx' in C:\Users\yout4\yagi-studio\yagi-workshop
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"auth.getUser\\(|yagiAdminRows|showPrint|mock_badge|mock_banner_title|mock_banner_body|href={"'` src/app/[locale]/app/invoices/[id]/page.tsx'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"auth.getUser\\(|from\\(\\\"invoices\\\"\\)|isMock|mock-watermark|mock-banner|redirect\\(|PrintButton|Link href|invoice\\.status === \\\"draft\\\"\" src/app/[locale]/app/invoices/[id]/print/page.tsx" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"mock_badge|mock_section_title|kpi_mock_label|eq\\(\\\"is_mock\\\", true\\)|in\\(\\\"status\\\", \\[\\\"issued\\\", \\\"paid\\\"\\]\\)\" src/app/[locale]/app/admin/invoices/page.tsx src/app/[locale]/app/invoices/page.tsx" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 3 \"InvoiceEditor|mock_banner_title|mock_banner_body|ActionFooter|issueInvoice\\(|markPaid\\(|voidInvoice\\(|buyerRegistrationMissing|editable = isDraft && isYagiAdmin\" src/components/invoices/invoice-editor.tsx" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -C 3 "authAndAdminGate|loadInvoiceForEdit|status !== '"\\\"draft\\\"|from\\(\\\"invoice_line_items\\\"\\)\\.insert|from\\(\\\"invoice_line_items\\\"\\)\\.update|from\\(\\\"invoice_line_items\\\"\\)\\.delete|bulkAddFromSuggestions|fetchSuggestions|suggestLineItems\" src/app/[locale]/app/invoices/[id]/line-item-actions.ts src/lib/invoices/suggest-line-items.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:01:49.963435Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.7 seconds
Output:
rg: regex parse error:
    (?:export async function issueInvoice|issueTaxInvoice\(|invoice\.status !== " draft\|invoiceNumber|from\(\invoices\\)\.update|status:)
                                                                                                             ^^
error: unrecognized escape sequence

 exited 1 in 696ms:
rg: regex parse error:
    (?:export async function issueInvoice|issueTaxInvoice\(|invoice\.status !== " draft\|invoiceNumber|from\(\invoices\\)\.update|status:)
                                                                                                             ^^
error: unrecognized escape sequence

2026-04-21T18:01:49.984406Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:
rg: regex parse error:
    (?:mock_badge|mock_section_title|kpi_mock_label|eq\(\)
    ^
error: unclosed group

 exited 1 in 630ms:
rg: regex parse error:
    (?:mock_badge|mock_section_title|kpi_mock_label|eq\(\)
    ^
error: unclosed group

 succeeded in 630ms:
125-
126-type PopbillMode = "mock" | "test" | "production";
127-
128:interface InvoiceEditorProps {
129-  invoice: InvoiceRow;
130-  lineItems: LineItemRow[];
131-  supplier: SupplierInfo | null;
--
636-
637-// ─── Action footer (issue / markPaid / void) ─────────────────────────────────
638-
639:interface ActionFooterProps {
640-  invoice: InvoiceRow;
641:  buyerRegistrationMissing: boolean;
642-}
643-
644:function ActionFooter({ invoice, buyerRegistrationMissing }: ActionFooterProps) {
645-  const t = useTranslations("invoices");
646-  const tCommon = useTranslations("common");
647-  const router = useRouter();
--
650-
651-  function handleIssue() {
652-    startTransition(async () => {
653:      const result = await issueInvoice(invoice.id);
654-      if (!result.ok) {
655-        const missing =
656-          "missing_fields" in result && result.missing_fields
--
670-
671-  function handleMarkPaid() {
672-    startTransition(async () => {
673:      const result = await markPaid(invoice.id);
674-      if (!result.ok) {
675-        toast.error(t("mark_paid_failed"), { description: result.error });
676-        return;
--
682-
683-  function handleVoid() {
684-    startTransition(async () => {
685:      const result = await voidInvoice(
686-        invoice.id,
687-        voidReason.length > 0 ? voidReason : undefined
688-      );
--
710-            <AlertDialogTrigger asChild>
711-              <Button
712-                type="button"
713:                disabled={isPending || buyerRegistrationMissing}
714-                className="rounded-full uppercase tracking-[0.12em] px-6 py-2.5 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
715-              >
716-                {isPending ? (
--
804-
805-// ─── Main editor ─────────────────────────────────────────────────────────────
806-
807:export function InvoiceEditor({
808-  invoice,
809-  lineItems: initialLineItems,
810-  supplier,
811-  buyer,
812-  isYagiAdmin,
813-  popbillMode,
814:}: InvoiceEditorProps) {
815-  const t = useTranslations("invoices");
816-  const router = useRouter();
817-  const [lineItems, setLineItems] = useState<LineItemRow[]>(initialLineItems);
818-  const [isReordering, startReorder] = useTransition();
819-
820-  const isDraft = invoice.status === "draft";
821:  const editable = isDraft && isYagiAdmin;
822-
823:  const buyerRegistrationMissing = useMemo(
824-    () => !buyer.business_registration_number,
825-    [buyer]
826-  );
--
860-      {invoice.is_mock && (
861-        <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 px-4 py-3">
862-          <p className="font-semibold text-sm keep-all">
863:            {t("mock_banner_title")}
864-          </p>
865:          <p className="text-xs mt-1 keep-all">{t("mock_banner_body")}</p>
866-          {popbillMode !== "mock" && (
867-            <p className="text-[11px] mt-1 opacity-70">
868-              (current mode: {popbillMode})
--
872-      )}
873-
874-      {/* Buyer registration warning */}
875:      {isDraft && buyerRegistrationMissing && (
876-        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm keep-all flex items-start gap-2">
877-          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
878-          <span>
--
1121-
1122-      {/* Sticky action footer (yagi admin only) */}
1123-      {isYagiAdmin && (
1124:        <ActionFooter
1125-          invoice={invoice}
1126:          buyerRegistrationMissing={buyerRegistrationMissing}
1127-        />
1128-      )}
1129-    </div>

2026-04-21T18:01:49.995604Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.7 seconds
Output:
rg: regex parse error:
    (?:auth.getUser\(|from\(\)
    ^
error: unclosed group

 exited 1 in 650ms:
rg: regex parse error:
    (?:auth.getUser\(|from\(\)
    ^
error: unclosed group

2026-04-21T18:01:50.000956Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:
rg: regex parse error:
    (?:authAndAdminGate|loadInvoiceForEdit|status !== " draft\|from\(\invoice_line_items\\)\.insert|from\(\invoice_line_items\\)\.update|from\(\invoice_line_items\\)\.delete|bulkAddFromSuggestions|fetchSuggestions|suggestLineItems src/app/[locale]/app/invoices/[id]/line-item-actions.ts src/lib/invoices/suggest-line-items.ts)
                                                                     ^^
error: unrecognized escape sequence

 exited 1 in 637ms:
rg: regex parse error:
    (?:authAndAdminGate|loadInvoiceForEdit|status !== " draft\|from\(\invoice_line_items\\)\.insert|from\(\invoice_line_items\\)\.update|from\(\invoice_line_items\\)\.delete|bulkAddFromSuggestions|fetchSuggestions|suggestLineItems src/app/[locale]/app/invoices/[id]/line-item-actions.ts src/lib/invoices/suggest-line-items.ts)
                                                                     ^^
error: unrecognized escape sequence

codex
I’m narrowing this to the exact lines now. The remaining question is whether the schema file actually contains the Phase 1.5 `is_mock`/line-item/RLS changes the app depends on; if it doesn’t, that’s a release blocker on its own because the code path assumes protections and columns that the migration may not create.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -F "export async function issueInvoice" src/app/[locale]/app/invoices/[id]/actions.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -F "issueTaxInvoice({" src/app/[locale]/app/invoices/[id]/actions.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -F "if (invoice.status !== '"\\\"draft\\\")\" src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -F "const invoiceNumber =" src/app/[locale]/app/invoices/[id]/actions.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -F \".eq(\\\"status\\\", \\\"draft\\\")\" src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -F "sendInvoiceIssuedEmail(invoiceId)" src/app/[locale]/app/invoices/[id]/actions.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 455ms:
25:export async function issueInvoice(

 succeeded in 481ms:
97:  const popbillResult = await issueTaxInvoice({

 succeeded in 513ms:
109:  const invoiceNumber =

 succeeded in 527ms:
145:  sendInvoiceIssuedEmail(invoiceId).catch((err) => {

2026-04-21T18:02:04.557014Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
rg: status\, \draft\): 지정된 경로를 찾을 수 없습니다. (os error 3)

 exited 1 in 539ms:
rg: status\, \draft\): 지정된 경로를 찾을 수 없습니다. (os error 3)

2026-04-21T18:02:04.584860Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:

 exited 1 in 571ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -F \"return { ok: false, error: \\\"not_draft\\\" }\" src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -F \"status: \\\"issued\\\"\" src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -F \"is_mock: getPopbillMode() === \\\"mock\\\"\" src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n -F "race_already_issued" src/app/[locale]/app/invoices/[id]/actions.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -F \"eq(\\\"status\\\", \\\"draft\\\")\" --fixed-strings src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -F \"from(\\\"invoices\\\")\" src/app/[locale]/app/invoices/[id]/actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:02:14.711122Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: } src/app/[locale]/app/invoices/[id]/actions.ts: IO error for operation on } src/app/[locale]/app/invoices/[id]/actions.ts: 지정된 경로를 찾을 수 없습니다. (os error 3)

 exited 1 in 358ms:
rg: } src/app/[locale]/app/invoices/[id]/actions.ts: IO error for operation on } src/app/[locale]/app/invoices/[id]/actions.ts: 지정된 경로를 찾을 수 없습니다. (os error 3)

2026-04-21T18:02:14.775299Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 422ms:
 succeeded in 404ms:
140:    return { ok: false, error: "race_already_issued" };

2026-04-21T18:02:14.868905Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: invoices\): 지정된 경로를 찾을 수 없습니다. (os error 3)

 exited 1 in 435ms:
rg: invoices\): 지정된 경로를 찾을 수 없습니다. (os error 3)

 exited 1 in 436ms:
rg: status\, \draft\): 지정된 경로를 찾을 수 없습니다. (os error 3)

2026-04-21T18:02:14.869254Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: status\, \draft\): 지정된 경로를 찾을 수 없습니다. (os error 3)

2026-04-21T18:02:14.878342Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 449ms:
2026-04-21T18:02:20.797337Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -LiteralPath 'src/app/[locale]/app/invoices/[id]/actions.ts' -Pattern 'status: \"issued\"','if (invoice.status "'!== "draft")'"','.eq(\"status\", \"draft\")','is_mock: getPopbillMode() === \"mock\"' -Context 2,2"` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -LiteralPath 'src/app/[locale]/app/invoices/[id]/actions.ts' -Pattern 'status: \"issued\"','if (invoice.status "'!== "draft")'"','.eq(\"status\", \"draft\")','is_mock: getPopbillMode() === \"mock\"' -Context 2,2" in C:\Users\yout4\yagi-studio\yagi-workshop
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -LiteralPath 'src/app/[locale]/app/invoices/[id]/actions.ts' -Pattern 'status: \"issued\"','if (invoice.status "'!== "draft")'"','.eq(\"status\", \"draft\")','is_mock: getPopbillMode() === \"mock\"' -Context 2,2"` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command 'findstr /n /c:"if (invoice.status !== '"\\\"draft\\\")\" \"src\\app\\[locale]\\app\\invoices\\[id]\\actions.ts\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command "findstr /n /c:\"status: \\\"issued\\\"\" \"src\\app\\[locale]\\app\\invoices\\[id]\\actions.ts\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command "findstr /n /c:\".eq(\\\"status\\\", \\\"draft\\\")\" \"src\\app\\[locale]\\app\\invoices\\[id]\\actions.ts\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command "findstr /n /c:\"is_mock: getPopbillMode() === \\\"mock\\\"\" \"src\\app\\[locale]\\app\\invoices\\[id]\\actions.ts\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command "findstr /n /c:\"mock_badge\" \"src\\app\\[locale]\\app\\invoices\\[id]\\page.tsx\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command "findstr /n /c:\"mock_banner_title\" \"src\\components\\invoices\\invoice-editor.tsx\"" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:02:32.924701Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 379ms:
 exited 1 in 375ms:
2026-04-21T18:02:32.925019Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

2026-04-21T18:02:32.984193Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 358ms:
2026-04-21T18:02:33.001729Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 375ms:
 succeeded in 381ms:
271:                {t("mock_badge")}

 succeeded in 387ms:
863:            {t("mock_banner_title")}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'if \\(invoice\\.status "'!== "draft"'"\\)' 'src/app/[locale]/app/invoices/[id]/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'status: \"issued\"' 'src/app/[locale]/app/invoices/[id]/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n '\\.eq\\(\"status\", \"draft\"\\)' 'src/app/[locale]/app/invoices/[id]/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'is_mock: getPopbillMode\\(\\) === \"mock\"' 'src/app/[locale]/app/invoices/[id]/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'mock_badge' 'src/app/[locale]/app/invoices/[id]/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'mock_banner_title' 'src/components/invoices/invoice-editor.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:02:45.126502Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 407ms:
 exited 1 in 406ms:
2026-04-21T18:02:45.127049Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

2026-04-21T18:02:45.196991Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 397ms:
2026-04-21T18:02:45.216333Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 414ms:
 succeeded in 418ms:
271:                {t("mock_badge")}

 succeeded in 431ms:
863:            {t("mock_banner_title")}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'not_draft|issueTaxInvoice|invoiceNumber|race_already_issued|sendInvoiceIssuedEmail|getPopbillMode' 'src/app/[locale]/app/invoices/[id]/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'auth.getUser|showPrint|mock_badge|Printer|href=' 'src/app/[locale]/app/invoices/[id]/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'auth.getUser|from\\(\"invoices\"\\)|mock-watermark|mock-banner|PrintButton|redirect|notFound' 'src/app/[locale]/app/invoices/[id]/print/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'kpi_mock_label|mock_section_title|mock_badge|is_mock' 'src/app/[locale]/app/admin/invoices/page.tsx' 'src/app/[locale]/app/invoices/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'authAndAdminGate|loadInvoiceForEdit|not_draft|bulkAddFromSuggestions|fetchSuggestions|suggestLineItems|already_billed' 'src/app/[locale]/app/invoices/[id]/line-item-actions.ts' 'src/lib/invoices/suggest-line-items.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 378ms:
7:import { issueTaxInvoice, getPopbillMode } from "@/lib/popbill/client";
8:import { sendInvoiceIssuedEmail } from "@/lib/invoices/issue-email";
52:  if (invoice.status !== "draft") return { ok: false, error: "not_draft" };
97:  const popbillResult = await issueTaxInvoice({
109:  const invoiceNumber =
123:      is_mock: getPopbillMode() === "mock",
124:      invoice_number: invoiceNumber,
140:    return { ok: false, error: "race_already_issued" };
145:  sendInvoiceIssuedEmail(invoiceId).catch((err) => {

 succeeded in 384ms:
4:import { ChevronLeft, Printer } from "lucide-react";
51:  } = await supabase.auth.getUser();
228:  const showPrint = status === "issued" || status === "paid" || status === "void";
235:          href="/app/invoices"
271:                {t("mock_badge")}
274:            {showPrint && (
276:                href={`/${locale}/app/invoices/${id}/print`}
281:                <Printer className="w-3 h-3" />

 succeeded in 380ms:
src/app/[locale]/app/admin/invoices/page.tsx:19:  is_mock: boolean;
src/app/[locale]/app/admin/invoices/page.tsx:80:  is_mock: boolean;
src/app/[locale]/app/admin/invoices/page.tsx:91:    is_mock: row.is_mock,
src/app/[locale]/app/admin/invoices/page.tsx:137:      .eq("is_mock", true)
src/app/[locale]/app/admin/invoices/page.tsx:173:        is_mock,
src/app/[locale]/app/admin/invoices/page.tsx:178:      .eq("is_mock", true)
src/app/[locale]/app/admin/invoices/page.tsx:194:        is_mock,
src/app/[locale]/app/admin/invoices/page.tsx:326:              {t("kpi_mock_label")}
src/app/[locale]/app/admin/invoices/page.tsx:414:            {t("mock_section_title")}
src/app/[locale]/app/admin/invoices/page.tsx:495:                            {tInvoices("mock_badge")}
src/app/[locale]/app/invoices/page.tsx:21:  is_mock: boolean;
src/app/[locale]/app/invoices/page.tsx:91:      is_mock,
src/app/[locale]/app/invoices/page.tsx:132:      is_mock: row.is_mock,
src/app/[locale]/app/invoices/page.tsx:310:                      {inv.is_mock && (
src/app/[locale]/app/invoices/page.tsx:315:                          {t("mock_badge")}

 succeeded in 384ms:
2:import { notFound } from "next/navigation";
4:import { Link, redirect } from "@/i18n/routing";
6:import { PrintButton } from "@/components/invoices/print-button";
46:    notFound();
54:  } = await supabase.auth.getUser();
56:    redirect({ href: "/signin", locale });
67:    notFound();
305:        .mock-banner {
314:        .mock-banner .title { font-weight: 700; margin-bottom: 2px; }
315:        .mock-banner .body { font-size: 12px; }
316:        .mock-watermark {
338:          <PrintButton label={t("print_button")} />
343:            <div className="mock-watermark" aria-hidden="true">
350:              <div className="mock-banner">

 succeeded in 392ms:
src/lib/invoices/suggest-line-items.ts:13:  already_billed: boolean;
src/lib/invoices/suggest-line-items.ts:35: * `already_billed` is true if the source already appears in an invoice_line_item
src/lib/invoices/suggest-line-items.ts:38:export async function suggestLineItems(
src/lib/invoices/suggest-line-items.ts:119:      already_billed: billedSet.has(`meeting:${m.id}`),
src/lib/invoices/suggest-line-items.ts:131:      already_billed: billedSet.has(`storyboard:${b.id}`),
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:7:  suggestLineItems,
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:22:async function loadInvoiceForEdit(
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:32:  if (invoice.status !== "draft") return { ok: false, error: "not_draft" };
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:36:async function authAndAdminGate(): Promise<
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:85:  const authResult = await authAndAdminGate();
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:89:  const invResult = await loadInvoiceForEdit(supabase, invoiceId);
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:156:  const authResult = await authAndAdminGate();
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:174:  if (status !== "draft") return { ok: false, error: "not_draft" };
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:230:  const authResult = await authAndAdminGate();
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:247:  if (status !== "draft") return { ok: false, error: "not_draft" };
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:277:  const authResult = await authAndAdminGate();
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:281:  const invResult = await loadInvoiceForEdit(supabase, invoiceId);
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:301:// ─── bulkAddFromSuggestions ──────────────────────────────────────────────────
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:310:  already_billed: z.boolean(),
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:318:export async function bulkAddFromSuggestions(
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:325:  const authResult = await authAndAdminGate();
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:329:  const invResult = await loadInvoiceForEdit(supabase, invoiceId);
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:360:    console.error("[invoices] bulkAddFromSuggestions failed", error.message);
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:368:// ─── fetchSuggestions (server action wrapper around suggestLineItems) ────────
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:376:export async function fetchSuggestions(input: {
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:386:  const authResult = await authAndAdminGate();
src/app/[locale]/app/invoices/[id]/line-item-actions.ts:389:  const items = await suggestLineItems(parsed.data.projectId, {

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "supplier_profile|invoice_line_items|recalc_invoice_totals|is_mock|popbill_mgt_key|nts_approval_number" supabase/migrations src/lib src/app src/components' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'buildTaxinvoice|TOTALS_MISMATCH|business_registration_number|invoice.lineItems|sumSupply|sumTax|popbill_mgt_key|writeDate' 'src/lib/popbill/build-taxinvoice.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'siteUrl|printUrl|escapeHtml|subject =|mockBanner|mockWarningText|resend.emails.send' 'src/lib/invoices/issue-email.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'const mode|NEXT_PUBLIC_VERCEL_ENV|throw new Error|issueTaxInvoice|mockIssueTaxInvoice|popbill_mgt_key|nts_approval_number|isPopbillConfigured' 'src/lib/popbill/client.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 347ms:
16:  writeDate?: string;
27: * - Supplier: business_registration_number (10 digits), corporate_name, representative_name, address, contact_email
28: * - Buyer: business_registration_number, representative_name, business_address, tax_invoice_email
34:export function buildTaxinvoice(args: BuildArgs): BuildResult {
38:  if (!args.supplier.business_registration_number?.match(/^\d{10}$/)) {
39:    missing.push("supplier.business_registration_number");
47:  if (!args.buyer.business_registration_number?.match(/^\d{10}$/)) {
48:    missing.push("buyer.business_registration_number");
54:  if (args.lineItems.length === 0) missing.push("invoice.lineItems");
61:  const writeDate =
62:    args.writeDate ??
70:    purchaseDT: writeDate,
81:  const sumSupply = args.lineItems.reduce((a, li) => a + li.supply_krw, 0);
82:  const sumTax = args.lineItems.reduce((a, li) => a + li.vat_krw, 0);
83:  if (sumSupply !== args.invoice.subtotal_krw) {
84:    return { ok: false, error_code: "TOTALS_MISMATCH" };
86:  if (sumTax !== args.invoice.vat_krw) {
87:    return { ok: false, error_code: "TOTALS_MISMATCH" };
92:    args.invoice.popbill_mgt_key ??
96:    writeDate,
102:    invoicerCorpNum: args.supplier.business_registration_number!,
113:    invoiceeCorpNum: args.buyer.business_registration_number!,

 succeeded in 357ms:
src/components\invoices\invoice-editor.tsx:88:  is_mock: boolean;
src/components\invoices\invoice-editor.tsx:90:  nts_approval_number: string | null;
src/components\invoices\invoice-editor.tsx:860:      {invoice.is_mock && (
src/components\invoices\invoice-editor.tsx:966:              {invoice.nts_approval_number && (
src/components\invoices\invoice-editor.tsx:969:                    {t("nts_approval_number_label")}:
src/components\invoices\invoice-editor.tsx:972:                    {invoice.nts_approval_number}
src/lib\invoices\suggest-line-items.ts:31: * The unit_price_krw comes from supplier_profile.default_rates JSON
src/lib\invoices\suggest-line-items.ts:44:  // 1. Look up default rates from supplier_profile (single-row table)
src/lib\invoices\suggest-line-items.ts:46:    .from("supplier_profile")
src/lib\invoices\suggest-line-items.ts:89:      .from("invoice_line_items")
src/lib\invoices\issue-email.ts:27:      "id, status, invoice_number, nts_approval_number, supply_date, due_date, subtotal_krw, vat_krw, total_krw, is_mock, project_id, workspace_id, supplier_id",
src/lib\invoices\issue-email.ts:60:      .from("supplier_profile")
src/lib\invoices\issue-email.ts:94:  const subject = invoice.is_mock
src/lib\invoices\issue-email.ts:98:  const mockBanner = invoice.is_mock
src/lib\invoices\issue-email.ts:111:  <tr><td>국세청 승인번호</td><td>${escapeHtml(invoice.nts_approval_number ?? "—")}</td></tr>
src/lib\invoices\issue-email.ts:124:  const mockWarningText = invoice.is_mock
src/lib\invoices\issue-email.ts:132:    `NTS Approval Number: ${invoice.nts_approval_number ?? "-"}\n` +
src/lib\popbill\client.ts:75:      nts_approval_number: string;   // 국세청 승인번호
src/lib\popbill\client.ts:76:      popbill_mgt_key: string;
src/lib\popbill\client.ts:121:    nts_approval_number: `MOCK-${ymd}-${random}`,
src/lib\popbill\client.ts:122:    popbill_mgt_key: `mock-${args.invoice_id}`,
src/lib\popbill\build-taxinvoice.ts:5:export type SupplierProfileRow = Tables<"supplier_profile">;
src/lib\popbill\build-taxinvoice.ts:8:export type InvoiceLineItemRow = Tables<"invoice_line_items">;
src/lib\popbill\build-taxinvoice.ts:92:    args.invoice.popbill_mgt_key ??
src/lib\supabase\database.types.ts:64:      invoice_line_items: {
src/lib\supabase\database.types.ts:112:            foreignKeyName: "invoice_line_items_invoice_id_fkey"
src/lib\supabase\database.types.ts:128:          is_mock: boolean
src/lib\supabase\database.types.ts:131:          nts_approval_number: string | null
src/lib\supabase\database.types.ts:133:          popbill_mgt_key: string | null
src/lib\supabase\database.types.ts:154:          is_mock?: boolean
src/lib\supabase\database.types.ts:157:          nts_approval_number?: string | null
src/lib\supabase\database.types.ts:159:          popbill_mgt_key?: string | null
src/lib\supabase\database.types.ts:180:          is_mock?: boolean
src/lib\supabase\database.types.ts:183:          nts_approval_number?: string | null
src/lib\supabase\database.types.ts:185:          popbill_mgt_key?: string | null
src/lib\supabase\database.types.ts:211:            referencedRelation: "supplier_profile"
src/lib\supabase\database.types.ts:925:      supplier_profile: {
src/app\[locale]\app\invoices\actions.ts:46:    .from("supplier_profile")
src/app\[locale]\app\invoices\actions.ts:50:  if (!supplier) return { ok: false, error: "no_supplier_profile" };
src/app\[locale]\app\invoices\actions.ts:62:      is_mock: false, // becomes true at issue time if POPBILL_MODE=mock
src/app\[locale]\app\invoices\[id]\actions.ts:56:    .from("supplier_profile")
src/app\[locale]\app\invoices\[id]\actions.ts:60:  if (!supplier) return { ok: false, error: "no_supplier_profile" };
src/app\[locale]\app\invoices\[id]\actions.ts:72:    .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\actions.ts:120:      popbill_mgt_key: popbillResult.popbill_mgt_key,
src/app\[locale]\app\invoices\[id]\actions.ts:121:      nts_approval_number: popbillResult.nts_approval_number,
src/app\[locale]\app\invoices\[id]\actions.ts:123:      is_mock: getPopbillMode() === "mock",
src/app\[locale]\app\invoices\[id]\actions.ts:138:      { invoiceId, popbill_mgt_key: popbillResult.popbill_mgt_key }
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:101:      .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:111:    .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:162:    .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:209:    .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:235:    .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:250:    .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:287:      .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:334:    .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:358:  const { error } = await supabase.from("invoice_line_items").insert(rows);
src/app\[locale]\app\invoices\page.tsx:21:  is_mock: boolean;
src/app\[locale]\app\invoices\page.tsx:91:      is_mock,
src/app\[locale]\app\invoices\page.tsx:132:      is_mock: row.is_mock,
src/app\[locale]\app\invoices\page.tsx:310:                      {inv.is_mock && (
src/app\[locale]\app\invoices\[id]\page.tsx:158:    .from("supplier_profile")
src/app\[locale]\app\invoices\[id]\page.tsx:165:    .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\page.tsx:221:    is_mock: invoiceRow.is_mock,
src/app\[locale]\app\invoices\[id]\page.tsx:223:    nts_approval_number: invoiceRow.nts_approval_number,
src/app\[locale]\app\invoices\[id]\page.tsx:266:            {invoiceRow.is_mock && (
src/app\[locale]\app\invoices\[id]\print\page.tsx:85:      .from("supplier_profile")
src/app\[locale]\app\invoices\[id]\print\page.tsx:90:      .from("invoice_line_items")
src/app\[locale]\app\invoices\[id]\print\page.tsx:102:  const isMock = invoice.is_mock === true;
src/app\[locale]\app\invoices\[id]\print\page.tsx:373:                {invoice.nts_approval_number && (
src/app\[locale]\app\invoices\[id]\print\page.tsx:377:                      {invoice.nts_approval_number}
src/app\[locale]\app\admin\invoices\page.tsx:19:  is_mock: boolean;
src/app\[locale]\app\admin\invoices\page.tsx:80:  is_mock: boolean;
src/app\[locale]\app\admin\invoices\page.tsx:91:    is_mock: row.is_mock,
src/app\[locale]\app\admin\invoices\page.tsx:137:      .eq("is_mock", true)
src/app\[locale]\app\admin\invoices\page.tsx:173:        is_mock,
src/app\[locale]\app\admin\invoices\page.tsx:178:      .eq("is_mock", true)
src/app\[locale]\app\admin\invoices\page.tsx:194:        is_mock,

 succeeded in 325ms:
5:function escapeHtml(s: string): string {
91:  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
92:  const printUrl = `${siteUrl}/ko/app/invoices/${invoice.id}/print`;
94:  const subject = invoice.is_mock
98:  const mockBanner = invoice.is_mock
106:<p>안녕하세요, <strong>${escapeHtml(buyerName)}</strong> 담당자님.</p>
107:<p><strong>${escapeHtml(supplierName)}</strong>에서 세금계산서를 발행하였습니다.</p>
108:${mockBanner}
110:  <tr><td>송장 번호</td><td>${escapeHtml(invoice.invoice_number ?? "—")}</td></tr>
111:  <tr><td>국세청 승인번호</td><td>${escapeHtml(invoice.nts_approval_number ?? "—")}</td></tr>
112:  <tr><td>프로젝트</td><td>${escapeHtml(projectTitle)}</td></tr>
113:  <tr><td>공급일자</td><td>${escapeHtml(invoice.supply_date)}</td></tr>
114:  <tr><td>결제기한</td><td>${escapeHtml(invoice.due_date ?? "—")}</td></tr>
115:  <tr><td>공급가액</td><td>${escapeHtml(formatKRW(invoice.subtotal_krw))}</td></tr>
116:  <tr><td>부가세</td><td>${escapeHtml(formatKRW(invoice.vat_krw))}</td></tr>
117:  <tr><td><strong>합계</strong></td><td><strong>${escapeHtml(formatKRW(invoice.total_krw))}</strong></td></tr>
119:<p style="margin:24px 0"><a href="${escapeHtml(printUrl)}" style="display:inline-block;background:#000;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">세금계산서 PDF 보기 →</a></p>
121:  문의사항이 있으시면 ${escapeHtml(supplierContactEmail)} 로 회신해 주세요.
124:  const mockWarningText = invoice.is_mock
130:    mockWarningText +
139:    `${printUrl}\n\n` +
143:    await resend.emails.send({

 succeeded in 323ms:
5:const mode: PopbillMode = ((process.env.POPBILL_MODE ?? "test") as PopbillMode);
9:if (mode === "mock" && process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
10:  throw new Error(
75:      nts_approval_number: string;   // 국세청 승인번호
76:      popbill_mgt_key: string;
88:export function isPopbillConfigured(): boolean {
97:export async function issueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
98:  if (mode === "mock") return mockIssueTaxInvoice(args);
110:async function mockIssueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
121:    nts_approval_number: `MOCK-${ymd}-${random}`,
122:    popbill_mgt_key: `mock-${args.invoice_id}`,

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'RLS handles visibility|non-yagi sees only non-draft/non-mock rows|isYagiAdmin|from\\(\"user_roles\"\\)|from\\(\"invoices\"\\)' 'src/app/[locale]/app/invoices/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'invoices_read|invoices_yagi_write|using \\(public.is_ws_member\\(auth.uid\\(\\), workspace_id\\) or public.is_yagi_admin\\(auth.uid\\(\\)\\)\\)' 'supabase/migrations/20260421094855_phase1_schema.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'create table public.invoices|invoice_number text unique not null|status text not null default|tax_invoice_issued|amount numeric' 'supabase/migrations/20260421094855_phase1_schema.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'supplier_profile|invoice_line_items|recalc_invoice_totals|is_mock|popbill_response|filed_at' 'supabase/migrations/20260421094855_phase1_schema.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 350ms:
77:  const isYagiAdmin = !!(yagiAdminRows && yagiAdminRows.length > 0);
79:  // RLS handles visibility (non-yagi sees only non-draft/non-mock rows)
166:        {isYagiAdmin && (
231:          {isYagiAdmin && (

 succeeded in 372ms:
281:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
289:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
311:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
315:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
355:create policy "invoices_read" on public.invoices for select to authenticated
356:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
357:create policy "invoices_yagi_write" on public.invoices for all to authenticated

 succeeded in 364ms:
100:  status text not null default 'draft' check (status in (
157:  status text not null default 'submitted' check (status in ('submitted', 'changes_requested', 'approved')),
171:  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
177:create table public.invoices (
181:  invoice_number text unique not null,
182:  amount numeric(14, 2) not null,
187:  status text not null default 'issued' check (status in ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
189:  tax_invoice_issued boolean not null default false,
190:  tax_invoice_issued_at timestamptz,

2026-04-21T18:03:25.609027Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 373ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "supplier_profile|invoice_line_items|recalc_invoice_totals|is_mock|popbill_response|filed_at|nts_approval_number|popbill_mgt_key" supabase/migrations' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:03:33.011317Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.3 seconds
Output:

 exited 1 in 285ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/lib/supabase/server.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/lib/supabase/service.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path 'src/lib/resend.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 311ms:
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (read-only cookies) ??ignore.
          }
        },
      },
    }
  );
}

 succeeded in 310ms:
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

let admin: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseService() {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

 succeeded in 292ms:
import "server-only";
import { Resend } from "resend";

let client: Resend | null | undefined;

export function getResend(): Resend | null {
  if (client !== undefined) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[resend] RESEND_API_KEY not set ??email disabled");
    client = null;
    return null;
  }
  client = new Resend(key);
  return client;
}

// The "from" address used for all outbound mail in Phase 1.2.
// Adjust via env later when a verified sending domain is wired up.
export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL ?? "YAGI Workshop <noreply@yagiworkshop.xyz>";

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'sumSupply|sumTax|TOTALS_MISMATCH|totalAmount: String\\(args\\.invoice\\.total_krw\\)|supplyCostTotal: String\\(args\\.invoice\\.subtotal_krw\\)|taxTotal: String\\(args\\.invoice\\.vat_krw\\)' 'src/lib/popbill/build-taxinvoice.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'mock-\\"'$'"\\{args\\.invoice_id\\}|MOCK-\\"'$'"\\{ymd\\}-\\"'$'"\\{random\\}|const random|const ymd' 'src/lib/popbill/client.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'args\\.invoice\\.popbill_mgt_key|INV-\\"'$'"\\{args\\.invoice\\.id\\.slice\\(0, 8\\)\\}-\\"'$'"\\{Date\\.now\\(\\)\\.toString\\(36\\)\\}' 'src/lib/popbill/build-taxinvoice.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'const popbillResult = await issueTaxInvoice|const \\{ data: updated, error: updateErr \\} = await supabase|race_already_issued' 'src/app/[locale]/app/invoices/[id]/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'mock-banner|mock-watermark|auth.getUser|redirect\\(|from\\(\"invoices\"\\)|PrintButton' 'src/app/[locale]/app/invoices/[id]/print/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'mock_banner_title|mock_badge|is_mock|showPrint' 'src/app/[locale]/app/invoices/[id]/page.tsx' 'src/components/invoices/invoice-editor.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 411ms:
81:  const sumSupply = args.lineItems.reduce((a, li) => a + li.supply_krw, 0);
82:  const sumTax = args.lineItems.reduce((a, li) => a + li.vat_krw, 0);
83:  if (sumSupply !== args.invoice.subtotal_krw) {
84:    return { ok: false, error_code: "TOTALS_MISMATCH" };
86:  if (sumTax !== args.invoice.vat_krw) {
87:    return { ok: false, error_code: "TOTALS_MISMATCH" };
121:    supplyCostTotal: String(args.invoice.subtotal_krw),
122:    taxTotal: String(args.invoice.vat_krw),
123:    totalAmount: String(args.invoice.total_krw),

 succeeded in 425ms:
113:  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
114:  const random = Math.floor(Math.random() * 1_000_000)
121:    nts_approval_number: `MOCK-${ymd}-${random}`,
122:    popbill_mgt_key: `mock-${args.invoice_id}`,

 succeeded in 430ms:
92:    args.invoice.popbill_mgt_key ??
93:    `INV-${args.invoice.id.slice(0, 8)}-${Date.now().toString(36)}`;

 succeeded in 446ms:
97:  const popbillResult = await issueTaxInvoice({
114:  const { data: updated, error: updateErr } = await supabase
140:    return { ok: false, error: "race_already_issued" };
170:  const { data: updated, error: updateErr } = await supabase
212:  const { data: updated, error: updateErr } = await supabase

 succeeded in 458ms:
6:import { PrintButton } from "@/components/invoices/print-button";
54:  } = await supabase.auth.getUser();
56:    redirect({ href: "/signin", locale });
305:        .mock-banner {
314:        .mock-banner .title { font-weight: 700; margin-bottom: 2px; }
315:        .mock-banner .body { font-size: 12px; }
316:        .mock-watermark {
338:          <PrintButton label={t("print_button")} />
343:            <div className="mock-watermark" aria-hidden="true">
350:              <div className="mock-banner">

 succeeded in 468ms:
src/components/invoices/invoice-editor.tsx:88:  is_mock: boolean;
src/components/invoices/invoice-editor.tsx:860:      {invoice.is_mock && (
src/components/invoices/invoice-editor.tsx:863:            {t("mock_banner_title")}
src/app/[locale]/app/invoices/[id]/page.tsx:221:    is_mock: invoiceRow.is_mock,
src/app/[locale]/app/invoices/[id]/page.tsx:228:  const showPrint = status === "issued" || status === "paid" || status === "void";
src/app/[locale]/app/invoices/[id]/page.tsx:266:            {invoiceRow.is_mock && (
src/app/[locale]/app/invoices/[id]/page.tsx:271:                {t("mock_badge")}
src/app/[locale]/app/invoices/[id]/page.tsx:274:            {showPrint && (

codex
A more subtle correctness issue showed up while tracing issuance: the Popbill payload’s fallback `writeDate` is KST, but the DB `issue_date` and invoice number use raw UTC `toISOString()`. That can stamp the legal invoice one day behind around midnight in Seoul. I’m pinning those lines now because that’s the kind of production bug that creates accounting disputes, not just UI noise.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'const issueDate = new Date\\(\\)\\.toISOString\\(\\)\\.slice\\(0, 10\\)|invoiceNumber|issue_date: issueDate|filed_at:' 'src/app/[locale]/app/invoices/[id]/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'args\\.invoice\\.issue_date|todayKstYmd\\(|writeDate' 'src/lib/popbill/build-taxinvoice.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'yagiAdminRows|mock_section_title|kpi_mock_label|mock_badge|auth.getUser' 'src/app/[locale]/app/admin/invoices/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'redirect\\({ href: \"/signin\", locale }\\)|auth.getUser|from\\(\"invoices\"\\)|notFound\\(|mock-watermark|mock-banner' 'src/app/[locale]/app/invoices/[id]/print/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 504ms:
108:  const issueDate = new Date().toISOString().slice(0, 10);
109:  const invoiceNumber =
118:      issue_date: issueDate,
119:      filed_at: new Date().toISOString(),
124:      invoice_number: invoiceNumber,

 succeeded in 482ms:
16:  writeDate?: string;
61:  const writeDate =
62:    args.writeDate ??
63:    (args.invoice.issue_date
64:      ? args.invoice.issue_date.replace(/-/g, "")
65:      : todayKstYmd());
70:    purchaseDT: writeDate,
96:    writeDate,
132:function todayKstYmd(): string {

 succeeded in 508ms:
104:  } = await supabase.auth.getUser();
326:              {t("kpi_mock_label")}
414:            {t("mock_section_title")}
495:                            {tInvoices("mock_badge")}

2026-04-21T18:05:04.537261Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
rg: regex parse error:
    (?:redirect\({ href: /signin, locale }\)|auth.getUser|from\(invoices\)|notFound\(|mock-watermark|mock-banner)
                   ^
error: repetition quantifier expects a valid decimal

 exited 1 in 529ms:
rg: regex parse error:
    (?:redirect\({ href: /signin, locale }\)|auth.getUser|from\(invoices\)|notFound\(|mock-watermark|mock-banner)
                   ^
error: repetition quantifier expects a valid decimal

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'insert\\(|invoice_number|amount|status: \"draft\"|is_mock: false|supply_date|due_date|memo' 'src/app/[locale]/app/invoices/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:05:22.499551Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 24ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'invoice_number text unique not null|amount numeric\\(14, 2\\) not null|status text not null default ''issued''|tax_invoice_issued' 'supabase/migrations/20260421094855_phase1_schema.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:05:22.575094Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 21ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'status: \"draft\"|is_mock: false|supply_date:|due_date:|memo:' 'src/app/[locale]/app/invoices/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'invoice_number text unique not null|amount numeric\\(14, 2\\) not null|status text not null default .*issued|tax_invoice_issued boolean not null default false' 'supabase/migrations/20260421094855_phase1_schema.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:05:32.685333Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 21ms:
2026-04-21T18:05:32.695756Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 29ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'const siteUrl =|const printUrl =|const subject =|const mockBanner =|escapeHtml\\(' 'src/lib/invoices/issue-email.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'auth.getUser|redirect\\(|maybeSingle\\(|from\\(\"invoices\"\\)|from\\(\"invoice_line_items\"\\)' 'src/app/[locale]/app/invoices/[id]/print/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-04-21T18:05:32.759705Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 20ms:
2026-04-21T18:05:32.771020Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 30ms:
codex
## CRITICAL

[SEVERITY: CRITICAL] Phase 1.5 DB migration is not actually present
  File: supabase/migrations/20260421094855_phase1_schema.sql:177,355
  Issue: The scoped migration still defines the old `invoices` table (`invoice_number` required, `amount`, `issued_at`, `tax_invoice_issued`) and only old invoice RLS. It does not define `supplier_profile`, `invoice_line_items`, `is_mock`, `popbill_mgt_key`, `nts_approval_number`, `popbill_response`, or `recalc_invoice_totals` anywhere in `supabase/migrations`, while the app already depends on all of them.
  Impact: A fresh deploy will not match the code. Invoice creation/issuance will fail or run against the wrong schema, and the intended Phase 1.5 mock/draft protections cannot exist in the DB.
  Fix: Ship a real Phase 1.5 migration before release: create the missing tables/columns/triggers, add the intended RLS, and gate startup/deploy on schema version compatibility.

## HIGH

[SEVERITY: HIGH] Any workspace member can read mock and draft invoices
  File: supabase/migrations/20260421094855_phase1_schema.sql:355, src/app/[locale]/app/invoices/page.tsx:79
  Issue: `invoices_read` allows any `workspace_member` to select any invoice in the workspace. There is no restrictive policy hiding `is_mock=true` or `status='draft'`, even though the app assumes “RLS handles visibility (non-yagi sees only non-draft/non-mock rows)”.
  Impact: Non-YAGI customers can open mock or draft invoices on list/detail/print pages and see unfiled tax documents, mock NTS numbers, and internal billing state.
  Fix: Add restrictive `SELECT` RLS so non-yagi users can only see real customer-facing states, and explicitly hide `draft` and `is_mock=true` unless `is_yagi_admin(auth.uid())`.

[SEVERITY: HIGH] `issueInvoice` can double-file the same invoice
  File: src/app/[locale]/app/invoices/[id]/actions.ts:97,114,140; src/lib/popbill/build-taxinvoice.ts:92
  Issue: `issueTaxInvoice()` runs before any atomic DB transition. The only guard is the later `.eq("status","draft")` update, so two concurrent requests can both reach Popbill while the row is still draft. The builder also generates a fresh `invoicerMgtKey` when `popbill_mgt_key` is null, so retries are not idempotent.
  Impact: Two concurrent clicks or a retry after DB failure can create duplicate legal tax invoices externally while only one local row updates. That is a direct money/trust failure.
  Fix: Reserve a deterministic `popbill_mgt_key` in the DB first under an atomic lock/CAS, call Popbill with that persisted key, and make retries reuse the same key instead of minting a new one.

[SEVERITY: HIGH] Tax-invoice grand total is not validated
  File: src/lib/popbill/build-taxinvoice.ts:81,123
  Issue: The builder checks `subtotal_krw` and `vat_krw`, but never checks that `total_krw === subtotal_krw + vat_krw`. It then blindly sends `totalAmount` from `invoice.total_krw`.
  Impact: A drifted `total_krw` can produce a Popbill payload whose grand total does not equal supply plus VAT, causing rejection or issuance of a legally inconsistent invoice.
  Fix: Reject when `sumSupply + sumTax !== args.invoice.total_krw`, and derive `totalAmount` from the validated sums instead of trusting the row.

[SEVERITY: HIGH] UTC/KST mismatch can stamp invoices on the wrong day
  File: src/app/[locale]/app/invoices/[id]/actions.ts:108,118; src/lib/popbill/build-taxinvoice.ts:61,132
  Issue: `issueInvoice()` stores `issue_date` and builds `invoice_number` from `new Date().toISOString().slice(0, 10)` (UTC), but `buildTaxinvoice()` defaults `writeDate` to KST via `todayKstYmd()`. Around midnight Seoul time, the DB date can be one day behind the tax invoice write date actually sent to Popbill.
  Impact: Stored invoice metadata, invoice numbering, month filters, and the filed tax document can disagree. That is an accounting/audit correctness defect.
  Fix: Generate the issuance date once in KST, persist that, and feed the same date into Popbill payload generation and invoice numbering.

[SEVERITY: HIGH] Mock management keys are reusable in future production reissue flows
  File: src/lib/popbill/client.ts:122; src/lib/popbill/build-taxinvoice.ts:92
  Issue: Mock issuance persists `popbill_mgt_key = mock-<invoice_id>`, and the builder blindly reuses any existing `invoice.popbill_mgt_key`. There is no mode-aware replacement of mock keys.
  Impact: When mock-issued rows are later reset/reissued after switching to production, the real Popbill path can reuse a mock identifier, causing collisions or invalid production filings.
  Fix: Treat `mock-*` keys as non-reusable outside mock mode. Clear/replace them during reissue, or track mock issuance in a separate field/state.

## Mock-mode gate verdict
(a) Production rejection: PASS — `src/lib/popbill/client.ts:5-10` reads env at module load and throws immediately when `POPBILL_MODE=mock` and `NEXT_PUBLIC_VERCEL_ENV==="production"`.

(b) Visual distinction: PASS — invoice list has a mock badge, detail/editor has a red banner plus badge, print has banner + watermark, admin has mock KPI/list, and email adds a red disclosure banner plus `(MOCK)` in the subject.

(c) Mock→prod transition: FAIL — mock rows are listed for admins, but RLS does not hide them from non-yagi users, and persisted `mock-*` management keys are reusable in later production issuance flows.
tokens used
83,414
## CRITICAL

[SEVERITY: CRITICAL] Phase 1.5 DB migration is not actually present
  File: supabase/migrations/20260421094855_phase1_schema.sql:177,355
  Issue: The scoped migration still defines the old `invoices` table (`invoice_number` required, `amount`, `issued_at`, `tax_invoice_issued`) and only old invoice RLS. It does not define `supplier_profile`, `invoice_line_items`, `is_mock`, `popbill_mgt_key`, `nts_approval_number`, `popbill_response`, or `recalc_invoice_totals` anywhere in `supabase/migrations`, while the app already depends on all of them.
  Impact: A fresh deploy will not match the code. Invoice creation/issuance will fail or run against the wrong schema, and the intended Phase 1.5 mock/draft protections cannot exist in the DB.
  Fix: Ship a real Phase 1.5 migration before release: create the missing tables/columns/triggers, add the intended RLS, and gate startup/deploy on schema version compatibility.

## HIGH

[SEVERITY: HIGH] Any workspace member can read mock and draft invoices
  File: supabase/migrations/20260421094855_phase1_schema.sql:355, src/app/[locale]/app/invoices/page.tsx:79
  Issue: `invoices_read` allows any `workspace_member` to select any invoice in the workspace. There is no restrictive policy hiding `is_mock=true` or `status='draft'`, even though the app assumes “RLS handles visibility (non-yagi sees only non-draft/non-mock rows)”.
  Impact: Non-YAGI customers can open mock or draft invoices on list/detail/print pages and see unfiled tax documents, mock NTS numbers, and internal billing state.
  Fix: Add restrictive `SELECT` RLS so non-yagi users can only see real customer-facing states, and explicitly hide `draft` and `is_mock=true` unless `is_yagi_admin(auth.uid())`.

[SEVERITY: HIGH] `issueInvoice` can double-file the same invoice
  File: src/app/[locale]/app/invoices/[id]/actions.ts:97,114,140; src/lib/popbill/build-taxinvoice.ts:92
  Issue: `issueTaxInvoice()` runs before any atomic DB transition. The only guard is the later `.eq("status","draft")` update, so two concurrent requests can both reach Popbill while the row is still draft. The builder also generates a fresh `invoicerMgtKey` when `popbill_mgt_key` is null, so retries are not idempotent.
  Impact: Two concurrent clicks or a retry after DB failure can create duplicate legal tax invoices externally while only one local row updates. That is a direct money/trust failure.
  Fix: Reserve a deterministic `popbill_mgt_key` in the DB first under an atomic lock/CAS, call Popbill with that persisted key, and make retries reuse the same key instead of minting a new one.

[SEVERITY: HIGH] Tax-invoice grand total is not validated
  File: src/lib/popbill/build-taxinvoice.ts:81,123
  Issue: The builder checks `subtotal_krw` and `vat_krw`, but never checks that `total_krw === subtotal_krw + vat_krw`. It then blindly sends `totalAmount` from `invoice.total_krw`.
  Impact: A drifted `total_krw` can produce a Popbill payload whose grand total does not equal supply plus VAT, causing rejection or issuance of a legally inconsistent invoice.
  Fix: Reject when `sumSupply + sumTax !== args.invoice.total_krw`, and derive `totalAmount` from the validated sums instead of trusting the row.

[SEVERITY: HIGH] UTC/KST mismatch can stamp invoices on the wrong day
  File: src/app/[locale]/app/invoices/[id]/actions.ts:108,118; src/lib/popbill/build-taxinvoice.ts:61,132
  Issue: `issueInvoice()` stores `issue_date` and builds `invoice_number` from `new Date().toISOString().slice(0, 10)` (UTC), but `buildTaxinvoice()` defaults `writeDate` to KST via `todayKstYmd()`. Around midnight Seoul time, the DB date can be one day behind the tax invoice write date actually sent to Popbill.
  Impact: Stored invoice metadata, invoice numbering, month filters, and the filed tax document can disagree. That is an accounting/audit correctness defect.
  Fix: Generate the issuance date once in KST, persist that, and feed the same date into Popbill payload generation and invoice numbering.

[SEVERITY: HIGH] Mock management keys are reusable in future production reissue flows
  File: src/lib/popbill/client.ts:122; src/lib/popbill/build-taxinvoice.ts:92
  Issue: Mock issuance persists `popbill_mgt_key = mock-<invoice_id>`, and the builder blindly reuses any existing `invoice.popbill_mgt_key`. There is no mode-aware replacement of mock keys.
  Impact: When mock-issued rows are later reset/reissued after switching to production, the real Popbill path can reuse a mock identifier, causing collisions or invalid production filings.
  Fix: Treat `mock-*` keys as non-reusable outside mock mode. Clear/replace them during reissue, or track mock issuance in a separate field/state.

## Mock-mode gate verdict
(a) Production rejection: PASS — `src/lib/popbill/client.ts:5-10` reads env at module load and throws immediately when `POPBILL_MODE=mock` and `NEXT_PUBLIC_VERCEL_ENV==="production"`.

(b) Visual distinction: PASS — invoice list has a mock badge, detail/editor has a red banner plus badge, print has banner + watermark, admin has mock KPI/list, and email adds a red disclosure banner plus `(MOCK)` in the subject.

(c) Mock→prod transition: FAIL — mock rows are listed for admins, but RLS does not hide them from non-yagi users, and persisted `mock-*` management keys are reusable in later production issuance flows.
