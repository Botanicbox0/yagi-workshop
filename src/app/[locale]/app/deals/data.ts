import { createSupabaseServer } from "@/lib/supabase/server";

export type DealRow = {
  id: string;
  persona_id: string;
  artist_workspace_id: string;
  brand_workspace_id: string;
  project_id: string | null;
  status: string;
  payment_status: string;
  brief: string | null;
  proposed_budget: number | null;
  brand_amount: number | null;
  yagi_commission_amount: number | null;
  artist_payout_amount: number | null;
  commission_rate: number | null;
  currency: string;
  usage_types: string[];
  persona_name_snapshot: string | null;
  invoice: {
    id: string;
    invoice_number: string | null;
    status: string;
  } | null;
  created_at: string;
  updated_at: string;
};

export type DealHistoryRow = {
  id: string;
  deal_id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  actor_role: string;
  comment: string | null;
  transitioned_at: string;
};

export type DealPaymentEventRow = {
  id: string;
  deal_id: string;
  event_type: string;
  amount: number | null;
  recorded_by: string | null;
  invoice_ref: string | null;
  note: string | null;
  occurred_at: string;
};

export const DEAL_SELECT =
  "id, persona_id, artist_workspace_id, brand_workspace_id, project_id, status, payment_status, brief, proposed_budget, brand_amount, yagi_commission_amount, artist_payout_amount, commission_rate, currency, usage_types, persona_name_snapshot, created_at, updated_at, invoices(id, invoice_number, status)";

function normalizeDeal(row: Record<string, unknown>): DealRow {
  const rawInvoices = row.invoices as
    | { id: string; invoice_number: string | null; status: string }
    | { id: string; invoice_number: string | null; status: string }[]
    | null
    | undefined;
  const invoice = Array.isArray(rawInvoices)
    ? (rawInvoices.find((item) => item.status !== "void") ?? null)
    : rawInvoices?.status === "void"
      ? null
      : (rawInvoices ?? null);
  return {
    ...(row as Omit<DealRow, "invoice">),
    invoice,
  };
}

export async function listDeals(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
) {
  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 table typegen pending
    supabase as any
  )
    .from("deals")
    .select(DEAL_SELECT)
    .order("updated_at", { ascending: false });

  return { data: ((data ?? []) as Record<string, unknown>[]).map(normalizeDeal), error };
}

export async function getDeal(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  dealId: string,
) {
  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 table typegen pending
    supabase as any
  )
    .from("deals")
    .select(DEAL_SELECT)
    .eq("id", dealId)
    .maybeSingle();

  return { data: data ? normalizeDeal(data as Record<string, unknown>) : null, error };
}

export async function listDealHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  dealId: string,
) {
  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 table typegen pending
    supabase as any
  )
    .from("deal_status_history")
    .select(
      "id, deal_id, from_status, to_status, actor_id, actor_role, comment, transitioned_at",
    )
    .eq("deal_id", dealId)
    .order("transitioned_at", { ascending: false });

  return { data: (data ?? []) as DealHistoryRow[], error };
}

export async function listDealPaymentEvents(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  dealId: string,
) {
  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 table typegen pending
    supabase as any
  )
    .from("deal_payment_events")
    .select("id, deal_id, event_type, amount, recorded_by, invoice_ref, note, occurred_at")
    .eq("deal_id", dealId)
    .order("occurred_at", { ascending: false });

  return { data: (data ?? []) as DealPaymentEventRow[], error };
}
