"use server";

// =============================================================================
// Phase 5 Wave C C_3 — Detail page next-action server actions.
//
// Two thin RPC wrappers, both invoking transition_project_status:
//   - approveDeliveredAction   (delivered -> approved)   client-only matrix
//   - requestRevisionAction    (delivered -> in_revision) client-only matrix
//
// Both transitions are already in the Phase 3.0 truth table (client actor),
// so this Wave introduces no migration. The Wave B creator-first patch
// (20260504200001) means the workspace creator is resolved as 'client'
// even when they hold workspace_admin, so own-project recall + approve +
// revision flow goes through the client matrix consistently.
//
// requestRevisionAction's p_comment ≥10 chars rule is enforced by the
// RPC itself (RAISE EXCEPTION 'comment_required_min_10_chars' USING
// ERRCODE='22023'); the action layer also pre-validates so the user sees
// an inline error before round-tripping to Postgres.
//
// in_review 의 [자료 추가하기] modal calls the existing
// addBriefingDocumentAction from briefing-step2-actions.ts (Wave B sub_5).
// We do NOT duplicate that action here — the SPEC's "appendBriefingDocumentAction"
// shorthand maps to that pre-existing surface. NOTE: the briefing_documents
// INSERT RLS policy (Wave A sub_5 fix F2) currently requires parent
// status='draft'. An in_review caller will hit RLS denial and surface a
// 'forbidden' return; loosening RLS to allow ('draft','in_review') is
// FU-Phase5-16 (registered in Wave C result doc).
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

// ---------------------------------------------------------------------------
// Shared error mapping — same shape as recallProjectAction.
// ---------------------------------------------------------------------------

type RpcErrorCode = "forbidden" | "invalid_transition" | "comment_required" | "unknown";

function mapRpcError(rpcErr: { code?: string; message?: string }): RpcErrorCode {
  const code = (rpcErr.code ?? "") as string;
  if (code === "42501" || code === "P0002") return "forbidden";
  if (code === "23514") return "invalid_transition";
  if (code === "22023") return "comment_required";
  return "unknown";
}

// ===========================================================================
// 1. approveDeliveredAction — delivered -> approved
// ===========================================================================

const approveInput = z.object({
  projectId: z.string().uuid(),
});

export type ApproveDeliveredInput = z.input<typeof approveInput>;

export type ApproveDeliveredResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "no_workspace" | RpcErrorCode;
      message?: string;
    };

export async function approveDeliveredAction(
  input: unknown,
): Promise<ApproveDeliveredResult> {
  const parsed = approveInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  const sb = supabase as any;
  const { data: historyId, error: rpcErr } = await sb.rpc(
    "transition_project_status",
    {
      p_project_id: parsed.data.projectId,
      p_to_status: "approved",
    },
  );
  if (rpcErr) {
    console.error("[approveDeliveredAction] RPC error:", rpcErr);
    return { ok: false, error: mapRpcError(rpcErr), message: rpcErr.message };
  }
  if (!historyId) {
    return { ok: false, error: "unknown", message: "RPC returned null" };
  }

  revalidatePath("/[locale]/app/projects/[id]", "page");
  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true };
}

// ===========================================================================
// 2. requestRevisionAction — delivered -> in_revision (comment ≥ 10 chars)
// ===========================================================================

const revisionInput = z.object({
  projectId: z.string().uuid(),
  comment: z.string().trim().min(10).max(2000),
});

export type RequestRevisionInput = z.input<typeof revisionInput>;

export type RequestRevisionResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "no_workspace" | RpcErrorCode;
      message?: string;
    };

export async function requestRevisionAction(
  input: unknown,
): Promise<RequestRevisionResult> {
  const parsed = revisionInput.safeParse(input);
  if (!parsed.success) {
    // zod min(10) catches comment_required at the action layer, mirroring
    // the RPC's 22023 raise so the UX surface is identical.
    const isCommentLength = parsed.error.issues.some(
      (i) => i.path[0] === "comment",
    );
    return {
      ok: false,
      error: isCommentLength ? "comment_required" : "validation",
      message: parsed.error.message,
    };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  const sb = supabase as any;
  const { data: historyId, error: rpcErr } = await sb.rpc(
    "transition_project_status",
    {
      p_project_id: parsed.data.projectId,
      p_to_status: "in_revision",
      p_comment: parsed.data.comment,
    },
  );
  if (rpcErr) {
    console.error("[requestRevisionAction] RPC error:", rpcErr);
    return { ok: false, error: mapRpcError(rpcErr), message: rpcErr.message };
  }
  if (!historyId) {
    return { ok: false, error: "unknown", message: "RPC returned null" };
  }

  revalidatePath("/[locale]/app/projects/[id]", "page");
  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true };
}
