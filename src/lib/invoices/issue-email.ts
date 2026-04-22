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

  const projectTitle = project?.title ?? "—";
  const buyerName = buyer.name ?? "—";
  const supplierName = supplier?.corporate_name ?? "YAGI Workshop";
  const supplierContactEmail = supplier?.contact_email ?? "yagi@yagiworkshop.xyz";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const printUrl = `${siteUrl}/ko/app/invoices/${invoice.id}/print`;

  const subject = invoice.is_mock
    ? `[YAGI] 세금계산서 (MOCK) — ${invoice.invoice_number ?? invoice.id}`
    : `[YAGI] 세금계산서 발행 알림 — ${invoice.invoice_number ?? invoice.id}`;

  const mockBanner = invoice.is_mock
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:8px;margin:16px 0">
  <strong>⚠️ 주의: 이 세금계산서는 현재 MOCK 모드로 발행되었습니다.</strong>
  <p style="margin:8px 0 0;font-size:14px">팝빌 서비스 승인 대기 중이며, 국세청에 실제 신고된 문서가 아닙니다. 팝빌 승인 후 재발행 예정입니다.</p>
</div>`
    : "";

  const htmlBody = `<h2 style="font-family: system-ui, sans-serif">세금계산서 발행 알림</h2>
<p>안녕하세요, <strong>${escapeHtml(buyerName)}</strong> 담당자님.</p>
<p><strong>${escapeHtml(supplierName)}</strong>에서 세금계산서를 발행하였습니다.</p>
${mockBanner}
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td>송장 번호</td><td>${escapeHtml(invoice.invoice_number ?? "—")}</td></tr>
  <tr><td>국세청 승인번호</td><td>${escapeHtml(invoice.nts_approval_number ?? "—")}</td></tr>
  <tr><td>프로젝트</td><td>${escapeHtml(projectTitle)}</td></tr>
  <tr><td>공급일자</td><td>${escapeHtml(invoice.supply_date)}</td></tr>
  <tr><td>결제기한</td><td>${escapeHtml(invoice.due_date ?? "—")}</td></tr>
  <tr><td>공급가액</td><td>${escapeHtml(formatKRW(invoice.subtotal_krw))}</td></tr>
  <tr><td>부가세</td><td>${escapeHtml(formatKRW(invoice.vat_krw))}</td></tr>
  <tr><td><strong>합계</strong></td><td><strong>${escapeHtml(formatKRW(invoice.total_krw))}</strong></td></tr>
</table>
<p style="margin:24px 0"><a href="${escapeHtml(printUrl)}" style="display:inline-block;background:#000;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">세금계산서 PDF 보기 →</a></p>
<p style="color:#6b7280;font-size:12px;margin-top:32px">
  문의사항이 있으시면 ${escapeHtml(supplierContactEmail)} 로 회신해 주세요.
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
