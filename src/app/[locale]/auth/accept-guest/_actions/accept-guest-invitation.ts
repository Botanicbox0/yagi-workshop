"use server";

// =============================================================================
// Phase 8 Wave A.2.a — acceptGuestInvitation
//
// Thin wrapper around accept_guest_invitation(p_token) PL/pgSQL SECURITY DEFINER
// RPC. Atomic 3-table mutation (workspace_members + project_guests +
// workspace_invitations.accepted_at) lives in DB function for transactional
// safety. Error codes map from RAISE EXCEPTION strings.
//
// Auth: user must be signed in (RPC checks auth.uid()). Email match (case-
// insensitive) enforced inside RPC.
// =============================================================================

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";

const inputSchema = z.object({
  token: z.string().min(48).max(48), // 24 bytes hex = 48 chars
});

export type AcceptGuestInvitationResult =
  | { ok: true; workspaceId: string; projectId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "user_not_found"
        | "invitation_not_found"
        | "wrong_invitation_kind"
        | "invitation_already_accepted"
        | "invitation_expired"
        | "invitation_email_mismatch"
        | "db";
      message?: string;
    };

const RPC_ERROR_MAP: Record<
  string,
  Extract<AcceptGuestInvitationResult, { ok: false }>["error"]
> = {
  unauthenticated: "unauthenticated",
  user_not_found: "user_not_found",
  invitation_not_found: "invitation_not_found",
  wrong_invitation_kind: "wrong_invitation_kind",
  invitation_already_accepted: "invitation_already_accepted",
  invitation_expired: "invitation_expired",
  invitation_email_mismatch: "invitation_email_mismatch",
};

export async function acceptGuestInvitation(
  input: unknown
): Promise<AcceptGuestInvitationResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const { token } = parsed.data;

  const supabase = await createSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC return type
  const sbAny = supabase as any;
  const { data, error } = await sbAny.rpc("accept_guest_invitation", {
    p_token: token,
  });

  if (error) {
    const known = RPC_ERROR_MAP[error.message];
    if (known) return { ok: false, error: known };
    console.error("[acceptGuestInvitation] RPC error:", error);
    return { ok: false, error: "db", message: error.message };
  }
  if (!data || !Array.isArray(data) || !data[0]) {
    return { ok: false, error: "db", message: "RPC returned no rows" };
  }

  return {
    ok: true,
    workspaceId: data[0].workspace_id,
    projectId: data[0].project_id,
  };
}
