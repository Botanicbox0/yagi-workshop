"use server";

// =============================================================================
// Phase 8 Wave A.2.a — sendGuestInvitation
//
// workspace_admin OR yagi_admin 가 특정 project 에 외부 협업자 (guest) 를 초대.
// Token 생성 + workspace_invitations INSERT (role='guest', project_id NOT NULL)
// + Resend email (fallback console.log). A.2.b UI 에서 호출.
//
// Auth gate: app-layer (is_ws_admin OR is_yagi_admin) — RLS 가 'member' 도
// 허용하지만 narrower 로 enforce. 인보이스 발행 같은 destructive operation
// 와 동급 권한 boundary.
// =============================================================================

import { z } from "zod";
import crypto from "node:crypto";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { getResend, EMAIL_FROM } from "@/lib/resend";

const inputSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  email: z.string().email().max(254),
});

export type SendGuestInvitationResult =
  | { ok: true; invitationId: string; inviteUrl: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "duplicate"
        | "project_not_in_workspace"
        | "db";
      message?: string;
    };

export async function sendGuestInvitation(
  input: unknown
): Promise<SendGuestInvitationResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const { workspaceId, projectId, email } = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  // Auth check: yagi_admin (global) OR workspace_admin (this workspace)
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

  // Verify project belongs to the workspace (defense against cross-workspace
  // grant — addresses FU-A1-001 surface; final invariant enforcement defers
  // to Wave B schema-layer CHECK trigger).
  const { data: project } = await sbAdmin
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.workspace_id !== workspaceId) {
    return { ok: false, error: "project_not_in_workspace" };
  }

  // Token = 48-char hex (lib/onboarding/actions.ts:102 pattern reuse)
  const token = crypto.randomBytes(24).toString("hex");

  const { data: inv, error: invErr } = await sbAdmin
    .from("workspace_invitations")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      email,
      role: "guest",
      token,
      invited_by: user.id,
    })
    .select("id")
    .single();

  if (invErr) {
    if (invErr.code === "23505") {
      return {
        ok: false,
        error: "duplicate",
        message: "Email already invited to this workspace",
      };
    }
    return { ok: false, error: "db", message: invErr.message };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
  const inviteUrl = `${siteUrl}/auth/accept-guest/${token}`;

  const resend = getResend();
  if (resend) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: "YAGI Workshop — Project collaboration invitation",
        text: `You've been invited to collaborate on a project at YAGI Workshop.\n\nAccept the invitation: ${inviteUrl}\n\nThis link expires in 14 days.`,
      });
    } catch (sendErr) {
      // Email failure is not fatal — invitation row exists with valid token.
      // Admin can manually share the inviteUrl if needed.
      console.error("[sendGuestInvitation] Resend send error:", sendErr);
    }
  } else {
    // lib/resend.ts pattern: getResend() returns null when RESEND_API_KEY missing.
    console.log("[sendGuestInvitation] Resend disabled, staged invite:", {
      email,
      inviteUrl,
    });
  }

  return { ok: true, invitationId: inv.id, inviteUrl };
}
