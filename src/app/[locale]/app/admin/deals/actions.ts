"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStudioContext } from "@/lib/workspace/studio-context.server";

const amountSchema = z.object({
  dealId: z.string().uuid(),
  brandAmount: z.coerce.number().int().nonnegative(),
  yagiCommissionAmount: z.coerce.number().int().nonnegative(),
  artistPayoutAmount: z.coerce.number().int().nonnegative(),
  commissionRate: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().trim().min(3).max(8).default("KRW"),
  comment: z.string().trim().max(1000).optional(),
});

const cancelSchema = z.object({
  dealId: z.string().uuid(),
  comment: z.string().trim().max(1000).optional(),
});

const paymentSchema = z.object({
  dealId: z.string().uuid(),
  eventType: z.enum(["brand_paid", "paid_out"]),
  amount: z.coerce.number().int().nonnegative().optional().nullable(),
  invoiceRef: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
});

const invoiceSchema = z.object({
  dealId: z.string().uuid(),
});

type AdminDealResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "balance" | "db";
      message?: string;
    };

type CreateDealInvoiceResult =
  | { ok: true; invoiceId: string }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "db";
      message?: string;
    };

async function getAdminSupabase() {
  const studio = await getStudioContext();
  if (!studio.ok) return { ok: false as const, error: studio.error };
  return { ok: true as const, supabase: studio.supabase };
}

export async function offerDealAction(input: unknown): Promise<AdminDealResult> {
  const parsed = amountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const data = parsed.data;
  if (data.brandAmount !== data.yagiCommissionAmount + data.artistPayoutAmount) {
    return { ok: false, error: "balance" };
  }

  const admin = await getAdminSupabase();
  if (!admin.ok) return admin;

  const { error: updateError } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 table typegen pending
    admin.supabase as any
  )
    .from("deals")
    .update({
      brand_amount: data.brandAmount,
      yagi_commission_amount: data.yagiCommissionAmount,
      artist_payout_amount: data.artistPayoutAmount,
      commission_rate: data.commissionRate ?? null,
      currency: data.currency,
    })
    .eq("id", data.dealId);

  if (updateError) {
    console.error("[offerDealAction] amount update error:", updateError);
    return { ok: false, error: "db", message: updateError.message };
  }

  const { error: transitionError } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 RPC typegen pending
    admin.supabase as any
  ).rpc("transition_deal_status", {
    p_deal_id: data.dealId,
    p_to_status: "offered",
    p_comment: data.comment?.trim() || null,
  });

  if (transitionError) {
    console.error("[offerDealAction] transition error:", transitionError);
    return { ok: false, error: "db", message: transitionError.message };
  }

  revalidateAdminDealPaths();
  return { ok: true };
}

export async function cancelDealAction(input: unknown): Promise<AdminDealResult> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const admin = await getAdminSupabase();
  if (!admin.ok) return admin;

  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 RPC typegen pending
    admin.supabase as any
  ).rpc("transition_deal_status", {
    p_deal_id: parsed.data.dealId,
    p_to_status: "cancelled",
    p_comment: parsed.data.comment?.trim() || null,
  });

  if (error) {
    console.error("[cancelDealAction] transition error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidateAdminDealPaths();
  return { ok: true };
}

export async function recordDealPaymentAction(
  input: unknown,
): Promise<AdminDealResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const admin = await getAdminSupabase();
  if (!admin.ok) return admin;

  const data = parsed.data;
  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 RPC typegen pending
    admin.supabase as any
  ).rpc("record_deal_payment", {
    p_deal_id: data.dealId,
    p_event_type: data.eventType,
    p_amount: data.amount ?? null,
    p_invoice_ref: data.invoiceRef?.trim() || null,
    p_note: data.note?.trim() || null,
  });

  if (error) {
    console.error("[recordDealPaymentAction] rpc error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidateAdminDealPaths();
  return { ok: true };
}

export async function createDealInvoiceAction(
  input: unknown,
): Promise<CreateDealInvoiceResult> {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const admin = await getAdminSupabase();
  if (!admin.ok) return admin;

  const { data, error } = await admin.supabase.rpc("create_invoice_from_deal", {
    p_deal_id: parsed.data.dealId,
  });

  if (error) {
    console.error("[createDealInvoiceAction] rpc error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidateAdminDealPaths();
  revalidatePath("/[locale]/app/invoices", "page");
  revalidatePath("/[locale]/app/admin/invoices", "page");
  return { ok: true, invoiceId: data };
}

function revalidateAdminDealPaths() {
  revalidatePath("/[locale]/app/admin/deals", "page");
  revalidatePath("/[locale]/app/admin/deals/[dealId]", "page");
  revalidatePath("/[locale]/app/deals", "page");
  revalidatePath("/[locale]/app/deals/[dealId]", "page");
}
