"use server";

// =============================================================================
// Phase 5 Wave B task_06 v3 — Step 3 commit + submit server actions
//
// Two actions:
//   - updateProjectCommitAction(input)  — autosave 5 commit fields
//                                          (budget_band, target_delivery_at,
//                                           meeting_preferred_at,
//                                           interested_in_twin,
//                                           additional_notes)
//   - submitBriefingAction(input)       — atomic status transition
//                                          'draft' → 'in_review'
//
// Authorization:
//   Same assertProjectMutationAuth pattern as briefing-step2-actions:
//     1. createSupabaseServer (user-scoped)
//     2. resolveActiveWorkspace
//     3. SELECT project + verify workspace + status='draft' + creator
//     4. UPDATE with explicit eq('status', 'draft') for TOCTOU defense
//
// status='draft' enforcement on commit-field UPDATE is doubled at the RLS
// layer (sub_5 migration adds parent-status='draft' predicate to the
// briefing_documents policies; projects RLS already requires
// (created_by AND status='draft') OR ws_admin OR yagi_admin for the
// member-creator branch). After submitBriefingAction flips status, every
// subsequent commit-field UPDATE from the user-scoped client returns 0
// rows — no separate revoke needed.
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

// ---------------------------------------------------------------------------
// Auth helper — duplicated from briefing-step2-actions to keep that file's
// "use server" surface minimal (every export from a "use server" file is a
// server action; we don't want this helper exposed as one).
// ---------------------------------------------------------------------------

async function assertProjectMutationAuth(projectId: string): Promise<
  | {
      ok: true;
      userId: string;
      workspaceId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
      sb: any;
    }
  | {
      ok: false;
      error: "unauthenticated" | "no_workspace" | "not_found" | "forbidden";
      message?: string;
    }
> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: project, error: selErr } = await sb
    .from("projects")
    .select("id, workspace_id, status, created_by")
    .eq("id", projectId)
    .maybeSingle();
  if (selErr) {
    console.error("[step3 assertProjectMutationAuth] SELECT error:", selErr);
    return { ok: false, error: "forbidden", message: selErr.message };
  }
  if (!project) return { ok: false, error: "not_found" };
  if (project.workspace_id !== active.id) {
    return { ok: false, error: "forbidden", message: "workspace mismatch" };
  }
  if (project.created_by !== user.id) {
    return { ok: false, error: "forbidden", message: "not creator" };
  }
  if (project.status !== "draft") {
    return {
      ok: false,
      error: "forbidden",
      message: "project is no longer draft",
    };
  }
  return {
    ok: true,
    userId: user.id,
    workspaceId: active.id,
    sb,
  };
}

// ===========================================================================
// 1. updateProjectCommitAction — Step 3 autosave for 5 commit fields
// ===========================================================================

const commitInput = z.object({
  projectId: z.string().uuid(),
  // All 5 fields optional. undefined = "don't change", null = "clear".
  budget_band: z
    .enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"])
    .optional()
    .nullable(),
  target_delivery_at: z.string().nullable().optional(),
  meeting_preferred_at: z.string().datetime().nullable().optional(),
  interested_in_twin: z.boolean().optional(),
  additional_notes: z.string().trim().max(2000).optional().nullable(),
});

export type UpdateProjectCommitResult =
  | { ok: true; savedAt: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden"
        | "wrong_status"
        | "db";
      message?: string;
    };

export async function updateProjectCommitAction(
  input: unknown,
): Promise<UpdateProjectCommitResult> {
  const parsed = commitInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const auth = await assertProjectMutationAuth(parsed.data.projectId);
  if (!auth.ok) return auth;

  const payload: Record<string, unknown> = {};
  const fields = [
    "budget_band",
    "target_delivery_at",
    "meeting_preferred_at",
    "interested_in_twin",
    "additional_notes",
  ] as const;
  for (const f of fields) {
    const v = parsed.data[f];
    if (v !== undefined) payload[f] = v;
  }
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "validation", message: "no field to update" };
  }

  // Defense-in-depth: WHERE status='draft' inside the UPDATE itself, so a
  // status flip between assertProjectMutationAuth and this UPDATE is
  // caught at the row layer. RLS would also reject it.
  //
  // F2 fix (K-05 LOOP 1 MED): .select('id') + length check distinguishes
  // "0 rows matched" (status flipped between auth and UPDATE → caller
  // should see wrong_status, not the lying ok:true that the previous
  // code returned and that was being rendered as "saved" on the autosave
  // indicator). RLS-denied UPDATEs return [] without an error too — same
  // wrong_status surface.
  const { data: updatedRows, error: updErr } = await auth.sb
    .from("projects")
    .update(payload)
    .eq("id", parsed.data.projectId)
    .eq("status", "draft")
    .select("id");
  if (updErr) {
    console.error("[updateProjectCommitAction] UPDATE error:", updErr);
    return { ok: false, error: "db", message: updErr.message };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return { ok: false, error: "wrong_status" };
  }

  return { ok: true, savedAt: new Date().toISOString() };
}

// ===========================================================================
// 2. submitBriefingAction — atomic status flip 'draft' → 'in_review'
// ===========================================================================

const submitInput = z.object({
  projectId: z.string().uuid(),
});

export type SubmitBriefingResult =
  | { ok: true; projectId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_owner"
        | "wrong_status"
        | "db";
      message?: string;
    };

export async function submitBriefingAction(
  input: unknown,
): Promise<SubmitBriefingResult> {
  const parsed = submitInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  // F1 fix (K-05 LOOP 1 MED): submitBriefingAction does NOT use the
  // shared assertProjectMutationAuth helper because that helper rejects
  // non-draft with `forbidden` before reaching the atomic UPDATE — which
  // collapses cross-tab "already submitted" cases into a generic submit_failed
  // toast instead of the explicit submit_wrong_status copy. Inline the
  // status branch here so wrong_status surfaces honestly on:
  //   (a) cross-tab double-submit (status='in_review' at SELECT time)
  //   (b) concurrent same-tab race (status='draft' at SELECT, flips before
  //       UPDATE → 0-row UPDATE → wrong_status)
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: project, error: selErr } = await sb
    .from("projects")
    .select("id, status, created_by")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (selErr) {
    console.error("[submitBriefingAction] SELECT error:", selErr);
    return { ok: false, error: "db", message: selErr.message };
  }
  // not_owner covers both "row missing under RLS scope" and "row exists
  // but caller is not the creator" — semantically equivalent to the user.
  if (!project || project.created_by !== user.id) {
    return { ok: false, error: "not_owner" };
  }
  if (project.status !== "draft") {
    return { ok: false, error: "wrong_status" };
  }

  // Atomic status transition. WHERE status='draft' AND created_by=auth.uid()
  // is a race-safety net: even if status was 'draft' at the SELECT above,
  // a concurrent flip between SELECT and UPDATE collapses to 0 rows.
  // .select('id').maybeSingle() makes a 0-row result distinguishable from
  // a successful flip (returns null vs the row).
  const { data: updated, error: updErr } = await sb
    .from("projects")
    .update({
      status: "in_review",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.projectId)
    .eq("created_by", user.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (updErr) {
    console.error("[submitBriefingAction] UPDATE error:", updErr);
    return { ok: false, error: "db", message: updErr.message };
  }
  if (!updated) {
    return { ok: false, error: "wrong_status" };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, projectId: updated.id };
}
