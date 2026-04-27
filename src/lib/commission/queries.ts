import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
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
      "id, client_id, title, category, budget_range, deadline_preference, reference_urls, reference_uploads, brief_md, timestamp_notes, state, admin_response_md, admin_responded_at, admin_responded_by, created_at, updated_at, converted_to_project_id",
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
      "id, client_id, title, category, budget_range, deadline_preference, reference_urls, reference_uploads, brief_md, timestamp_notes, state, admin_response_md, admin_responded_at, admin_responded_by, created_at, updated_at, converted_to_project_id",
    )
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as CommissionIntake) ?? null;
}

/**
 * Public sponsor-name lookup for challenge pages. RLS makes the `clients`
 * table self-or-admin only, so anon cannot read company_name directly. We
 * use the service-role client for a narrowly-scoped single-column lookup.
 *
 * This is the MVP resolution of Codex K-05 G1 Finding 4 (sponsor public
 * read path). Phase 2.7+ FU: replace with a SECURITY DEFINER RPC or a
 * denormalized column once we tolerate a follow-up migration.
 */
export async function getSponsorCompanyName(
  sponsorClientId: string,
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const svc = createSupabaseService();
  const { data } = await svc
    .from("clients")
    .select("company_name")
    .eq("id", sponsorClientId)
    .maybeSingle();
  return data?.company_name ?? null;
}

export async function listClientsForSponsor(): Promise<
  { id: string; company_name: string; company_type: string }[]
> {
  // Admin-only call site (challenges/new sponsor picker). RLS policy
  // clients_select_self_or_admin gates this — non-admin auth gets zero
  // rows back; we still rely on the page's own admin gate for UX.
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("clients")
    .select("id, company_name, company_type")
    .order("company_name", { ascending: true })
    .limit(500);
  return data ?? [];
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
      "id, client_id, title, category, budget_range, deadline_preference, reference_urls, reference_uploads, brief_md, timestamp_notes, state, admin_response_md, admin_responded_at, admin_responded_by, created_at, updated_at, converted_to_project_id, clients!inner(company_name, contact_name)",
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
