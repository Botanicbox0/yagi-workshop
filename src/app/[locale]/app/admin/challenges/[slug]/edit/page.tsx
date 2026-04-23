import { notFound } from "next/navigation";
import { getChallengeBySlug } from "@/lib/challenges/queries";
import type { ChallengeState, SubmissionRequirements, JudgingConfig } from "@/lib/challenges/types";
import { ChallengeEditForm } from "./challenge-edit-form";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export default async function EditChallengePage({ params }: Props) {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <h1 className="text-xl font-semibold">챌린지 편집</h1>
      <ChallengeEditForm
        challenge={{
          slug: challenge.slug,
          title: challenge.title,
          description_md: challenge.description_md ?? "",
          hero_media_url: challenge.hero_media_url ?? "",
          open_at: challenge.open_at ? challenge.open_at.slice(0, 16) : "",
          close_at: challenge.close_at ? challenge.close_at.slice(0, 16) : "",
          announce_at: challenge.announce_at ? challenge.announce_at.slice(0, 16) : "",
          state: challenge.state as ChallengeState,
          submission_requirements: challenge.submission_requirements as unknown as SubmissionRequirements,
          judging_config: challenge.judging_config as unknown as JudgingConfig,
        }}
      />
    </div>
  );
}
