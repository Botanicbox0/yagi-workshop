"use server";

// =============================================================================
// Phase 5 Wave B briefing-canvas server actions
//
// task_04 v3 (Step 1 → Step 2 transition):
//   - ensureBriefingDraftProject(input) — INSERT new draft OR UPDATE
//     existing draft with Step 1's essential intake fields.
//
// task_05 v3 (Step 2 — workspace 3-column + autosave):
//   - getBriefingDocumentPutUrlAction(input)        — R2 presigned PUT
//   - addBriefingDocumentAction(input)              — INSERT briefing_documents
//   - removeBriefingDocumentAction(input)           — DELETE briefing_documents
//   - updateBriefingDocumentNoteAction(input)       — UPDATE note/category only
//   - updateProjectMetadataAction(input)            — autosave 7+ sidebar fields
//
// Authorization model — Phase 4.x sub_03f_5 F4 pattern reused:
//   - createSupabaseServer (user-scoped)
//   - resolveActiveWorkspace for active workspace id
//   - explicit project ownership / workspace-membership re-verify before
//     any write, even though RLS already gates row scope
//   - status='draft' guard on every Step 2 write (no metadata changes
//     after the project transitions to in_review)
//   - storage_key prefix bound to auth.uid() in the upload presign +
//     re-validated on INSERT (sub_03f_5 F2 pattern)
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

// ---------------------------------------------------------------------------
// Step 1 input schema
//
// Matches stage1Schema in briefing-canvas.tsx but trimmed to the v3 minimal
// 3-field set + name. Optional projectId allows back-and-forward navigation
// to UPDATE an existing draft instead of orphaning it.
// ---------------------------------------------------------------------------

const ensureBriefingDraftInput = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(15),
  description: z.string().trim().min(1).max(1000),
  planning_mode: z
    .enum(["want_proposal", "have"])
    .optional()
    .nullable(),
});

export type EnsureBriefingDraftInput = z.input<typeof ensureBriefingDraftInput>;

export type EnsureBriefingDraftResult =
  | { ok: true; projectId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "forbidden"
        | "not_found"
        | "db";
      message?: string;
    };

async function ensureProjectBriefRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  projectId: string,
  userId: string,
): Promise<string | null> {
  const { data: existing, error: selectErr } = await supabase
    .from("project_briefs")
    .select("project_id")
    .eq("project_id", projectId)
    .maybeSingle();
  if (selectErr) return selectErr.message;
  if (existing) return null;

  const { error: insertErr } = await supabase.from("project_briefs").insert({
    project_id: projectId,
    updated_by: userId,
  });
  return insertErr?.message ?? null;
}

