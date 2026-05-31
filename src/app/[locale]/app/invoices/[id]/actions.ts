"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildTaxinvoice } from "@/lib/popbill/build-taxinvoice";
import {
  getPopbillMode,
  getTaxInvoiceInfo,
  issueTaxInvoice,
} from "@/lib/popbill/client";
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
    revalidatePath(`/${locale}/app/admin/invoices`);
    revalidatePath(`/${locale}/app/invoices/${invoiceId}`);
  }
  revalidatePath("/[locale]/app/admin/deals", "page");
  revalidatePath("/[locale]/app/admin/deals/[dealId]", "page");
}

function issueDateString() {
  return new Date().toISOString().slice(0, 10);
}

function buildInvoiceNumber(invoice: {
  id: string;
  invoice_number: string | null;
}) {
  const issueDate = issueDateString();
  return (
    invoice.invoice_number ??
    `INV-${issueDate.replace(/-/g, "")}-${invoice.id.slice(0, 4).toUpperCase()}`
  );
}

function buildMgtKey(invoice: {
  id: string;
  created_at: string;
  popbill_mgt_key: string | null;
}) {
  return (
    invoice.popbill_mgt_key ??
    `INV-${invoice.created_at.slice(0, 10).replace(/-/g, "")}-${invoice.id
      .slice(0, 8)
      .toUpperCase()}`
  );
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

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return { ok: false, error: "invoice_not_found" };
  if (invoice.status === "issuing") {
    return { ok: false, error: "already_in_progress" };
  }
  if (invoice.status !== "draft" && invoice.status !== "failed") {
    return { ok: false, error: "not_issueable" };
  }

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

  const issueDate = issueDateString();
  const invoiceNumber = buildInvoiceNumber(invoice);
  const popbillMgtKey = buildMgtKey(invoice);

  // Build the popbill payload with the same MgtKey that will be persisted
  // before the external issue call.
  const buildResult = buildTaxinvoice({
    supplier,
    buyer,
    invoice: {
      ...invoice,
      invoice_number: invoiceNumber,
      popbill_mgt_key: popbillMgtKey,
    },
    lineItems,
  });
  if (!buildResult.ok) {
    return {
      ok: false,
      error: buildResult.error_code,
      missing_fields: buildResult.missing_fields,
    };
  }

  const { data: locked, error: lockErr } = await supabase
    .from("invoices")
    .update({
      status: "issuing",
      invoice_number: invoiceNumber,
      popbill_mgt_key: popbillMgtKey,
      popbill_response: null,
      is_mock: getPopbillMode() === "mock",
    })
    .eq("id", invoiceId)
    .in("status", ["draft", "failed"])
    .select("id");

  if (lockErr) {
    console.error("[invoices] issueInvoice lock failed", lockErr);
    return { ok: false, error: "db_update_failed" };
  }

  if (!locked || locked.length === 0) {
    const { data: current } = await supabase
      .from("invoices")
      .select("status")
      .eq("id", invoiceId)
      .maybeSingle();
    if (current?.status === "issuing") {
      return { ok: false, error: "already_in_progress" };
    }
    return { ok: false, error: "status_changed" };
  }

  // Issue via Popbill. The adapter keeps secrets server-only and blocks
  // production issue unless the explicit live guard is enabled.
  const popbillResult = await issueTaxInvoice({
    invoice_id: invoice.id,
    taxinvoice: buildResult.taxinvoice,
  });
  if (!popbillResult.ok) {
    console.error("[invoices] issueInvoice popbill failed", {
      code: popbillResult.error_code,
      message: popbillResult.error_message,
      mode: popbillResult.mode,
    });
    await supabase
      .from("invoices")
      .update({
        status: "failed",
        popbill_response: {
          ok: false,
          error_code: popbillResult.error_code,
          error_message: popbillResult.error_message,
          mode: popbillResult.mode,
        } as Json,
      })
      .eq("id", invoiceId)
      .eq("status", "issuing");
    return { ok: false, error: popbillResult.error_code };
  }

  // Race-guarded update: only flip issuing → issued.
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
    .eq("status", "issuing")
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
    return { ok: false, error: "status_changed_after_issue" };
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

  const { error: updateErr } = await supabase.rpc("mark_invoice_paid", {
    p_invoice_id: invoiceId,
  });

  if (updateErr) {
    console.error("[invoices] markPaid rpc failed", updateErr);
    return { ok: false, error: "db_update_failed" };
  }

  revalidateInvoicePaths(invoiceId);
  return { ok: true };
}

export async function recheckInvoiceIssueStatus(
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

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status, invoice_number, popbill_mgt_key, created_at")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return { ok: false, error: "invoice_not_found" };
  if (!invoice.popbill_mgt_key) return { ok: false, error: "missing_mgt_key" };

  if (invoice.status === "issued" || invoice.status === "paid") {
    return { ok: true };
  }
  if (invoice.status !== "issuing" && invoice.status !== "failed") {
    return { ok: false, error: "not_recheckable" };
  }

  const info = await getTaxInvoiceInfo({ mgt_key: invoice.popbill_mgt_key });
  if (!info.ok) {
    if (invoice.status === "issuing") {
      await supabase
        .from("invoices")
        .update({
          status: "failed",
          popbill_response: {
            ok: false,
            error_code: info.error_code,
            error_message: info.error_message,
            mode: info.mode,
          } as Json,
        })
        .eq("id", invoiceId)
        .eq("status", "issuing");
    }
    return { ok: false, error: info.error_code };
  }

  const issueDate = issueDateString();
  if (invoice.status === "failed") {
    const { error: resetError } = await supabase
      .from("invoices")
      .update({ status: "issuing" })
      .eq("id", invoiceId)
      .eq("status", "failed");

    if (resetError) {
      console.error("[invoices] recheckInvoiceIssueStatus reset failed", resetError);
      return { ok: false, error: "db_update_failed" };
    }
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "issued",
      issue_date: issueDate,
      filed_at: new Date().toISOString(),
      nts_approval_number: info.nts_approval_number,
      popbill_response: info.raw_response as Json,
      is_mock: info.mode === "mock",
      invoice_number: buildInvoiceNumber(invoice),
    })
    .eq("id", invoiceId)
    .eq("status", "issuing");

  if (error) {
    console.error("[invoices] recheckInvoiceIssueStatus update failed", error);
    return { ok: false, error: "db_update_failed" };
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
