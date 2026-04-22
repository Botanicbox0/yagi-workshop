import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SuggestedLineItem = {
  item_name: string;
  specification: string | null;
  quantity: number;
  unit_price_krw: number;
  source_type: "meeting" | "storyboard";
  source_id: string;
  // Hint for the UI — true when this source is already on a non-void invoice
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
 * to 0 — UI is responsible for surfacing zeros so YAGI sets a price.
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
      item_name: `자문/미팅 — ${m.title}`,
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
      item_name: `스토리보드 — ${b.title}`,
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
