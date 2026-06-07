"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { getStudioContext } from "@/lib/workspace/studio-context.server";

const inviteAgencyInput = z.object({
  email: z.string().email(),
  agencyName: z.string().min(1).max(100),
  note: z.string().max(500).optional(),
});

const linkRosterInput = z.object({
  agencyWorkspaceId: z.string().uuid(),
  artistWorkspaceId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

const unlinkRosterInput = z.object({
  rosterId: z.string().uuid(),
});

export type InviteAgencyResult =
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

export type RosterActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "db";
      message?: string;
    };

async function requireYagiAdmin() {
  const studio = await getStudioContext();
  if (!studio.ok) {
    return { ok: false as const, error: studio.error };
  }
  return { ok: true as const, userId: studio.userId };
}

function agencySlug(agencyName: string, invitedUserId: string) {
  const slugBase = agencyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slugBase.length >= 3 ? slugBase : `agency-${invitedUserId.slice(0, 8)}`;
}

export async function inviteAgencyAction(
  input: unknown,
): Promise<InviteAgencyResult> {
  const parsed = inviteAgencyInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const gate = await requireYagiAdmin();
  if (!gate.ok) return gate;

  const { email, agencyName } = parsed.data;
  const sbAdmin = createSupabaseService();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
  const redirectTo = `${siteUrl}/auth/confirm?next=/app`;

  const { data: inviteData, error: inviteErr } =
    await sbAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (inviteErr || !inviteData.user) {
    console.error("[inviteAgencyAction] invite error:", inviteErr);
    return {
      ok: false,
      error: "invite_failed",
      message: inviteErr?.message ?? "invite returned no user",
    };
  }

  const invitedUserId = inviteData.user.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind type generation can lag migrations
  const sbAny = sbAdmin as any;
  const { data: wsData, error: wsErr } = await sbAny
    .from("workspaces")
    .insert({
      kind: "agency",
      name: agencyName,
      slug: agencySlug(agencyName, invitedUserId),
      plan: "free",
      brand_guide: {},
    })
    .select("id")
    .single();

  async function cleanupAuthUser() {
    const { error: delErr } = await sbAdmin.auth.admin.deleteUser(invitedUserId);
    if (delErr) {
      console.error(
        "[inviteAgencyAction] cleanup: auth.admin.deleteUser failed - manual reconcile needed",
        { invitedUserId, email, delErr },
      );
    }
  }

  async function cleanupWorkspace(workspaceId: string) {
    const { error: delErr } = await sbAdmin
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);
    if (delErr) {
      console.error(
        "[inviteAgencyAction] cleanup: workspaces delete failed - manual reconcile needed",
        { workspaceId, delErr },
      );
    }
  }

  if (wsErr || !wsData) {
    console.error("[inviteAgencyAction] workspace insert error:", wsErr);
    await cleanupAuthUser();
    return {
      ok: false,
      error: "db",
      message: wsErr?.message ?? "workspace insert returned no row",
    };
  }

  const workspaceId = wsData.id as string;
  const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: invitedUserId,
    role: "admin",
    invited_by: gate.userId,
    invited_at: new Date().toISOString(),
  });

  if (memberErr) {
    console.error("[inviteAgencyAction] workspace_members insert error:", memberErr);
    await cleanupWorkspace(workspaceId);
    await cleanupAuthUser();
    return { ok: false, error: "db", message: memberErr.message };
  }

  return { ok: true, workspaceId };
}

export async function linkAgencyArtistAction(
  input: unknown,
): Promise<RosterActionResult> {
  const parsed = linkRosterInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const gate = await requireYagiAdmin();
  if (!gate.ok) return gate;

  const { agencyWorkspaceId, artistWorkspaceId, note } = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema added by migration
    supabase as any
  )
    .from("agency_artist_roster")
    .upsert(
      {
        agency_workspace_id: agencyWorkspaceId,
        artist_workspace_id: artistWorkspaceId,
        linked_by: gate.userId,
        note: note?.trim() || null,
      },
      { onConflict: "agency_workspace_id,artist_workspace_id" },
    );

  if (error) {
    console.error("[linkAgencyArtistAction] upsert error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  return { ok: true };
}

export async function unlinkAgencyArtistAction(
  input: unknown,
): Promise<RosterActionResult> {
  const parsed = unlinkRosterInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const gate = await requireYagiAdmin();
  if (!gate.ok) return gate;

  const supabase = await createSupabaseServer();
  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema added by migration
    supabase as any
  )
    .from("agency_artist_roster")
    .delete()
    .eq("id", parsed.data.rosterId);

  if (error) {
    console.error("[unlinkAgencyArtistAction] delete error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  return { ok: true };
}
