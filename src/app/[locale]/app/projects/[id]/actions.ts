"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.string().uuid(),
  newStatus: z.enum([
    "draft",
    "submitted",
    "in_discovery",
    "in_production",
    "in_revision",
    "delivered",
    "approved",
    "archived",
  ]),
});

// Allowed transitions per (role, currentStatus) → newStatus[]
// IMPORTANT: This map is duplicated in page.tsx (for rendering) and here (for enforcement).
// Keep them in sync.
const ALLOWED: Record<
  "workspace_admin" | "yagi_admin",
  Record<string, string[]>
> = {
  workspace_admin: {
    draft: ["submitted"],
    delivered: ["approved", "in_revision"],
  },
  yagi_admin: {
    submitted: ["in_discovery"],
    in_discovery: ["in_production"],
    in_production: ["delivered"],
    in_revision: ["delivered"],
    delivered: ["archived"],
    approved: ["archived"],
  },
};

export async function transitionStatus(formData: FormData) {
  const parsed = schema.safeParse({
    projectId: formData.get("projectId"),
    newStatus: formData.get("newStatus"),
  });
  if (!parsed.success) return { error: "validation" as const };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // Fetch project to know its workspace + current status
  const { data: project, error: fetchErr } = await supabase
    .from("projects")
    .select("id, status, workspace_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (fetchErr || !project) return { error: "not_found" as const };

  // Resolve user's roles (global + workspace-scoped)
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role, workspace_id")
    .eq("user_id", user.id);

  const roles = new Set(
    (roleRows ?? [])
      .filter(
        (r) =>
          r.workspace_id === null || r.workspace_id === project.workspace_id
      )
      .map((r) => r.role as string)
  );

  // Check if this (role × currentStatus → newStatus) is allowed
  const wsAdminCan =
    roles.has("workspace_admin") &&
    (ALLOWED.workspace_admin[project.status] ?? []).includes(
      parsed.data.newStatus
    );
  const yagiCan =
    roles.has("yagi_admin") &&
    (ALLOWED.yagi_admin[project.status] ?? []).includes(parsed.data.newStatus);

  if (!wsAdminCan && !yagiCan) return { error: "forbidden" as const };

  const { error: updateErr } = await supabase
    .from("projects")
    .update({ status: parsed.data.newStatus })
    .eq("id", project.id);

  if (updateErr) return { error: "db" as const, message: updateErr.message };

  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
  revalidatePath(`/[locale]/app/projects`, "page");
  return { ok: true as const };
}

// Form-action-compatible wrapper (Promise<void>). Server Components pass
// this directly to <form action={...}> which requires void return per
// React 19 / Next.js 15 RSC type rules. The result-returning version above
// is kept for callers that want to handle errors programmatically.
export async function transitionStatusFormAction(formData: FormData): Promise<void> {
  await transitionStatus(formData);
}
