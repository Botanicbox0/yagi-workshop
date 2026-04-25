import { createSupabaseServer } from "@/lib/supabase/server";
import type { CommissionIntake, CommissionIntakeState } from "./types";

export async function listOwnIntakes(): Promise<CommissionIntake[]> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("commission_intakes")
    .select(
      "id, client_id, title, category, budget_range, deadline_preference, reference_urls, reference_uploads, brief_md, timestamp_notes, state, admin_response_md, admin_responded_at, admin_responded_by, created_at, updated_at",
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as CommissionIntake[];
}

export async function getOwnIntakeById(
  id: string,
): Promise<CommissionIntake | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("commission_intakes")
    .select(
      "id, client_id, title, category, budget_range, deadline_preference, reference_urls, reference_uploads, brief_md, timestamp_notes, state, admin_response_md, admin_responded_at, admin_responded_by, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as CommissionIntake) ?? null;
}

export async function listAdminIntakeQueue(opts?: {
  state?: CommissionIntakeState;
  limit?: number;
}): Promise<
  (CommissionIntake & { client: { company_name: string; contact_name: string } | null })[]
> {
  const supabase = await createSupabaseServer();
  let query = supabase
    .from("commission_intakes")
    .select(
      "id, client_id, title, category, budget_range, deadline_preference, reference_urls, reference_uploads, brief_md, timestamp_notes, state, admin_response_md, admin_responded_at, admin_responded_by, created_at, updated_at, clients!inner(company_name, contact_name)",
    )
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.state) query = query.eq("state", opts.state);

  const { data } = await query;
  return (data ?? []).map((row) => {
    const { clients, ...rest } = row as unknown as CommissionIntake & {
      clients: { company_name: string; contact_name: string } | null;
    };
    return { ...rest, client: clients };
  });
}
