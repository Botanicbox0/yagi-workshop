"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

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

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, id: project.id, status };
}
