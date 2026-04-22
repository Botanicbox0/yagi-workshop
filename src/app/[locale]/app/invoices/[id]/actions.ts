"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildTaxinvoice } from "@/lib/popbill/build-taxinvoice";
import { issueTaxInvoice, getPopbillMode } from "@/lib/popbill/client";
import { sendInvoiceIssuedEmail } from "@/lib/invoices/issue-email";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";
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
    // Phase 2.1 G4 — differentiate "deferred to Phase 2.2" from generic
    // 팝빌 API failures. NOT_IMPLEMENTED carries a `details` payload
    // identifying the phase the real impl lands in and the intended
    // operation; log it structurally and surface a dedicated error code
    // the client can i18n-render into a bilingual toast body.
    if (popbillResult.error_code === "NOT_IMPLEMENTED") {
      console.error(
        "[invoices] issueInvoice guarded — popbill path deferred",
        popbillResult.details,
      );
      return { ok: false, error: "popbill_not_implemented" };
    }
    console.error("[invoices] issueInvoice popbill failed", popbillResult);
    return { ok: false, error: popbillResult.error_code };
  }

  // Generate invoice_number if not already set.
  // Format: INV-YYYYMMDD-XXXX (deterministic; avoids needing a sequence).
  const issueDate = new Date().toISOString().slice(0, 10);
  const invoiceNumber =
    invoice.invoice_number ??
    `INV-${issueDate.replace(/-/g, "")}-${invoice.id.slice(0, 4).toUpperCase()}`;

  // Race-guarded update: only flip draft → issued.
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

  // Phase 1.8 — notify all workspace admins of the issuing workspace. Emit
  // failures never fail the parent action.
  try {
    const svc = createSupabaseService();
    const { data: admins } = await svc
      .from("user_roles")
      .select("user_id")
      .eq("workspace_id", invoice.workspace_id)
      .eq("role", "workspace_admin");

    const clientName = buyer.name ?? "";
    const amount = String(invoice.total_krw ?? "");

    await Promise.all(
      (admins ?? [])
        .filter((r) => r.user_id && r.user_id !== user.id)
        .map((r) =>
          emitNotification({
            user_id: r.user_id!,
            kind: "invoice_issued",
            workspace_id: invoice.workspace_id,
            payload: {
              invoice_number: invoiceNumber,
              amount,
              client: clientName,
            },
            url_path: `/app/invoices/${invoiceId}`,
          })
        )
    );
  } catch (err) {
    console.error("[invoices] notif emit failed:", err);
  }

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

  // Popbill-side void is deferred — only the DB status changes for now.
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
