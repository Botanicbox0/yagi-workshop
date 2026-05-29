"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

const duplicateProjectInput = z.object({
  projectId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export type DuplicateProjectResult =
  | { ok: true; projectId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "not_found"
        | "db";
      message?: string;
    };

type SourceProject = {
  id: string;
  title: string;
  workspace_id: string;
  brand_id: string | null;
  deliverable_types: string[];
  estimated_budget_range: string | null;
  proposal_budget_range: string | null;
  channels: string[];
  mood_keywords: string[];
  mood_keywords_free: string | null;
  visual_ratio: string | null;
  visual_ratio_custom: string | null;
  target_audience: string | null;
};

export async function duplicateProjectSkeleton(
  input: unknown,
): Promise<DuplicateProjectResult> {
  const parsed = duplicateProjectInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  // RLS gates this read to workspace admins/members, yagi_admin, or
  // project guests. We narrow below so guests cannot create a new project.
  const { data: sourceRaw, error: sourceErr } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag Phase 5 metadata columns
    supabase as any
  )
    .from("projects")
    .select(
      `
      id, title, workspace_id, brand_id,
      deliverable_types, estimated_budget_range, proposal_budget_range,
      channels, mood_keywords, mood_keywords_free,
      visual_ratio, visual_ratio_custom, target_audience
    `,
    )
    .eq("id", parsed.data.projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (sourceErr) {
    console.error("[duplicateProjectSkeleton] source read error", sourceErr);
    return { ok: false, error: "db", message: sourceErr.message };
  }
  if (!sourceRaw) return { ok: false, error: "not_found" };
  const source = sourceRaw as SourceProject;

  const [{ data: isYagiAdmin }, { data: membership }] = await Promise.all([
    supabase.rpc("is_yagi_admin", { uid: user.id }),
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", source.workspace_id)
      .eq("user_id", user.id)
      .in("role", ["admin", "member"])
      .maybeSingle(),
  ]);

  if (isYagiAdmin !== true && !membership) {
    return { ok: false, error: "forbidden" };
  }

  const title = parsed.data.title ?? `${source.title} (복제)`;
  const { data: clone, error: insertErr } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag Phase 5 metadata columns
    supabase as any
  )
    .from("projects")
    .insert({
      workspace_id: source.workspace_id,
      brand_id: source.brand_id,
      project_type: "direct_commission",
      kind: "direct",
      created_by: user.id,
      title,
      brief: null,
      deliverable_types: source.deliverable_types ?? [],
      estimated_budget_range: source.estimated_budget_range,
      proposal_budget_range: source.proposal_budget_range,
      proposal_goal: null,
      proposal_audience: null,
      proposal_timeline: null,
      channels: source.channels ?? [],
      mood_keywords: source.mood_keywords ?? [],
      mood_keywords_free: source.mood_keywords_free,
      visual_ratio: source.visual_ratio,
      visual_ratio_custom: source.visual_ratio_custom,
      target_audience: source.target_audience,
      status: "draft",
      // This clone is a room-level skeleton, not the single active wizard
      // draft. Keeping it out of the wizard-only unique index avoids deleting
      // or colliding with an in-progress intake draft.
      intake_mode: "proposal_request",
    })
    .select("id")
    .single();

  if (insertErr || !clone) {
    console.error("[duplicateProjectSkeleton] insert error", insertErr);
    return {
      ok: false,
      error: "db",
      message: insertErr?.message ?? "insert failed",
    };
  }

  const { error: briefErr } = await supabase.from("project_briefs").insert({
    project_id: clone.id,
    updated_by: user.id,
  });

  if (briefErr) {
    console.error(
      "[duplicateProjectSkeleton] project_briefs insert failed; rolling back project",
      briefErr,
    );
    await createSupabaseService().from("projects").delete().eq("id", clone.id);
    return {
      ok: false,
      error: "db",
      message: `brief insert failed: ${briefErr.message}`,
    };
  }

  revalidatePath("/[locale]/app/projects", "page");
  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  return { ok: true, projectId: clone.id as string };
}
