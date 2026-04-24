import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getChallengeBySlug } from "@/lib/challenges/queries";
import { getExistingSubmission } from "@/lib/challenges/submissions";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PublicChrome } from "@/components/challenges/public-chrome";
import { SubmissionForm } from "@/components/challenges/submission-form";
import { Button } from "@/components/ui/button";
import { statusPillClass } from "@/lib/ui/status-pill";
import { statusLabel } from "@/lib/ui/status-labels";
import type { ChallengeState } from "@/lib/challenges/types";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) return {};
  return {
    title: `작품 올리기 · ${challenge.title} · YAGI`,
    robots: { index: false, follow: false },
  };
}

export default async function SubmitPage({ params }: Props) {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) notFound();

  const state = challenge.state as ChallengeState;
  const pillClass = statusPillClass("challenge", state);
  const label = statusLabel("challenge", state);

  if (state !== "open") {
    return (
      <PublicChrome>
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass}`}
            >
              {label}
            </span>
          </div>
          <h1 className="font-display italic text-2xl">
            이 챌린지는 지금 작품을 받을 수 없어요
          </h1>
          <p className="text-muted-foreground text-sm">
            챌린지가 종료됐거나 심사 중이에요.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="pill" variant="outline" asChild>
              <Link href={`/challenges/${slug}`}>챌린지 보기</Link>
            </Button>
            <Button size="pill" variant="ghost" asChild>
              <Link href="/challenges">모든 챌린지</Link>
            </Button>
          </div>
        </div>
      </PublicChrome>
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(`/challenges/${slug}/submit`)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? null;

  if (role === "observer") {
    redirect(
      `/onboarding/role?next=${encodeURIComponent(`/challenges/${slug}/submit`)}`
    );
  }

  if (role !== "creator" && role !== "studio") {
    return (
      <PublicChrome>
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
          <h1 className="font-display italic text-2xl">
            프로필을 먼저 완성해주세요
          </h1>
          <p className="text-muted-foreground text-sm">
            챌린지에 작품을 올리려면 프로필 설정이 필요해요.
          </p>
          <Button size="pill" asChild>
            <Link href="/onboarding/profile">프로필 설정하기</Link>
          </Button>
        </div>
      </PublicChrome>
    );
  }

  const existing = await getExistingSubmission(challenge.id, user.id);
  if (existing) {
    return (
      <PublicChrome>
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
          <h1 className="font-display italic text-2xl">
            이미 작품 올렸어요
          </h1>
          <p className="text-muted-foreground text-sm">
            이 챌린지에는 작품을 하나만 올릴 수 있어요.
          </p>
          <Button size="pill" variant="outline" asChild>
            <Link href={`/challenges/${slug}/gallery#submission-${existing.id}`}>
              내 작품 보기
            </Link>
          </Button>
        </div>
      </PublicChrome>
    );
  }

  return (
    <PublicChrome>
      <div className="max-w-2xl mx-auto px-6 md:px-8 py-12 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass}`}
            >
              {label}
            </span>
          </div>
          <h1 className="font-display italic text-2xl md:text-3xl leading-tight">
            {challenge.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            작품을 올리면 바로 공개돼요.
          </p>
        </div>
        <SubmissionForm challenge={challenge as ChallengeRow} />
      </div>
    </PublicChrome>
  );
}
