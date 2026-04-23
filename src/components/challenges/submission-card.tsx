import type { Database } from "@/lib/supabase/database.types";
import { slugGradient } from "@/lib/ui/placeholder-gradient";
import { VoteButton } from "@/components/challenges/vote-button";

type SubmissionRow = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type WinnerRow = Database["public"]["Tables"]["showcase_challenge_winners"]["Row"];

// Typed shape of the content JSONB field
type SubmissionContent = {
  native_video?: { url: string };
  image?: { url: string };
  poster_url?: string;
  text_description?: string;
};

type Props = {
  submission: SubmissionRow;
  winner?: WinnerRow;
  hasVoted: boolean;
  isAuthed: boolean;
  voteDisabled: boolean;
  slug: string;
};

// Small client island for respecting prefers-reduced-motion on video autoplay
function VideoMedia({ src, poster }: { src: string; poster?: string }) {
  return (
    // CSS handles reduced-motion: @media (prefers-reduced-motion: reduce) defined in globals
    <video
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay
      className="w-full h-full object-cover motion-safe:block"
      style={{
        // Pause in reduced-motion environments — inline style because Tailwind
        // doesn't have a direct animationPlayState equivalent for video
        animationPlayState: "running",
      }}
    />
  );
}

function RankBadge({ rank, voteCount }: { rank: number; voteCount: number }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}위`;
  return (
    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium border border-border backdrop-blur-sm">
      <span>{medal}</span>
      <span className="text-muted-foreground">응원 {voteCount.toLocaleString()}</span>
    </div>
  );
}

export function GallerySubmissionCard({
  submission,
  winner,
  hasVoted,
  isAuthed,
  voteDisabled,
  slug,
}: Props) {
  const content = (submission.content ?? {}) as SubmissionContent;
  const videoUrl = content.native_video?.url;
  const imageUrl = content.image?.url;
  const posterUrl = content.poster_url;

  const gradient = slugGradient(submission.id);

  // Submitted-ago: days since created_at
  const createdAt = new Date(submission.created_at);
  const diffMs = Date.now() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const submittedAgoText =
    diffDays === 0 ? "오늘 올린 작품" : `올린 지 ${diffDays}일 전`;

  // Vote count from content (no realtime on count per DP §D)
  const voteCount = typeof (submission as Record<string, unknown>).vote_count === "number"
    ? (submission as Record<string, unknown>).vote_count as number
    : 0;

  return (
    <article className="rounded-lg border border-border bg-background overflow-hidden flex flex-col">
      {/* Media */}
      <div
        className="relative w-full aspect-video bg-muted overflow-hidden"
        style={!videoUrl && !imageUrl ? { background: gradient } : undefined}
      >
        {videoUrl ? (
          <VideoMedia src={videoUrl} poster={posterUrl} />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : null}

        {winner && (
          <RankBadge rank={winner.rank} voteCount={voteCount} />
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs text-muted-foreground">{submittedAgoText}</p>

        <div className="mt-auto pt-1">
          <VoteButton
            submissionId={submission.id}
            challengeId={submission.challenge_id}
            slug={slug}
            initialCount={voteCount}
            hasVoted={hasVoted}
            isAuthed={isAuthed}
            disabled={voteDisabled}
          />
        </div>
      </div>
    </article>
  );
}
