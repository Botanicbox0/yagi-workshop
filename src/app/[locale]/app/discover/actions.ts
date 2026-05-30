"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { DEAL_USAGE_TYPES } from "@/lib/deals/constants";

const createDealSchema = z.object({
  personaId: z.string().uuid(),
  usageTypes: z
    .array(z.enum(DEAL_USAGE_TYPES))
    .min(1)
    .max(DEAL_USAGE_TYPES.length),
  brief: z.string().trim().max(1000).optional(),
  proposedBudget: z.coerce.number().int().nonnegative().optional().nullable(),
});

export type CreateDealActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "brand_required"
        | "db";
      message?: string;
    };

export async function createDealAction(
  input: unknown,
): Promise<CreateDealActionResult> {
  const parsed = createDealSchema.safeParse(input);
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
  if (active.kind !== "brand") return { ok: false, error: "brand_required" };

  const data = parsed.data;
  const budget =
    data.proposedBudget === null || Number.isNaN(data.proposedBudget)
      ? null
      : data.proposedBudget;

  const { data: dealId, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 9 RPC typegen pending
    supabase as any
  ).rpc("create_deal", {
    p_persona_id: data.personaId,
    p_brand_workspace_id: active.id,
    p_brief: data.brief?.trim() ? data.brief.trim() : null,
    p_proposed_budget: budget,
    p_usage_types: data.usageTypes,
  });

  if (error || !dealId) {
    console.error("[createDealAction] Supabase error:", error);
    return { ok: false, error: "db", message: error?.message ?? "rpc failed" };
  }

  revalidatePath("/[locale]/app/discover", "page");
  revalidatePath("/[locale]/app/deals", "page");
  return { ok: true, id: dealId as string };
}
