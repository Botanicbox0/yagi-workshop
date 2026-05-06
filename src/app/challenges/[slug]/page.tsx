import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ChallengeState, SubmissionRequirements } from "@/lib/challenges/types";
import { getChallengeBySlug } from "@/lib/challenges/queries";
import { getSponsorCompanyName } from "@/lib/commission/queries";
import { computeUrgencyTier } from "@/lib/challenges/urgency";
import { statusPillClass } from "@/lib/ui/status-pill";
import { statusLabel } from "@/lib/ui/status-labels";
import { slugGradient } from "@/lib/ui/placeholder-gradient";
import { MarkdownRenderer } from "@/components/challenges/markdown-renderer";
import { StatusBanner } from "@/components/challenges/status-banner";
import { RequirementsDisplay } from "@/components/challenges/requirements-display";
import { TimelineDisplay } from "@/components/challenges/timeline-display";
import { PrimaryCtaButton } from "@/components/challenges/primary-cta-button";
import { ShareButton } from "@/components/challenges/share-button";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) return {};

  const descriptionRaw = (challenge.description_md ?? "")
    .replace(/[#*_`~\[\]()>!]/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 160);

  const shouldIndex =
    challenge.state === "open" || challenge.state === "closed_announced";

  return {
    title: `${challenge.title} · YAGI 챌린지`,
    description: descriptionRaw,
    openGraph: challenge.hero_media_url
      ? { images: [challenge.hero_media_url] }
      : undefined,
    robots: { index: shouldIndex, follow: true },
  };
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) notFound();

  const state = challenge.state as ChallengeState;
  const urgencyTier = computeUrgencyTier(challenge.close_at);
  const pillClass = statusPillClass("challenge", state);
  const label = statusLabel("challenge", state);

  const isVideo =
    typeof challenge.hero_media_url === "string" &&
    challenge.hero_media_url.endsWith(".mp4");

  let daysRemaining: number | null = null;
  if (state === "open" && challenge.close_at) {
    const diff =
      new Date(challenge.close_at).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const sponsorName = challenge.sponsor_client_id
    ? await getSponsorCompanyName(challenge.sponsor_client_id)
    : null;

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-12 space-y-10">
      {/* [1] Hero */}
      <section className="space-y-4">
        {challenge.hero_media_url ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
            {isVideo ? (
              <video
                src={challenge.hero_media_url}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              <Image
                src={challenge.hero_media_url}
                alt={challenge.title}
                fill
                className="object-cover"
                priority
              />
            )}
          </div>
        ) : (
          <div
            className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted"
            style={{ background: slugGradient(challenge.slug) }}
          >
            <div className="flex h-full items-center justify-center">
              <span className="font-semibold tracking-display-ko italic text-2xl text-foreground/70 px-6 text-center">
                {challenge.title}
              </span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass}`}
          >
            {label}
          </span>
          {state === "open" && daysRemaining !== null && (
            <span className="text-sm text-muted-foreground">
              마감까지 {daysRemaining}일
            </span>
          )}
          {sponsorName && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="opacity-60">Sponsored by</span>
              <span className="font-medium text-foreground">{sponsorName}</span>
            </span>
          )}
        </div>
        <h1 className="font-semibold tracking-display-ko italic text-3xl md:text-4xl leading-tight">
          {challenge.title}
        </h1>
      </section>

      {/* [2] Status Banner */}
      <StatusBanner
        state={state}
        closeAt={challenge.close_at}
        announceAt={challenge.announce_at}
        urgencyTier={urgencyTier}
      />

      {/* [3] Description */}
      {challenge.description_md && (
        <section>
          <MarkdownRenderer content={challenge.description_md} />
        </section>
      )}

      {/* [4] Requirements */}
      {challenge.submission_requirements && (
        <section>
          <RequirementsDisplay
            requirements={challenge.submission_requirements as SubmissionRequirements}
          />
        </section>
      )}

      {/* [5] Timeline */}
      <section>
        <TimelineDisplay
          openAt={challenge.open_at}
          closeAt={challenge.close_at}
          announceAt={challenge.announce_at}
        />
      </section>

      {/* [6] Primary CTA */}
      <section>
        <PrimaryCtaButton challenge={challenge} />
      </section>

      {/* [7] Secondary CTA row */}
      <section className="flex flex-wrap items-center gap-3">
        <Button size="pill" variant="outline" asChild>
          <Link href={`/challenges/${challenge.slug}/gallery`}>
            작품 보기
          </Link>
        </Button>
        <ShareButton slug={challenge.slug} title={challenge.title} />
      </section>
    </div>
  );
}
