"use server";

// =============================================================================
// Phase 5 Wave C Hotfix-2 HF2_2 — deleteProjectAction
//
// Soft-deletes a project owned by the current user, gated on status IN
// ('submitted', 'in_review'). Hard rules:
//
//   1. Validate input shape (uuid).
//   2. Authenticate via createSupabaseServer().auth.getUser().
//   3. SELECT the project (id, status, created_by, deleted_at).
//      Row missing or already deleted → 'not_found'.
//   4. created_by !== user.id → 'forbidden_owner'.
//   5. status NOT IN ('submitted', 'in_review') → 'forbidden_status'.
//   6. Write deleted_at via createSupabaseService() (service-role bypass
//      required: RLS WITH CHECK denies deleted_at writes from the client
//      role — same pattern as ensureBriefingDraftProject defensive
//      soft-delete in briefing-actions.ts).
//      Authorization is preserved by the explicit filter chain:
//        .eq("id", projectId)
//        .eq("created_by", user.id)          ← different-user blocked here
//        .in("status", ["submitted", "in_review"])  ← TOCTOU safety net
//        .is("deleted_at", null)             ← idempotency guard
//   7. revalidatePath('/[locale]/app/projects', 'page') so the list
//      immediately drops the deleted row.
//   8. Return { ok: true }.
//
// L-049 multi-role audit:
//   - client role: RLS WITH CHECK blocks deleted_at write → service-role ✓
//   - ws_admin role: same RLS rule applies → service-role ✓
//   - yagi_admin: bypasses RLS but action layer enforces creator + status ✓
//   - different-user same-workspace: .eq("created_by", user.id) blocks ✓
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

const deleteProjectInput = z.object({
  projectId: z.string().uuid(),
});

export type DeleteProjectResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "not_found"
        | "forbidden_status"
        | "forbidden_owner"
        | "db";
      message?: string;
    };

export async function deleteProjectAction(
  input: unknown,
): Promise<DeleteProjectResult> {
  // 1. Parse input
  const parsed = deleteProjectInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const { projectId } = parsed.data;

  // 2. Authenticate
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  // 3. SELECT project row (status, owner, soft-delete state)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
  const sb = supabase as any;
  const { data: project, error: selErr } = await sb
    .from("projects")
    .select("id, status, created_by, deleted_at")
    .eq("id", projectId)
    .maybeSingle();

  if (selErr) {
    console.error("[deleteProjectAction] SELECT error:", selErr);
    return { ok: false, error: "db", message: selErr.message };
  }

  // Row missing or already soft-deleted → treat as not_found
  if (!project || project.deleted_at !== null) {
    return { ok: false, error: "not_found" };
  }

  // 4. Owner check
  if (project.created_by !== user.id) {
    return { ok: false, error: "forbidden_owner" };
  }

  // 5. Status gate — only submitted / in_review deletable by owner
  const DELETABLE_STATUSES = ["submitted", "in_review"] as const;
  if (!DELETABLE_STATUSES.includes(project.status)) {
    return { ok: false, error: "forbidden_status" };
  }

  // 6. Soft-delete via service-role client (bypasses RLS WITH CHECK
  //    that denies deleted_at writes from non-yagi_admin client sessions).
  //    Authorization triple-lock preserved in the WHERE chain:
  //      created_by = user.id  →  different-user blocked even under service role
  //      status IN (...)       →  TOCTOU: admin may have transitioned status
  //                               between our SELECT and this UPDATE
  //      deleted_at IS NULL    →  idempotency: concurrent delete attempt is a no-op
  const sbAdmin = createSupabaseService();
  // K-05 LOOP 1 MED fix (post-merge): Supabase / PostgREST returns no
  // error when the WHERE-filter chain matches 0 rows. Without inspecting
  // the result, a TOCTOU race (admin transitions status to in_progress
  // between our SELECT and this UPDATE) would silently succeed: the
  // project survives, but the action returns ok:true and the user sees
  // a success toast + redirect. Add `.select("id")` to surface the row
  // count and return forbidden_status if the filter chain matched 0.
  const { data: updatedRows, error: updateErr } = await sbAdmin
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("created_by", user.id)
    .in("status", ["submitted", "in_review"])
    .is("deleted_at", null)
    .select("id");

  if (updateErr) {
    console.error("[deleteProjectAction] UPDATE error:", updateErr);
    return { ok: false, error: "db", message: updateErr.message };
  }
  if (!updatedRows || updatedRows.length === 0) {
    // Race: status flipped between our SELECT (forbidden_status check
    // passed) and this UPDATE (status no longer in deletable set).
    // Surface the same forbidden_status the user would have seen if
    // the race hadn't happened.
    return { ok: false, error: "forbidden_status" };
  }

  // 7. Invalidate project list cache
  revalidatePath("/[locale]/app/projects", "page");

  // 8. Success
  return { ok: true };
}
