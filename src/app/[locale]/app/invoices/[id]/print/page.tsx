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
  if (!value) return "—";
  // If value is already YYYY-MM-DD (date column), return as-is to avoid TZ shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Otherwise treat as timestamptz and project to KST.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

function orDash(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? "—" : trimmed;
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

  // Phase 2.0 G4 #9 (Phase 1.5 M1) — drafts are never printable. RLS already
  // blocks this for unprivileged callers, but defense-in-depth: if a policy
  // regression ever widened SELECT, the print route itself still refuses.
  if (invoice.status === "draft") {
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
            ← {t("print_back")}
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
                      —
                    </td>
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
