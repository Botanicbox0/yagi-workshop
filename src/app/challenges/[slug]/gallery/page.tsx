import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ChallengeState } from "@/lib/challenges/types";
import { getChallengeBySlug, getChallengeGallery } from "@/lib/challenges/queries";
import { createSupabaseServer } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/challenges/gallery-grid";
import { GalleryRealtime } from "@/components/challenges/gallery-realtime";
import { GallerySubmissionCard } from "@/components/challenges/submission-card";
import { EmptyState } from "@/components/challenges/empty-state";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) return {};

  return {
    title: `${challenge.title} · 작품 보기 · YAGI 챌린지`,
    description: "창작자들의 응원 기다리는 작품들",
  };
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;

  const challenge = await getChallengeBySlug(slug);
  if (!challenge) notFound();

  const state = challenge.state as ChallengeState;

  const [galleryData, supabase] = await Promise.all([
    getChallengeGallery(challenge.id),
    createSupabaseServer(),
  ]);

  const { submissions, winners } = galleryData;

  // Compute which submission IDs the current user has already voted on
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userVotedIds = new Set<string>();
  if (user) {
    const { data: votes } = await supabase
      .from("challenge_votes")
      .select("submission_id")
      .eq("voter_id", user.id)
      .eq("challenge_id", challenge.id);

    if (votes) {
      userVotedIds = new Set(votes.map((v) => v.submission_id));
    }
  }

  const isAuthed = !!user;
  const showWinners =
    (state === "closed_announced" || state === "archived") && winners.length > 0;

  // Filter winners to only those with a matching submission in gallery
  const submissionIds = new Set(submissions.map((s) => s.id));
  const galleryWinners = winners.filter((w) => submissionIds.has(w.submission_id));
  const winnerSubmissions = galleryWinners
    .map((w) => submissions.find((s) => s.id === w.submission_id))
    .filter(Boolean) as (typeof submissions)[number][];
  const winnerMap = new Map(galleryWinners.map((w) => [w.submission_id, w]));

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-8 py-12 space-y-10">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {challenge.title}
        </h1>
        <p className="text-sm text-muted-foreground">작품 보기</p>
      </header>

      {/* Winners section — only for closed_announced / archived */}
      {showWinners && (
        <section id="winners" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              이번 챌린지의 주인공
            </h2>
            <p className="text-sm text-muted-foreground">
              창작자와 응원이 만난 작품들
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {winnerSubmissions.map((submission) => (
              <GallerySubmissionCard
                key={submission.id}
                submission={submission}
                winner={winnerMap.get(submission.id)}
                hasVoted={userVotedIds.has(submission.id)}
                isAuthed={isAuthed}
                voteDisabled={true}
                slug={slug}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main submissions grid */}
      {submissions.length === 0 ? (
        state === "open" ? (
          <EmptyState variant="no_open" cta={null} />
        ) : (
          <EmptyState variant="no_closed" />
        )
      ) : (
        <GalleryGrid
          challengeId={challenge.id}
          challengeState={state}
          slug={slug}
          initialSubmissions={submissions}
          winners={winners}
          userVotedIds={userVotedIds}
          isAuthed={isAuthed}
        />
      )}

      {/* Invisible realtime subscriber — triggers router.refresh() on new INSERT */}
      <GalleryRealtime challengeId={challenge.id} />
    </div>
  );
}
