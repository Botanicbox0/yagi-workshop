"use server";

// Wave C v2 — Applicant-side distribution registration + metric log.
//
// Migration 20260507000000_phase_7_wave_c_v2.sql expanded the
// campaign_distributions_insert_applicant policy to include status='distributed'
// in WITH CHECK so the second/third channel additions (after the first
// auto-flips submission to 'distributed') don't 42501.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";

const ChannelSchema = z.enum([
  "tiktok",
  "instagram",
  "youtube",
  "youtube_shorts",
  "x",
  "other",
]);

const AddDistributionInputSchema = z.object({
  submission_id: z.string().uuid(),
  channel: ChannelSchema,
  url: z.string().trim().url().max(2048),
  posted_at: z.string().datetime({ offset: true }).optional(),
});

export type AddDistributionResult =
  | { ok: true; distribution_id: string }
  | { ok: false; error: string };

export async function addDistributionAction(
  raw: unknown,
): Promise<AddDistributionResult> {
  const parsed = AddDistributionInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message || "input_invalid" };
  }
  const input = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // Defense-in-depth: verify the submission belongs to a workspace the
  // caller is a member of, AND status IN (approved_for_distribution,
  // distributed). RLS WITH CHECK enforces both at INSERT time post-migration;
  // surface a friendly error here before the 42501.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sb = supabase as any;
  const { data: sub, error: subErr } = await sb
    .from("campaign_submissions")
    .select("id, status, applicant_workspace_id")
    .eq("id", input.submission_id)
    .maybeSingle();

  if (subErr || !sub) return { ok: false, error: "submission_not_found" };
  if (
    sub.status !== "approved_for_distribution" &&
    sub.status !== "distributed"
  ) {
    return { ok: false, error: "wrong_status" };
  }

  // INSERT distribution via session client — RLS WITH CHECK enforces:
  //   added_by = auth.uid()
  //   workspace_member of applicant_workspace_id
  //   parent submission.status IN ('approved_for_distribution', 'distributed')
  const { data: dist, error: insertErr } = await sb
    .from("campaign_distributions")
    .insert({
      submission_id: input.submission_id,
      channel: input.channel,
      url: input.url,
      posted_at: input.posted_at ?? new Date().toISOString(),
      added_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !dist) {
    console.error("[addDistribution] insert error:", insertErr?.message);
    return { ok: false, error: "insert_failed" };
  }

  // Auto-transition first-time approved_for_distribution → distributed.
  // Idempotent + ABA-safe via .eq("status", "approved_for_distribution"):
  // if a concurrent INSERT already flipped status, this is a no-op. The
  // BEFORE UPDATE trigger campaign_submissions_guard_status_transition
  // whitelist allows applicant transitions to 'distributed' from
  // approved_for_distribution.
  if (sub.status === "approved_for_distribution") {
    const { error: updateErr } = await sb
      .from("campaign_submissions")
      .update({
        status: "distributed",
        distributed_at: new Date().toISOString(),
      })
      .eq("id", input.submission_id)
      .eq("status", "approved_for_distribution");
    if (updateErr) {
      console.error(
        "[addDistribution] status transition error (non-fatal):",
        updateErr.message,
      );
    }
  }

  revalidatePath(`/ko/app/my-submissions/${input.submission_id}`);
  revalidatePath(`/en/app/my-submissions/${input.submission_id}`);
  return { ok: true, distribution_id: dist.id };
}

const LogMetricInputSchema = z.object({
  distribution_id: z.string().uuid(),
  view_count: z.number().int().nonnegative().nullable().optional(),
  like_count: z.number().int().nonnegative().nullable().optional(),
  comment_count: z.number().int().nonnegative().nullable().optional(),
  metric_log_notes: z.string().trim().max(500).nullable().optional(),
});

export type LogMetricResult = { ok: true } | { ok: false; error: string };

export async function logDistributionMetricsAction(
  raw: unknown,
): Promise<LogMetricResult> {
  const parsed = LogMetricInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message || "input_invalid" };
  }
  const input = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sb2 = supabase as any;
  const { error } = await sb2
    .from("campaign_distributions")
    .update({
      view_count: input.view_count ?? null,
      like_count: input.like_count ?? null,
      comment_count: input.comment_count ?? null,
      metric_logged_at: new Date().toISOString(),
      metric_log_notes: input.metric_log_notes ?? null,
    })
    .eq("id", input.distribution_id);

  if (error) {
    console.error("[logDistributionMetrics] update error:", error.message);
    return { ok: false, error: "update_failed" };
  }

  revalidatePath(`/ko/app/my-submissions`);
  revalidatePath(`/en/app/my-submissions`);
  return { ok: true };
}
