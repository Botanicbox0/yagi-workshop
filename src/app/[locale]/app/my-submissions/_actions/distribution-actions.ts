"use server";

// Phase 7 Wave C.3 — Applicant-side distribution registration + metric log.
//
// addDistributionAction:
//   Inserts campaign_distributions for the applicant's own submission via
//   the SESSION client. The migration's column-level INSERT GRANT and
//   campaign_distributions_insert_applicant RLS policy enforce:
//     - parent submission.status = 'approved_for_distribution'
//     - applicant_workspace_id is the caller's workspace
//     - added_by = auth.uid()
//   After insert, transitions the submission from 'approved_for_distribution'
//   → 'distributed' via the BEFORE UPDATE trigger
//   campaign_submissions_guard_status_transition (whitelisted as a legal
//   applicant transition, see migration 20260506000000).
//
// logDistributionMetricsAction:
//   Updates the metric columns the applicant is allowed to write per the
//   column-level GRANT (view_count / like_count / comment_count / metric_*).

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
  // caller is a member of, AND status = 'approved_for_distribution' or
  // 'distributed'. RLS enforces both at INSERT time, but surface a
  // friendly error here before the 42501.
  const { data: sub, error: subErr } = await supabase
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

  // INSERT distribution via session client — RLS WITH CHECK enforces
  // applicant scoping and parent-submission status.
  const { data: dist, error: insertErr } = await supabase
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

  // Transition submission status approved_for_distribution → distributed
  // (idempotent: trigger no-ops when status is already 'distributed').
  if (sub.status === "approved_for_distribution") {
    const { error: updateErr } = await supabase
      .from("campaign_submissions")
      .update({
        status: "distributed",
        distributed_at: new Date().toISOString(),
      })
      .eq("id", input.submission_id)
      .eq("status", "approved_for_distribution");
    if (updateErr) {
      // Status guard trigger may reject if a concurrent admin already moved
      // the row. Not fatal: the distribution row is committed; surface a
      // soft note in logs.
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

export type LogMetricResult =
  | { ok: true }
  | { ok: false; error: string };

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

  // Update via session client — column-level GRANT restricts the writable
  // columns; RLS USING enforces ownership through parent submission.
  const { error } = await supabase
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

  // Distribution row's parent submission_id isn't part of input; revalidate
  // both locales' my-submissions root for safety.
  revalidatePath(`/ko/app/my-submissions`);
  revalidatePath(`/en/app/my-submissions`);

  return { ok: true };
}
