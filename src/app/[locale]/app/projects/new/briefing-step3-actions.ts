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

  // hotfix-6: direct UPDATE of projects.status is rejected by the
  // BEFORE-UPDATE trigger trg_guard_projects_status (raises
  // 'direct_status_update_forbidden'). Every status transition must go
  // through the SECURITY DEFINER `transition_project_status` RPC, which:
  //   - validates auth.uid() (client may only transition own projects)
  //   - takes a row-level FOR UPDATE lock so concurrent submits serialize
  //   - validates the transition against the state-machine matrix
  //     (client: draft → submitted is allowed; draft → in_review is NOT —
  //     in_review is reserved for system / yagi_admin)
  //   - sets submitted_at when p_to_status='submitted'
  //   - inserts a project_status_history audit row inside the same
  //     transaction
  //   - returns the new history id
  //
  // Auth helper is not needed — the RPC verifies auth.uid() and ownership
  // via SECURITY DEFINER. We still call createSupabaseServer to ensure the
  // RPC sees the caller's auth.uid() (anon-key client would NULL it).
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  // resolveActiveWorkspace is intentionally called before the RPC even
  // though the RPC does not consult workspace context — it surfaces a
  // clean no_workspace error to the client (mid-onboarding edge) before
  // round-tripping to Postgres.
  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  const sb = supabase as any;

  const { data: historyId, error: rpcErr } = await sb.rpc(
    "transition_project_status",
    {
      p_project_id: parsed.data.projectId,
      p_to_status: "submitted",
      // p_comment defaults to NULL; only required for in_revision
      // transitions (which the client cannot trigger).
    },
  );

  if (rpcErr) {
    console.error("[submitBriefingAction] RPC error:", rpcErr);
    // Map RPC RAISE EXCEPTION codes to client-facing error union.
    const code = rpcErr.code as string | undefined;
    const msg = (rpcErr.message ?? "") as string;
    if (code === "42501" && msg.includes("unauthenticated")) {
      return { ok: false, error: "unauthenticated" };
    }
    if (code === "42501" && msg.includes("forbidden")) {
      return { ok: false, error: "not_owner" };
    }
    if (code === "P0002") {
      // project_not_found — RLS scope or hard delete
      return { ok: false, error: "not_owner" };
    }
    if (code === "23514") {
      // invalid_transition — already submitted, or status no longer draft
      return { ok: false, error: "wrong_status" };
    }
    return { ok: false, error: "db", message: msg };
  }

  if (!historyId) {
    return { ok: false, error: "db", message: "RPC returned null history id" };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, projectId: parsed.data.projectId };
}
