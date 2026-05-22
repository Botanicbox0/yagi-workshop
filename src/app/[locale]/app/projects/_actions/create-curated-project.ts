"use server";

// =============================================================================
// Phase 8 Wave A.2.a — createCuratedProject
//
// workspace_admin OR yagi_admin 가 curated project (3rd Identity Extension
// mechanism, PRODUCT-MASTER §AE/§AG) 신규 생성. project_type='curated'.
//
// Auth gate: app-layer narrower than RLS (projects_insert allows is_ws_member
// which includes 'member' role). Curated 생성은 워크스페이스 admin 권한
// 의도이므로 server action 에서 'admin' 으로 narrowing.
// =============================================================================

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

const inputSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(200),
  brief: z.string().max(5000).optional(),
});

export type CreateCuratedProjectResult =
  | { ok: true; projectId: string }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "db";
      message?: string;
    };

export async function createCuratedProject(
  input: unknown
): Promise<CreateCuratedProjectResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const { workspaceId, title, brief } = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  // Auth: yagi_admin (global) OR workspace_admin (this workspace)
  const { data: yagiRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  const isYagiAdmin = (yagiRoles ?? []).length > 0;

  let isWsAdmin = false;
  if (!isYagiAdmin) {
    const { data: wmRow } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    isWsAdmin = wmRow?.role === "admin";
  }
  if (!isYagiAdmin && !isWsAdmin) {
    return { ok: false, error: "forbidden" };
  }

  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- project_type 'curated' not yet in generated types
  const sbAny = sbAdmin as any;
  const { data: project, error: insErr } = await sbAny
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      project_type: "curated",
      created_by: user.id,
      title,
      brief: brief ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (insErr) {
    return { ok: false, error: "db", message: insErr.message };
  }
  return { ok: true, projectId: project.id };
}
