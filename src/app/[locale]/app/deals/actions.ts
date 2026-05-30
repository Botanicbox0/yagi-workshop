"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

const transitionSchema = z.object({
  dealId: z.string().uuid(),
  toStatus: z.enum(["accepted", "negotiating", "declined"]),
  comment: z.string().trim().max(1000).optional(),
});

export type TransitionDealResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "artist_required"
        | "db";
      message?: string;
    };

export async function transitionDealAction(
  input: unknown,
): Promise<TransitionDealResult> {
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };
  if (active.kind !== "artist") return { ok: false, error: "artist_required" };

  const { error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 RPC typegen pending
    supabase as any
  ).rpc("transition_deal_status", {
    p_deal_id: parsed.data.dealId,
    p_to_status: parsed.data.toStatus,
    p_comment: parsed.data.comment?.trim() || null,
  });

  if (error) {
    console.error("[transitionDealAction] Supabase error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidatePath("/[locale]/app/deals", "page");
  revalidatePath("/[locale]/app/deals/[dealId]", "page");
  return { ok: true };
}
