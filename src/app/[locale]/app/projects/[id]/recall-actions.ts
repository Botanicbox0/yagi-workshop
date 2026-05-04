"use server";

// =============================================================================
// Phase 5 Wave B.5 — recallProjectAction
//
// Thin wrapper over transition_project_status RPC. The RPC handles all
// authorization (auth.uid() check + creator-first role resolution from
// Wave B's 20260504200001 migration) and validity (is_valid_transition
// matrix from this Wave's 20260504220000 migration). The action itself
// only:
//   1. Validates the input shape (uuid).
//   2. Calls the RPC with p_to_status='draft', p_comment=NULL.
//   3. Maps PostgrestError codes to a small discriminated-union return.
//   4. revalidatePath on success so the detail page + list update.
//
// Error mapping (per SPEC.md):
//   42501  -> 'forbidden'           (unauthenticated or not creator)
//   23514  -> 'invalid_transition'  (status outside recall window)
//   else   -> 'unknown'
//
// The RPC also raises P0002 (project_not_found) when the row is missing
// or hidden under RLS scope. SPEC names only the three codes above; we
// fold P0002 into 'forbidden' since the user-facing semantics are
// identical to "you can't act on this project". Logging preserves the
// distinction for debugging.
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const recallInput = z.object({
  projectId: z.string().uuid(),
});

export type RecallProjectInput = z.input<typeof recallInput>;

export type RecallProjectResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "forbidden" | "invalid_transition" | "unknown";
      message?: string;
    };

export async function recallProjectAction(
  input: unknown,
): Promise<RecallProjectResult> {
  const parsed = recallInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  const sb = supabase as any;

  const { data: historyId, error: rpcErr } = await sb.rpc(
    "transition_project_status",
    {
      p_project_id: parsed.data.projectId,
      p_to_status: "draft",
      // p_comment NULL — matrix marks comment_required=NO for both
      // Wave B.5 client recall rows (submitted->draft, in_review->draft).
    },
  );

  if (rpcErr) {
    console.error("[recallProjectAction] RPC error:", rpcErr);
    const code = (rpcErr.code ?? "") as string;
    const message = (rpcErr.message ?? "") as string;
    if (code === "42501") {
      return { ok: false, error: "forbidden", message };
    }
    if (code === "P0002") {
      // project_not_found — RLS scope or hard delete. Same UX as forbidden.
      return { ok: false, error: "forbidden", message };
    }
    if (code === "23514") {
      // invalid_transition — admin already moved the project past the
      // recall window (e.g., in_review -> in_progress).
      return { ok: false, error: "invalid_transition", message };
    }
    return { ok: false, error: "unknown", message };
  }

  if (!historyId) {
    return { ok: false, error: "unknown", message: "RPC returned null" };
  }

  // Detail page + list need to re-render against the new 'draft' status.
  revalidatePath("/[locale]/app/projects/[id]", "page");
  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true };
}
