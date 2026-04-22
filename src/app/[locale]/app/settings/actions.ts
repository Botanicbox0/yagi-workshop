"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  handle: z.string().trim().min(2).max(40).regex(/^[a-z0-9_]+$/),
  locale: z.enum(["ko", "en"]),
});

export async function updateProfile(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      handle: parsed.data.handle,
      locale: parsed.data.locale,
    })
    .eq("id", user.id);

  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/settings`, "page");
  return { ok: true as const };
}

const avatarSchema = z.object({
  avatar_url: z.string().min(1),
});

export async function updateAvatarUrl(input: unknown) {
  const parsed = avatarSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data.avatar_url })
    .eq("id", user.id);

  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/settings`, "page");
  return { ok: true as const };
}

const workspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  tax_id: z.string().trim().optional().nullable(),
  tax_invoice_email: z.string().email().optional().nullable(),
});

export async function updateWorkspace(input: unknown) {
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // RLS enforces workspace_admin — no explicit role check here.
  const { error } = await supabase
    .from("workspaces")
    .update({
      name: parsed.data.name,
      tax_id: parsed.data.tax_id ?? null,
      tax_invoice_email: parsed.data.tax_invoice_email ?? null,
    })
    .eq("id", parsed.data.workspaceId);

  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/settings`, "page");
  return { ok: true as const };
}

const inviteSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["workspace_admin", "workspace_member"]),
});

export async function inviteMember(formData: FormData) {
  const parsed = inviteSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "validation" as const };
  // workspace_invites table absent in database.types — Phase 1.3 will wire email invites.
  return { error: "not_implemented" as const };
}

export async function removeMember(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const userId = formData.get("userId");
  if (typeof workspaceId !== "string" || typeof userId !== "string") {
    return { error: "validation" as const };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };
  if (user.id === userId) return { error: "self_remove" as const };

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/settings`, "page");
  return { ok: true as const };
}
