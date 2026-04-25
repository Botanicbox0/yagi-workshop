"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  commissionIntakeFormSchema,
  type CommissionIntakeFormInput,
  type CommissionIntakeFormParsed,
} from "./schemas";

export type SubmitCommissionIntakeResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function submitCommissionIntakeAction(
  input: CommissionIntakeFormInput,
): Promise<SubmitCommissionIntakeResult> {
  const parsed = commissionIntakeFormSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `${issue.path.join(".") || "form"}:${issue.message}`,
    };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // Defense-in-depth: verify the user is a client + has a clients row
  // before INSERT. RLS already enforces both, but a clearer error here.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "client") {
    return { ok: false, error: "not_a_client" };
  }
  const { count: clientRowCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("id", user.id);
  if ((clientRowCount ?? 0) === 0) {
    return { ok: false, error: "client_profile_missing" };
  }

  const validated: CommissionIntakeFormParsed = parsed.data;
  const { data: inserted, error } = await supabase
    .from("commission_intakes")
    .insert({
      client_id: user.id,
      title: validated.title,
      category: validated.category,
      budget_range: validated.budget_range,
      deadline_preference: validated.deadline_preference,
      reference_urls: validated.reference_urls,
      reference_uploads: validated.reference_uploads,
      brief_md: validated.brief_md,
      timestamp_notes: validated.timestamp_notes,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "insert_failed" };
  }

  revalidatePath("/app/commission");
  return { ok: true, id: inserted.id };
}

export async function archiveOwnIntakeAction(
  intakeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Per IMPL §9, MVP allows owner-initiated archive only when state is
  // `submitted`. Once admin responds, the row is admin-controlled.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("commission_intakes")
    .update({ state: "archived" })
    .eq("id", intakeId)
    .eq("client_id", user.id)
    .eq("state", "submitted");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/commission");
  revalidatePath(`/app/commission/${intakeId}`);
  return { ok: true };
}
