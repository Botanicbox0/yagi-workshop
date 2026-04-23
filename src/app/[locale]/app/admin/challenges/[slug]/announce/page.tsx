import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getChallengeBySlug, getChallengeGallery } from "@/lib/challenges/queries";
import type { ChallengeState, JudgingConfig } from "@/lib/challenges/types";
import type { Database } from "@/lib/supabase/database.types";
import { AnnounceIsland } from "./announce-island";

export const dynamic = "force-dynamic";

type SubmissionRow = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type WinnerRow = Database["public"]["Tables"]["showcase_challenge_winners"]["Row"];
type JudgmentRow = Database["public"]["Tables"]["challenge_judgments"]["Row"];

export default async function AdminAnnounceChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();

  const challenge = await getChallengeBySlug(slug);

  if (!challenge) {
    redirect({ href: "/app/admin/challenges", locale });
    return null;
  }

  const state = challenge.state as ChallengeState;
  if (state !== "closed_judging" && state !== "closed_announced") {
    redirect({ href: `/app/admin/challenges/${slug}/judge`, locale });
    return null;
  }

  const supabase = await createSupabaseServer();

  const { winners } = await getChallengeGallery(challenge.id);

  // Load all submissions regardless of status (admin view, not just 'ready')
  const { data: allSubmissions } = await supabase
    .from("challenge_submissions")
    .select("*")
    .eq("challenge_id", challenge.id)
    .order("created_at", { ascending: true });

  // Load admin judgments
  const { data: judgments } = await supabase
    .from("challenge_judgments")
    .select("*")
    .eq("challenge_id", challenge.id);

  // Load vote counts if judging mode involves public votes
  const judgingConfig = challenge.judging_config as JudgingConfig;
  let voteCounts: { submission_id: string; count: number }[] = [];
  if (judgingConfig.mode === "public_vote" || judgingConfig.mode === "hybrid") {
    const { data: voteRows } = await supabase
      .from("challenge_votes")
      .select("submission_id")
      .eq("challenge_id", challenge.id);

    if (voteRows) {
      const countMap = new Map<string, number>();
      for (const v of voteRows) {
        countMap.set(v.submission_id, (countMap.get(v.submission_id) ?? 0) + 1);
      }
      voteCounts = Array.from(countMap.entries()).map(([submission_id, count]) => ({
        submission_id,
        count,
      }));
    }
  }

  return (
    <div className="max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">결과 발표</h1>
          <p className="mt-1 text-sm text-muted-foreground">{challenge.title}</p>
        </div>
      </div>

      <AnnounceIsland
        challengeId={challenge.id}
        challengeSlug={slug}
        challengeState={state}
        submissions={(allSubmissions ?? []) as SubmissionRow[]}
        existingWinners={winners as WinnerRow[]}
        judgments={(judgments ?? []) as JudgmentRow[]}
        voteCounts={voteCounts}
        judgingMode={judgingConfig.mode}
      />
    </div>
  );
}
