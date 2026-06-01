"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  addCampaignDistribution,
  logCampaignDistributionMetrics,
  reviewCampaignSubmission,
  setCampaignWorkflowStatus,
} from "@/lib/campaigns/actions";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

const createCampaignSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional(),
  brief: z.string().trim().min(10).max(5000),
  desiredPrize: z
    .number()
    .int()
    .nonnegative()
    .optional(),
  desiredRecruit: z
    .number()
    .int()
    .nonnegative()
    .optional(),
  contactName: z.string().trim().min(1).max(80),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: z.string().trim().min(6).max(40),
  referenceNotes: z.string().trim().max(2000).optional(),
});

export type CreateCampaignResult =
  | { ok: true; id: string; slug: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "unsupported_workspace"
        | "db";
      message?: string;
    };

function createCampaignSlug() {
  return `campaign-${Date.now().toString(36)}-${crypto
    .randomBytes(3)
    .toString("hex")}`;
}

export async function createCampaignRequest(
  input: unknown,
): Promise<CreateCampaignResult> {
  const parsed = createCampaignSchema.safeParse(input);
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
  if (active.kind !== "brand") {
    return { ok: false, error: "unsupported_workspace" };
  }

  const data = parsed.data;
  const referenceAssets =
    data.referenceNotes && data.referenceNotes.length > 0
      ? { notes: data.referenceNotes }
      : null;

  // campaigns generated types are intentionally bypassed until the full
  // Supabase type refresh catches up with Phase 7 tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaign tables type regen pending
  const sb = supabase as any;
  const { data: campaign, error } = await sb
    .from("campaigns")
    .insert({
      slug: createCampaignSlug(),
      title: data.title,
      description: data.description || null,
      brief: data.brief,
      reference_assets: referenceAssets,
      sponsor_workspace_id: active.id,
      status: "requested",
      request_metadata: {
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
        desired_prize_krw: data.desiredPrize ?? null,
        desired_recruit_target: data.desiredRecruit ?? null,
        source: "app_campaigns_new",
      },
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("id, slug")
    .single();

  if (error || !campaign) {
    console.error("[createCampaignRequest] Supabase error:", error);
    return { ok: false, error: "db", message: error?.message ?? "insert failed" };
  }

  revalidatePath("/[locale]/app/campaigns", "page");
  return { ok: true, id: campaign.id, slug: campaign.slug };
}

export async function reviewCampaignSubmissionAction(input: unknown) {
  const supabase = await createSupabaseServer();
  const result = await reviewCampaignSubmission(supabase, input);
  if (result.ok) {
    revalidatePath("/[locale]/app/admin/campaigns", "page");
    revalidatePath("/[locale]/app/my-submissions", "page");
  }
  return result;
}

export async function addCampaignDistributionAction(input: unknown) {
  const supabase = await createSupabaseServer();
  const result = await addCampaignDistribution(supabase, input);
  if (result.ok) {
    revalidatePath("/[locale]/app/admin/campaigns", "page");
    revalidatePath("/[locale]/app/my-submissions", "page");
  }
  return result;
}

export async function logCampaignDistributionMetricsAction(input: unknown) {
  const supabase = await createSupabaseServer();
  const result = await logCampaignDistributionMetrics(supabase, input);
  if (result.ok) {
    revalidatePath("/[locale]/app/admin/campaigns", "page");
    revalidatePath("/[locale]/app/my-submissions", "page");
  }
  return result;
}

export async function setCampaignWorkflowStatusAction(input: unknown) {
  const supabase = await createSupabaseServer();
  const result = await setCampaignWorkflowStatus(supabase, input);
  if (result.ok) {
    revalidatePath("/[locale]/app/admin/campaigns", "page");
    revalidatePath("/[locale]/app/campaigns", "page");
  }
  return result;
}
