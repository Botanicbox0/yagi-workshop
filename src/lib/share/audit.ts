import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** SHA-256 of a share token; store the hash, never the raw token, in the audit log. */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Recipient-binding decision for a public-share write.
 *
 * - recipient null/blank: accepted as a legacy unbound share, but audited
 * - recipient set + match: accepted and audited as matched
 * - recipient set + differ: rejected and audited
 */
export function evaluateRecipientBinding(
  claimedEmail: string,
  recipientEmail: string | null | undefined,
): { allowed: boolean; matched: boolean } {
  const recipient = (recipientEmail ?? "").trim();
  if (recipient === "") return { allowed: true, matched: false };
  const matched = claimedEmail.trim().toLowerCase() === recipient.toLowerCase();
  return { allowed: matched, matched };
}

export type ShareAuditInput = {
  surface: "board" | "deliverable";
  action: "approve" | "review";
  targetId: string;
  deliverableId?: string | null;
  token: string;
  decision?: "approved" | "changes_requested" | null;
  claimedEmail: string | null;
  recipientEmail: string | null;
  recipientMatched: boolean;
  accepted: boolean;
  request: Request;
  ip: string;
};

/**
 * Append-only audit of a public-share write attempt.
 *
 * Best-effort: never throws; failures are logged so they cannot break the
 * user-facing response. Written via the service role, which bypasses RLS.
 */
export async function recordShareAction(
  svc: SupabaseClient<Database>,
  input: ShareAuditInput,
): Promise<void> {
  const userAgent = input.request.headers.get("user-agent") ?? null;
  try {
    const { error } = await svc.from("share_action_audit").insert({
      surface: input.surface,
      action: input.action,
      target_id: input.targetId,
      deliverable_id: input.deliverableId ?? null,
      token_hash: hashShareToken(input.token),
      decision: input.decision ?? null,
      claimed_email: input.claimedEmail,
      recipient_email: input.recipientEmail,
      recipient_matched: input.recipientMatched,
      accepted: input.accepted,
      ip: input.ip,
      user_agent: userAgent,
    });
    if (error) console.error("[share/audit] insert failed:", error);
  } catch (err) {
    console.error("[share/audit] insert failed:", err);
  }
}
