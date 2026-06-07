import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseService } from "@/lib/supabase/service";
import { getStudioContext } from "@/lib/workspace/studio-context.server";

const CampaignDecisionSchema = z.enum([
  "approved",
  "declined",
  "revision_requested",
]);

const CampaignStatusSchema = z.enum([
  "submission_closed",
  "distributing",
  "archived",
]);

const ChannelSchema = z.enum([
  "tiktok",
  "instagram",
  "youtube",
  "youtube_shorts",
  "x",
  "other",
]);

const ReviewSubmissionSchema = z.object({
  campaignSlug: z.string().trim().min(1).max(160),
  submissionId: z.string().uuid(),
  decision: CampaignDecisionSchema,
  comment: z.string().trim().max(2000).optional(),
});

const AddDistributionSchema = z.object({
  campaignSlug: z.string().trim().min(1).max(160),
  submissionId: z.string().uuid(),
  channel: ChannelSchema,
  url: z.string().trim().url().max(2048),
  notes: z.string().trim().max(1000).optional(),
});

const LogMetricsSchema = z.object({
  campaignSlug: z.string().trim().min(1).max(160),
  distributionId: z.string().uuid(),
  viewCount: z.number().int().nonnegative().nullable().optional(),
  likeCount: z.number().int().nonnegative().nullable().optional(),
  commentCount: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const SetCampaignStatusSchema = z.object({
  campaignSlug: z.string().trim().min(1).max(160),
  status: CampaignStatusSchema,
});

export type CampaignWorkflowResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "campaign_not_found"
        | "submission_not_found"
        | "distribution_not_found"
        | "wrong_status"
        | "db";
      message?: string;
    };

async function requireYagiAdmin(
  _supabase: SupabaseClient<Database>,
): Promise<
  | { ok: true; userId: string }
  | Extract<CampaignWorkflowResult, { ok: false }>
> {
  const studio = await getStudioContext();
  if (!studio.ok) return { ok: false, error: studio.error };
  return { ok: true, userId: studio.userId };
}

function statusForDecision(
  decision: z.infer<typeof CampaignDecisionSchema>,
): "approved_for_distribution" | "declined" | "revision_requested" {
  if (decision === "approved") return "approved_for_distribution";
  return decision;
}

export async function reviewCampaignSubmission(
  supabase: SupabaseClient<Database>,
  raw: unknown,
): Promise<CampaignWorkflowResult> {
  const parsed = ReviewSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const admin = await requireYagiAdmin(supabase);
  if (!admin.ok) return admin;

  const input = parsed.data;
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaign tables type regen pending
  const sb = sbAdmin as any;

  const { data: submission, error: subErr } = await sb
    .from("campaign_submissions")
    .select("id, status, campaign:campaigns!inner(id, slug)")
    .eq("id", input.submissionId)
    .eq("campaigns.slug", input.campaignSlug)
    .maybeSingle();

  if (subErr || !submission) {
    return { ok: false, error: "submission_not_found" };
  }
  if (submission.status !== "submitted") {
    return { ok: false, error: "wrong_status" };
  }

  const decisionStatus = statusForDecision(input.decision);
  const now = new Date().toISOString();
  const { error: decisionErr } = await sb
    .from("campaign_review_decisions")
    .insert({
      submission_id: input.submissionId,
      reviewer_user_id: admin.userId,
      decision: input.decision,
      comment: input.comment || null,
    });

  if (decisionErr) {
    console.error("[reviewCampaignSubmission] decision insert:", decisionErr.message);
    return { ok: false, error: "db", message: decisionErr.message };
  }

  const patch: Record<string, string | null> = {
    status: decisionStatus,
    approved_at: input.decision === "approved" ? now : null,
    declined_at: input.decision === "declined" ? now : null,
  };
  const { error: updateErr } = await sb
    .from("campaign_submissions")
    .update(patch)
    .eq("id", input.submissionId)
    .eq("status", "submitted");

  if (updateErr) {
    console.error("[reviewCampaignSubmission] submission update:", updateErr.message);
    return { ok: false, error: "db", message: updateErr.message };
  }

  return { ok: true };
}

export async function addCampaignDistribution(
  supabase: SupabaseClient<Database>,
  raw: unknown,
): Promise<CampaignWorkflowResult> {
  const parsed = AddDistributionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const admin = await requireYagiAdmin(supabase);
  if (!admin.ok) return admin;

  const input = parsed.data;
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaign tables type regen pending
  const sb = sbAdmin as any;

  const { data: submission, error: subErr } = await sb
    .from("campaign_submissions")
    .select("id, status, campaign:campaigns!inner(id, slug)")
    .eq("id", input.submissionId)
    .eq("campaigns.slug", input.campaignSlug)
    .maybeSingle();

  if (subErr || !submission) {
    return { ok: false, error: "submission_not_found" };
  }
  if (
    submission.status !== "approved_for_distribution" &&
    submission.status !== "distributed"
  ) {
    return { ok: false, error: "wrong_status" };
  }

  const { error: insertErr } = await sb.from("campaign_distributions").insert({
    submission_id: input.submissionId,
    channel: input.channel,
    url: input.url,
    added_by: admin.userId,
    notes: input.notes || null,
  });
  if (insertErr) {
    console.error("[addCampaignDistribution] insert:", insertErr.message);
    return { ok: false, error: "db", message: insertErr.message };
  }

  if (submission.status === "approved_for_distribution") {
    const { error: updateErr } = await sb
      .from("campaign_submissions")
      .update({
        status: "distributed",
        distributed_at: new Date().toISOString(),
      })
      .eq("id", input.submissionId)
      .eq("status", "approved_for_distribution");
    if (updateErr) {
      console.error("[addCampaignDistribution] submission update:", updateErr.message);
      return { ok: false, error: "db", message: updateErr.message };
    }
  }

  return { ok: true };
}

export async function logCampaignDistributionMetrics(
  supabase: SupabaseClient<Database>,
  raw: unknown,
): Promise<CampaignWorkflowResult> {
  const parsed = LogMetricsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const admin = await requireYagiAdmin(supabase);
  if (!admin.ok) return admin;

  const input = parsed.data;
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaign tables type regen pending
  const sb = sbAdmin as any;

  const { data: dist, error: distErr } = await sb
    .from("campaign_distributions")
    .select("id, submission:campaign_submissions!inner(campaign:campaigns!inner(slug))")
    .eq("id", input.distributionId)
    .eq("campaign_submissions.campaigns.slug", input.campaignSlug)
    .maybeSingle();
  if (distErr || !dist) {
    return { ok: false, error: "distribution_not_found" };
  }

  const { error } = await sb
    .from("campaign_distributions")
    .update({
      view_count: input.viewCount ?? null,
      like_count: input.likeCount ?? null,
      comment_count: input.commentCount ?? null,
      metric_logged_at: new Date().toISOString(),
      metric_log_notes: input.notes ?? null,
    })
    .eq("id", input.distributionId);

  if (error) {
    console.error("[logCampaignDistributionMetrics] update:", error.message);
    return { ok: false, error: "db", message: error.message };
  }

  return { ok: true };
}

export async function setCampaignWorkflowStatus(
  supabase: SupabaseClient<Database>,
  raw: unknown,
): Promise<CampaignWorkflowResult> {
  const parsed = SetCampaignStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const admin = await requireYagiAdmin(supabase);
  if (!admin.ok) return admin;

  const input = parsed.data;
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaign tables type regen pending
  const sb = sbAdmin as any;

  const { data: campaign, error: campaignErr } = await sb
    .from("campaigns")
    .select("id, status")
    .eq("slug", input.campaignSlug)
    .maybeSingle();
  if (campaignErr || !campaign) {
    return { ok: false, error: "campaign_not_found" };
  }

  const allowed: Record<string, string[]> = {
    submission_closed: ["published", "submission_closed"],
    distributing: ["submission_closed", "published", "distributing"],
    archived: ["published", "submission_closed", "distributing", "archived"],
  };
  if (!allowed[input.status].includes(campaign.status)) {
    return { ok: false, error: "wrong_status" };
  }

  const patch: Record<string, string> = {
    status: input.status,
  };
  if (input.status === "distributing" && campaign.status !== "distributing") {
    patch.distribution_starts_at = new Date().toISOString();
  }

  const { error } = await sb.from("campaigns").update(patch).eq("id", campaign.id);

  if (error) {
    console.error("[setCampaignWorkflowStatus] update:", error.message);
    return { ok: false, error: "db", message: error.message };
  }

  return { ok: true };
}
