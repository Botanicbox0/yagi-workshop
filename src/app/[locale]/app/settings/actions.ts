"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  validateHandle,
  HANDLE_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
} from "@/lib/handles/validate";

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(HANDLE_MIN_LENGTH)
    .max(HANDLE_MAX_LENGTH),
  locale: z.enum(["ko", "en"]),
});

export async function updateProfile(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };

  const handleErr = validateHandle(parsed.data.handle);
  if (handleErr) return { error: "handle" as const, kind: handleErr };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // Detect handle change vs. metadata-only update. Handle changes must go
  // through the change_handle RPC (enforces 90-day lock + anti-squatting
  // via handle_history).
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  const currentHandle = currentProfile?.handle ?? null;

  if (currentHandle && currentHandle !== parsed.data.handle) {
    const { error: rpcErr } = await (supabase.rpc as unknown as (
      fn: "change_handle",
      args: { new_handle_input: string }
    ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>)(
      "change_handle",
      { new_handle_input: parsed.data.handle }
    );
    if (rpcErr) {
      return { error: "handle_change" as const, message: rpcErr.message };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
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
