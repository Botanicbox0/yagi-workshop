"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const createBoardSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export async function createBoard(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = createBoardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // Phase 2.0 G4 #6 — Verify the caller can see this project before
  // creating a board against it. RLS on `projects` gates the SELECT,
  // so a hidden / nonexistent / cross-workspace project returns null.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: "project_not_found" };

  // Look up yagi-internal workspace id
  const { data: yagiWs } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", "yagi-internal")
    .maybeSingle();
  if (!yagiWs) return { ok: false, error: "yagi_internal_workspace_missing" };

  // Insert board (DB trigger will set workspace_id authoritatively)
  const { data, error } = await supabase
    .from("preprod_boards")
    .insert({
      project_id: parsed.data.projectId,
      workspace_id: yagiWs.id, // trigger overwrites; pass for type-safety
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[preprod] createBoard insert", error.message);
    return { ok: false, error: "create_failed" };
  }

  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/preprod`);
  }

  return { ok: true, id: data.id };
}
