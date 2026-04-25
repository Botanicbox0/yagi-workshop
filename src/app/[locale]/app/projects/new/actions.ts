"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

const sharedFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  brand_id: z.string().uuid().nullable().optional(),
  tone: z.string().max(500).optional().nullable(),
  // Phase 2.7.2: free-text tag list (was a closed enum). Maps to the
  // existing `deliverable_types text[]` Postgres column — no migration
  // needed; the meaning shifts from "format" to "intended use".
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .max(10)
    .default([]),
  estimated_budget_range: z.string().max(100).optional().nullable(),
  target_delivery_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  intent: z.enum(["draft", "submit"]).default("draft"),
};

const briefSchema = z.object({
  ...sharedFields,
  intake_mode: z.literal("brief"),
});

const proposalSchema = z.object({
  ...sharedFields,
  intake_mode: z.literal("proposal_request"),
  proposal_goal: z.string().trim().min(1, "required").max(800),
  proposal_audience: z.string().max(400).optional().or(z.literal("")),
  proposal_budget_range: z.string().max(100).optional().or(z.literal("")),
  proposal_timeline: z.string().max(200).optional().or(z.literal("")),
});

const createProjectSchema = z.discriminatedUnion("intake_mode", [
  briefSchema,
  proposalSchema,
]);

type ActionResult =
  | { ok: true; id: string; status: string }
  | {
      error: "validation";
      issues: z.ZodFormattedError<z.infer<typeof createProjectSchema>>;
    }
  | { error: "unauthenticated" }
  | { error: "no_workspace" }
  | { error: "db"; message: string };

export async function createProject(input: unknown): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.format() };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // Resolve workspace via workspace_members — no hardcoded IDs
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) return { error: "no_workspace" };

  const status = parsed.data.intent === "submit" ? "submitted" : "draft";

  // Column mapping notes:
  // - spec field `description` → DB column `brief` (no standalone `description` col)
  // - spec field `tone` → NO matching column on `projects`; omitted from insert
  // - `estimated_budget_range` matches exactly
  const data = parsed.data;

  const insertPayload = {
    workspace_id: membership.workspace_id,
    created_by: user.id,
    project_type: "direct_commission" as const,
    status,
    title: data.title,
    brief: data.description ?? null,
    brand_id: data.brand_id ?? null,
    deliverable_types: data.deliverable_types,
    estimated_budget_range: data.estimated_budget_range ?? null,
    target_delivery_at: data.target_delivery_at ?? null,
    intake_mode: data.intake_mode,
    proposal_goal:
      data.intake_mode === "proposal_request" ? data.proposal_goal : null,
    proposal_audience:
      data.intake_mode === "proposal_request"
        ? data.proposal_audience || null
        : null,
    proposal_budget_range:
      data.intake_mode === "proposal_request"
        ? data.proposal_budget_range || null
        : null,
    proposal_timeline:
      data.intake_mode === "proposal_request"
        ? data.proposal_timeline || null
        : null,
  };

  const { data: project, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !project) {
    console.error("[createProject] Supabase error:", error);
    return { error: "db", message: error?.message ?? "insert failed" };
  }

  // Phase 2.8 G_B-7: every new project gets a sibling project_briefs row
  // with empty content, so the Brief tab on /app/projects/[id] can mount
  // the editor immediately. RLS allows this INSERT because the caller
  // is the project's workspace member (just created the project above).
  //
  // K05-PHASE-2-8-04 fix: brief INSERT failure is now FATAL. If the
  // sibling row can't be created we roll back the project to avoid
  // leaving an orphan project that the Brief tab cannot edit (saveBrief
  // returns not_found when the row is missing — there is no lazy-create
  // path). Atomicity-via-RPC lands in Phase 2.8.1 (FU-2.8-saveversion-rollback
  // covers a related two-write atomicity gap).
  const { error: briefErr } = await supabase
    .from("project_briefs")
    .insert({
      project_id: project.id,
      // status / current_version / tiptap_schema_version use column defaults
      // (editing / 0 / 1) — required by validate_project_brief_change for
      // non-yagi_admin INSERT.
      updated_by: user.id,
    });
  if (briefErr) {
    console.error(
      "[createProject] project_briefs sibling insert failed (rolling back project):",
      briefErr
    );
    // K05-PHASE-2-8-LOOP2-03 fix: rollback DELETE must use the
    // service-role client. The user-scoped supabase client honors
    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
    // a non-yagi workspace_admin's rollback would be silently denied
    // and leave an orphan project. Service role bypasses RLS so the
    // rollback succeeds for all caller roles. Atomicity-via-RPC is
    // still the cleaner long-term fix (FU-2.8-saveversion-rollback).
    const service = createSupabaseService();
    const { error: rollbackErr } = await service
      .from("projects")
      .delete()
      .eq("id", project.id);
    if (rollbackErr) {
      console.error("[createProject] rollback DELETE failed:", rollbackErr);
    }
    return {
      error: "db",
      message: `brief insert failed: ${briefErr.message}`,
    };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, id: project.id, status };
}
