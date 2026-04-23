import type { Database } from "@/lib/supabase/database.types";
import type { ChallengeState } from "@/lib/challenges/types";
import { GallerySubmissionCard } from "@/components/challenges/submission-card";

type SubmissionRow = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type WinnerRow = Database["public"]["Tables"]["showcase_challenge_winners"]["Row"];

type Props = {
  challengeId: string;
  challengeState: ChallengeState;
  slug: string;
  initialSubmissions: SubmissionRow[];
  winners: WinnerRow[];
  userVotedIds: Set<string>;
  isAuthed: boolean;
};

export function GalleryGrid({
  challengeState,
  slug,
  initialSubmissions,
  winners,
  userVotedIds,
  isAuthed,
}: Props) {
  if (initialSubmissions.length === 0) return null;

  const winnerMap = new Map(winners.map((w) => [w.submission_id, w]));
  const voteDisabled = challengeState !== "open";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {initialSubmissions.map((submission) => (
        <GallerySubmissionCard
          key={submission.id}
          submission={submission}
          winner={winnerMap.get(submission.id)}
          hasVoted={userVotedIds.has(submission.id)}
          isAuthed={isAuthed}
          voteDisabled={voteDisabled}
          slug={slug}
        />
      ))}
    </div>
  );
}
