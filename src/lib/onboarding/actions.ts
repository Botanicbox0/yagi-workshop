"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import crypto from "node:crypto";

type Result = { error?: string };

export async function createProfileAction(formData: {
  handle: string;
  displayName: string;
  bio: string;
  locale: "ko" | "en";
  role: "client" | "creator";
}): Promise<Result> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    handle: formData.handle,
    display_name: formData.displayName,
    bio: formData.bio || null,
    locale: formData.locale,
  });
  if (profileError) return { error: profileError.message };

  if (formData.role === "creator") {
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "creator", workspace_id: null });
    if (roleError) return { error: roleError.message };
  }

  return {};
}

export async function createWorkspaceAction(formData: {
  name: string;
  slug: string;
}): Promise<Result & { workspaceId?: string }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  // Use bootstrap_workspace RPC to atomically create workspace + admin member + role.
  // This avoids the RLS SELECT-after-INSERT issue where the ws_read_members policy
  // would reject reading the just-inserted workspace row (user is not yet a member).
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: string | null; error: { message: string } | null }>)(
    "bootstrap_workspace",
    {
      p_name: formData.name,
      p_slug: formData.slug,
      p_logo_url: null,
    }
  );

  if (error) return { error: error.message };
  if (!data) return { error: "workspace_insert_failed" };

  return { workspaceId: data };
}

export async function createBrandAction(formData: {
  workspaceId: string;
  name: string;
  slug: string;
}): Promise<Result> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("brands").insert({
    workspace_id: formData.workspaceId,
    name: formData.name,
    slug: formData.slug,
  });
  if (error) return { error: error.message };
  return {};
}

export async function sendInvitationsAction(formData: {
  workspaceId: string;
  emails: string[];
  role: "admin" | "member";
}): Promise<Result> {
  if (formData.emails.length === 0) return {};
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const rows = formData.emails.map((email) => ({
    workspace_id: formData.workspaceId,
    email,
    role: formData.role,
    token: crypto.randomBytes(24).toString("hex"),
    invited_by: user.id,
  }));

  const { error } = await supabase.from("workspace_invitations").insert(rows);
  if (error) return { error: error.message };

  // TODO Phase 1.2: send actual email via Resend. For now, log to server console.
  console.log("[invitations] staged", rows.map((r) => r.email).join(", "));
  return {};
}
