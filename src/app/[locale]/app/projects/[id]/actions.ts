"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getStudioContext } from "@/lib/workspace/studio-context.server";

// ---------------------------------------------------------------------------
// Phase 2.8.2 G_B2_A — admin soft delete + restore + permanent delete
// ---------------------------------------------------------------------------
// Soft delete stamps `deleted_at = now()`; the projects_read RLS hides the
// row from ws_member reads automatically (yagi_admin still sees it for the
// trash console). The cron job `projects-hard-delete-trash` purges rows
// older than 3 days that have no invoice references. Permanent delete is
// the same DELETE the cron does, just on demand.

const idSchema = z.object({ projectId: z.string().uuid() });

export async function softDeleteProject(formData: FormData) {
  const parsed = idSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success) return { error: "validation" as const };

  const auth = await getStudioContext();
  if (!auth.ok) return { error: auth.error };

  const { error: updateErr } = await auth.supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.projectId)
    .is("deleted_at", null);

  if (updateErr) return { error: "db" as const, message: updateErr.message };

  revalidatePath(`/[locale]/app/projects`, "page");
  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  revalidatePath(`/[locale]/app/admin/trash`, "page");
  return { ok: true as const };
}

export async function restoreProject(formData: FormData) {
  const parsed = idSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success) return { error: "validation" as const };

  const auth = await getStudioContext();
  if (!auth.ok) return { error: auth.error };

  const { error: updateErr } = await auth.supabase
    .from("projects")
    .update({ deleted_at: null })
    .eq("id", parsed.data.projectId);

  if (updateErr) return { error: "db" as const, message: updateErr.message };

  revalidatePath(`/[locale]/app/projects`, "page");
  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  revalidatePath(`/[locale]/app/admin/trash`, "page");
  return { ok: true as const };
}

export async function hardDeleteProject(formData: FormData) {
  const parsed = idSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success) return { error: "validation" as const };

  const auth = await getStudioContext();
  if (!auth.ok) return { error: auth.error };

  // Refuse to hard-delete if invoices reference the project — invoices_project_id_fkey
  // is ON DELETE RESTRICT, so the DB would reject it anyway, but we surface a
  // useful error code instead of a generic FK violation.
  const { count: invoiceCount } = await auth.supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("project_id", parsed.data.projectId);

  if ((invoiceCount ?? 0) > 0) {
    return { error: "has_invoices" as const };
  }

  const { error: deleteErr } = await auth.supabase
    .from("projects")
    .delete()
    .eq("id", parsed.data.projectId)
    .not("deleted_at", "is", null);

  if (deleteErr) return { error: "db" as const, message: deleteErr.message };

  revalidatePath(`/[locale]/app/admin/trash`, "page");
  return { ok: true as const };
}

export async function softDeleteProjectFormAction(formData: FormData): Promise<void> {
  await softDeleteProject(formData);
}
export async function restoreProjectFormAction(formData: FormData): Promise<void> {
  await restoreProject(formData);
}
export async function hardDeleteProjectFormAction(formData: FormData): Promise<void> {
  await hardDeleteProject(formData);
}