export async function ensureBriefingDraftProject(
  input: unknown,
): Promise<EnsureBriefingDraftResult> {
  const parsed = ensureBriefingDraftInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const data = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  const active = await resolveActiveWorkspace(user.id);
  if (!active) {
    return { ok: false, error: "no_workspace" };
  }
  if (active.kind !== "brand") {
    return { ok: false, error: "forbidden", message: "brand workspace required" };
  }

  // Cast to any for newly-added draft columns awaiting generated type refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new Phase 5 columns not in generated types
  const sb = supabase as any;

  // ---------- UPDATE path (only when caller passes an alive draft id) ----------
  //
  // hotfix-6: SELECT now also reads deleted_at. If the projectId points to
  // a wiped or hard-deleted row (sessionStorage stale after a prior wipe,
  // or a different tab triggered a wipe), we do NOT surface 'not_found' —
  // we silently fall through to the wipe-then-INSERT path below so the
  // user gets a fresh canvas. The "new project" mental model wins over
  // the "resume your draft" mental model per yagi visual review.
  if (data.projectId) {
    const { data: existing, error: selErr } = await sb
      .from("projects")
      .select("id, status, created_by, workspace_id, deleted_at")
      .eq("id", data.projectId)
      .maybeSingle();
    if (selErr) {
      console.error("[ensureBriefingDraftProject] SELECT error:", selErr);
      return { ok: false, error: "db", message: selErr.message };
    }

    if (existing && !existing.deleted_at) {
      // Alive row — validate and UPDATE.
      if (existing.created_by !== user.id) {
        return { ok: false, error: "forbidden" };
      }
      if (existing.status !== "draft") {
        return {
          ok: false,
          error: "forbidden",
          message: "project is no longer draft",
        };
      }
      if (existing.workspace_id !== active.id) {
        return {
          ok: false,
          error: "forbidden",
          message: "workspace mismatch",
        };
      }

      const { error: updErr } = await sb
        .from("projects")
        .update({
          title: data.name,
          deliverable_types: data.deliverable_types,
          brief: data.description ?? null,
          has_plan: data.planning_mode ?? null,
        })
        .eq("id", data.projectId)
        .eq("created_by", user.id)
        .eq("status", "draft");
      if (updErr) {
        console.error("[ensureBriefingDraftProject] UPDATE error:", updErr);
        return { ok: false, error: "db", message: updErr.message };
      }

      const briefErr = await ensureProjectBriefRow(supabase, data.projectId, user.id);
      if (briefErr) {
        console.error(
          "[ensureBriefingDraftProject] project_briefs ensure failed:",
          briefErr,
        );
        return { ok: false, error: "db", message: `brief insert failed: ${briefErr}` };
      }

      revalidatePath("/[locale]/app/projects", "page");
      return { ok: true, projectId: data.projectId };
    }
    // existing missing OR existing.deleted_at set → fall through.
  }

  // ---------- Fresh INSERT (with defensive soft-delete) ----------
  //
  // hotfix-6 sub_2 simplification (yagi authorized after test-data
  // cleanup migration 20260504200002 wiped all in-flight brief drafts):
  // the action no longer reuses or actively wipes prior drafts. The
  // "새 프로젝트" mental model is the only path. We just defensively
  // soft-delete any dangling alive draft for (workspace, user, brief)
  // immediately before the INSERT — this is a 1-statement guard for
  // the edge case where two browser tabs race to create a draft for
  // the same (workspace, user) pair. Without it, the second INSERT
  // would hit the partial unique index `projects_wizard_draft_uniq`
  // (which after migration 20260504200000 only matches alive drafts)
  // and 23505. The soft-delete frees the unique slot.
  //
  // briefing_documents under the soft-deleted project become dangling
  // rows + dangling R2 objects (FU-Phase5-5 — R2 orphan cleanup,
  // deferred until a real-user signup or storage cost trigger).
  //
  // RLS bypass via service-role client (FU-Phase5-17, applied 2026-05-04):
  // The user-scoped client fails the projects_update WITH CHECK with 42501
  // because the policy explicitly denies any deleted_at write from non-
  // yagi_admin clients ("no writing deleted_at" — see
  // 20260427164421_phase_3_0_projects_lifecycle.sql section I).
  // The defensive soft-delete is data-integrity scaffolding (frees the
  // partial unique index slot before INSERT), not an authorization
  // surface, so RLS bypass is correct here. Authorization is preserved
  // via the explicit created_by = user.id + workspace_id = active.id
  // filter — service role can only ever wipe the caller's own dangling
  // drafts in the caller's active workspace.
  const sbAdmin = createSupabaseService();
  const { error: defensiveDelErr } = await sbAdmin
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("workspace_id", active.id)
    .eq("created_by", user.id)
    .eq("status", "draft")
    .eq("intake_mode", "brief")
    .is("deleted_at", null);
  if (defensiveDelErr) {
    console.error(
      "[ensureBriefingDraftProject] defensive soft-delete error:",
      defensiveDelErr,
    );
    return { ok: false, error: "db", message: defensiveDelErr.message };
  }

  // Fresh INSERT — unique slot is now free.
  const { data: project, error: insErr } = await sb
    .from("projects")
    .insert({
      workspace_id: active.id,
      created_by: user.id,
      project_type: "direct_commission" as const,
      kind: "direct" as const,
      status: "draft" as const,
      intake_mode: "brief" as const,
      title: data.name,
      deliverable_types: data.deliverable_types,
      brief: data.description ?? null,
      has_plan: data.planning_mode ?? null,
    })
    .select("id")
    .single();
  if (insErr || !project) {
    console.error(
      "[ensureBriefingDraftProject] INSERT error:",
      insErr,
    );
    return {
      ok: false,
      error: "db",
      message: insErr?.message ?? "insert failed",
    };
  }

  const briefErr = await ensureProjectBriefRow(supabase, project.id, user.id);
  if (briefErr) {
    console.error(
      "[ensureBriefingDraftProject] project_briefs insert failed (rolling back project):",
      briefErr,
    );
    await sbAdmin.from("projects").delete().eq("id", project.id);
    return {
      ok: false,
      error: "db",
      message: `brief insert failed: ${briefErr}`,
    };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, projectId: project.id };
}
