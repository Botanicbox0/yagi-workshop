"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  suggestLineItems,
  type SuggestedLineItem,
} from "@/lib/invoices/suggest-line-items";

// ─── Shared helpers ──────────────────────────────────────────────────────────

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

// ─── addLineItem ─────────────────────────────────────────────────────────────

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

// ─── updateLineItem ──────────────────────────────────────────────────────────

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

// ─── deleteLineItem ──────────────────────────────────────────────────────────

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

// ─── reorderLineItems ────────────────────────────────────────────────────────

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

// ─── bulkAddFromSuggestions ──────────────────────────────────────────────────

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

// ─── fetchSuggestions (server action wrapper around suggestLineItems) ────────

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
