"use server";

// =============================================================================
// Phase 2.8.1 G_B1-H — Commission flow integrity (admin convert)
// =============================================================================
// convertCommissionToProject is the only legal write path that flips a
// commission_intakes row to state='converted'. Backed by the
// convert_commission_to_project SECURITY DEFINER RPC which atomically:
//   1. INSERT projects + project_briefs sibling
//   2. INSERT project_references per intake.reference_urls element
//   3. UPDATE commission_intakes (state='converted', converted_to_project_id)
//   4. INSERT notification_events for the client
//
// RLS: RPC is yagi_admin only. Authorization is double-checked at the
// server-action layer so the redirect target reflects the caller's role
// without a round-trip.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const ConvertInput = z.object({
  commissionId: z.string().uuid(),
});

export type ConvertCommissionResult =
  | {
      ok: true;
      projectId: string;
      alreadyConverted: boolean;
      referencesAdded: number;
    }
  | { error: "validation"; issues: z.ZodIssue[] }
  | { error: "unauthenticated" }
  | { error: "forbidden" }
  | { error: "not_found" }
  | { error: "client_no_workspace" }
  | { error: "db"; message: string };

export async function convertCommissionToProject(
  input: unknown,
): Promise<ConvertCommissionResult> {
  const parsed = ConvertInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // Double-check yagi_admin so the action path doesn't leak the RPC
  // error message back to a curious non-admin caller.
  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isAdmin) return { error: "forbidden" };

  // Cast through the untyped rpc surface — supabase types are regenerated
  // post-apply (same pattern as save_brief_version in G_B1-F).
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  )("convert_commission_to_project", {
    p_commission_id: parsed.data.commissionId,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("unauthenticated")) return { error: "unauthenticated" };
    if (msg.includes("forbidden")) return { error: "forbidden" };
    if (msg.includes("not_found")) return { error: "not_found" };
    if (msg.includes("client_no_workspace"))
      return { error: "client_no_workspace" };
    console.error("[convertCommissionToProject] rpc error", error);
    return { error: "db", message: error.message };
  }

  const result = data as unknown as {
    projectId: string;
    alreadyConverted: boolean;
    referencesAdded: number;
  };

  revalidatePath(
    `/[locale]/app/admin/commissions/${parsed.data.commissionId}`,
    "page",
  );
  revalidatePath("/[locale]/app/admin/commissions", "page");
  revalidatePath(`/[locale]/app/projects/${result.projectId}`, "page");

  return {
    ok: true,
    projectId: result.projectId,
    alreadyConverted: result.alreadyConverted,
    referencesAdded: result.referencesAdded,
  };
}
