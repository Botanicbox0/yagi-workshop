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
 * Map our DB rows to a 팝빌 Taxinvoice payload.
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

  // Verify totals add up — popbill rejects mismatched totals
  const sumSupply = args.lineItems.reduce((a, li) => a + li.supply_krw, 0);
  const sumTax = args.lineItems.reduce((a, li) => a + li.vat_krw, 0);
  if (sumSupply !== args.invoice.subtotal_krw) {
    return { ok: false, error_code: "TOTALS_MISMATCH" };
  }
  if (sumTax !== args.invoice.vat_krw) {
    return { ok: false, error_code: "TOTALS_MISMATCH" };
  }

  // Generate MgtKey if invoice doesn't have one yet.
  // IMPORTANT: must be deterministic per invoice row so that concurrent issue
  // requests produce the SAME MgtKey — popbill rejects duplicate MgtKeys, which
  // is our idempotency guard against double-filing under a race. We key on
  // invoice.id + invoice.created_at (stable per row).
  const mgtKey =
    args.invoice.popbill_mgt_key ??
    `INV-${args.invoice.id.slice(0, 8)}-${Buffer.from(args.invoice.created_at).toString("base64url").slice(0, 12)}`;

  const taxinvoice: Taxinvoice = {
    writeDate,
    chargeDirection: "정과금",
    issueType: "정발행",
    taxType: "과세",
    purposeType: "청구",

    invoicerCorpNum: args.supplier.business_registration_number!,
    invoicerMgtKey: mgtKey,
    invoicerCorpName: args.supplier.corporate_name,
    invoicerCEOName: args.supplier.representative_name,
    invoicerAddr: args.supplier.address,
    invoicerBizClass: args.supplier.business_item ?? "",
    invoicerBizType: args.supplier.business_type ?? "",
    invoicerContactName: args.supplier.representative_name,
    invoicerEmail: args.supplier.contact_email,

    invoiceeType: "사업자",
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
