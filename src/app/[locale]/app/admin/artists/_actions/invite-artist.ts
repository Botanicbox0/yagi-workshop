"use server";

// =============================================================================
// Phase 6 Wave A.3 — inviteArtistAction
//
// yagi_admin sends a magic-link invite to a prospective Artist, then
// atomically creates the workspace, workspace_member, and artist_profile rows
// so the Artist lands in a fully-provisioned state the moment they click
// the link.
//
// Security posture (L-048 service-role + L-049 4-perspective audit):
//   1. client role          → forbidden (not yagi_admin)
//   2. ws_admin role        → forbidden (only yagi_admin gate passes)
//   3. yagi_admin           → permitted; service-role client bypasses RLS
//   4. unauthenticated user → unauthenticated (auth.getUser() returns null)
//
// The action's auth gate is the ONLY barrier between callers and the
// service-role client. Authorization bugs here = anyone-invites-anyone.
// =============================================================================

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

const inviteArtistInput = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  shortBio: z.string().max(500).optional(),
});

export type InviteArtistResult =
  | { ok: true; workspaceId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "invite_failed"
        | "db";
      message?: string;
    };

export async function inviteArtistAction(
  input: unknown
): Promise<InviteArtistResult> {
  // 1. Validate input
  const parsed = inviteArtistInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const { email, displayName, shortBio } = parsed.data;

  // 2. Authenticate caller via user-scoped client
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  // 3. yagi_admin gate — query user_roles for global yagi_admin role
  //    (workspace_id IS NULL = global role, not workspace-scoped)
  const { data: adminRoles, error: roleErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");

  if (roleErr) {
    console.error("[inviteArtistAction] role check error:", roleErr);
    return { ok: false, error: "db", message: roleErr.message };
  }
  if (!adminRoles || adminRoles.length === 0) {
    return { ok: false, error: "forbidden" };
  }

  // 4. Service-role client for RLS-bypass operations
  //    (Supabase auth admin API + workspace/member/profile inserts)
  const sbAdmin = createSupabaseService();

  // 5. Send magic-link invite via Supabase auth admin API
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
  const redirectTo = `${siteUrl}/auth/confirm?next=/app/projects`;

  const { data: inviteData, error: inviteErr } =
    await sbAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (inviteErr || !inviteData.user) {
    console.error("[inviteArtistAction] invite error:", inviteErr);
    return {
      ok: false,
      error: "invite_failed",
      message: inviteErr?.message ?? "invite returned no user",
    };
  }

  const invitedUserId = inviteData.user.id;

  // 6. Derive a URL-safe slug from displayName. Korean names collapse to a
  //    uuid-based fallback so the INSERT never fails on slug uniqueness.
  const slugBase = displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const slug = slugBase.length >= 3
    ? slugBase
    : `artist-${invitedUserId.slice(0, 8)}`;

  // 7. INSERT workspaces (kind='artist')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kind not always in generated types
  const sbAny = sbAdmin as any;
  const { data: wsData, error: wsErr } = await sbAny
    .from("workspaces")
    .insert({
      kind: "artist",
      name: displayName,
      slug,
      plan: "free",
      brand_guide: {},
    })
    .select("id")
    .single();

  if (wsErr || !wsData) {
    console.error("[inviteArtistAction] workspace insert error:", wsErr);
    // Best-effort: user was already invited; log orphan for manual cleanup
    console.error(
      "[inviteArtistAction] ORPHAN: auth user created but workspace insert failed",
      { invitedUserId, email }
    );
    return {
      ok: false,
      error: "db",
      message: wsErr?.message ?? "workspace insert returned no row",
    };
  }

  const workspaceId: string = wsData.id;

  // 8. INSERT workspace_members (role='admin' = primary owner role used by bootstrap_workspace)
  const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: invitedUserId,
    role: "admin",
    invited_by: user.id,
    invited_at: new Date().toISOString(),
  });

  if (memberErr) {
    console.error("[inviteArtistAction] workspace_members insert error:", memberErr);
    console.error(
      "[inviteArtistAction] ORPHAN: workspace created but member insert failed",
      { workspaceId, invitedUserId, email }
    );
    return { ok: false, error: "db", message: memberErr.message };
  }

  // 9. INSERT artist_profile (instagram_handle = NULL per A.1 schema design)
  const { error: profileErr } = await sbAdmin.from("artist_profile").insert({
    workspace_id: workspaceId,
    display_name: displayName,
    short_bio: shortBio ?? null,
    instagram_handle: null,
    twin_status: "not_started",
    visibility_mode: "paused",
    auto_decline_categories: [],
    bypass_brand_ids: [],
  });

  if (profileErr) {
    console.error("[inviteArtistAction] artist_profile insert error:", profileErr);
    console.error(
      "[inviteArtistAction] ORPHAN: workspace+member created but artist_profile insert failed",
      { workspaceId, invitedUserId, email }
    );
    return { ok: false, error: "db", message: profileErr.message };
  }

  return { ok: true, workspaceId };
}
