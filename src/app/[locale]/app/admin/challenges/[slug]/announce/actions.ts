"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";

// MVP best-effort fan-out: notification_events INSERTs may partially succeed
// if a mid-sequence failure occurs. announceWinnersAction is safe to retry
// because showcase_challenge_winners has UNIQUE(submission_id); winner rows
// will be upserted and the challenge state UPDATE has an AND state= guard to
// prevent double-transition. Notification duplicates are the known residual
// risk — acceptable at current scale per SPEC Q-022 / §F.
//
// Known limitation: no plpgsql atomic transaction — MVP accepts best-effort.

type WinnerInput = { submissionId: string; rank: number };

export async function announceWinnersAction(
  challengeId: string,
  winners: WinnerInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  // ── Auth + admin guard ────────────────────────────────────────────────────
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isAdmin) return { ok: false, error: "forbidden" };

  // ── Validate input ────────────────────────────────────────────────────────
  if (!challengeId) return { ok: false, error: "invalid_input" };

  if (winners.length === 0) return { ok: false, error: "no_winners" };

  const ranks = winners.map((w) => w.rank);
  const uniqueRanks = new Set(ranks);
  if (uniqueRanks.size !== ranks.length) return { ok: false, error: "rank_collision" };

  for (const w of winners) {
    if (!Number.isInteger(w.rank) || w.rank < 1) {
      return { ok: false, error: "invalid_rank" };
    }
  }

  const svc = createSupabaseService();

  // ── Validate challenge state ──────────────────────────────────────────────
  const { data: challenge, error: challengeErr } = await svc
    .from("challenges")
    .select("id, slug, title, state")
    .eq("id", challengeId)
    .maybeSingle();

  if (challengeErr || !challenge) return { ok: false, error: "not_found" };
  if (challenge.state !== "closed_judging") {
    return { ok: false, error: "invalid_state" };
  }

  // ── Validate all submissions belong to this challenge ─────────────────────
  const submissionIds = winners.map((w) => w.submissionId);
  const { data: submissionRows, error: subErr } = await svc
    .from("challenge_submissions")
    .select("id, submitter_id")
    .eq("challenge_id", challengeId)
    .in("id", submissionIds);

  if (subErr) {
    console.error("[announce] submission lookup", subErr.message);
    return { ok: false, error: "submission_lookup_failed" };
  }

  const validSubIds = new Set((submissionRows ?? []).map((r) => r.id));
  for (const id of submissionIds) {
    if (!validSubIds.has(id)) {
      return { ok: false, error: "submission_not_in_challenge" };
    }
  }

  // ── Step 1: Upsert showcase_challenge_winners ─────────────────────────────
  const winnerRows = winners.map((w) => ({
    submission_id: w.submissionId,
    challenge_id: challengeId,
    rank: w.rank,
    announced_by: user.id,
    announced_at: new Date().toISOString(),
  }));

  const { error: winnerErr } = await svc
    .from("showcase_challenge_winners")
    .upsert(winnerRows, { onConflict: "submission_id" });

  if (winnerErr) {
    console.error("[announce] winner upsert", winnerErr.message);
    return { ok: false, error: "winner_insert_failed" };
  }

  // ── Step 2: Transition challenge state ────────────────────────────────────
  const { error: transitionErr } = await svc
    .from("challenges")
    .update({ state: "closed_announced", announce_at: new Date().toISOString() })
    .eq("id", challengeId)
    .eq("state", "closed_judging"); // double-check guard against race

  if (transitionErr) {
    console.error("[announce] state transition", transitionErr.message);
    return { ok: false, error: "transition_failed" };
  }

  // ── Step 3: Fan-out notifications to all submitters ───────────────────────
  const { data: allSubmissions, error: allSubErr } = await svc
    .from("challenge_submissions")
    .select("id, submitter_id")
    .eq("challenge_id", challengeId);

  if (allSubErr) {
    console.error("[announce] all submissions lookup", allSubErr.message);
    // State transition already committed — log and continue, don't fail.
  }

  const winnerSubmissionIds = new Set(submissionIds);

  const notifPromises = (allSubmissions ?? []).map((sub) => {
    const isWinner = winnerSubmissionIds.has(sub.id);
    const winnerEntry = isWinner
      ? winners.find((w) => w.submissionId === sub.id)
      : undefined;

    return emitNotification({
      user_id: sub.submitter_id,
      kind: isWinner ? "challenge_announced_winner" : "challenge_announced_participant",
      payload: {
        challenge_id: challengeId,
        challenge_slug: challenge.slug,
        challenge_title: challenge.title,
        ...(winnerEntry ? { rank: winnerEntry.rank } : {}),
      },
      url_path: `/challenges/${challenge.slug}`,
    });
  });

  await Promise.allSettled(notifPromises);

  // ── Revalidate caches ─────────────────────────────────────────────────────
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/admin/challenges`);
    revalidatePath(`/${locale}/app/admin/challenges/${challenge.slug}/announce`);
  }
  revalidatePath(`/challenges/${challenge.slug}`);
  revalidatePath(`/challenges/${challenge.slug}/gallery`);

  return { ok: true };
}
