"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SubmissionRequirementsBuilder } from "@/components/admin/challenges/submission-requirements-builder";
import { JudgingConfigBuilder } from "@/components/admin/challenges/judging-config-builder";
import { updateChallengeAction, transitionChallengeStateAction } from "@/app/[locale]/app/admin/challenges/actions";
import { allowedNextStates } from "@/lib/challenges/state-machine";
import type { ChallengeState, SubmissionRequirements, JudgingConfig } from "@/lib/challenges/types";

const STATE_LABELS: Record<ChallengeState, string> = {
  draft: "초안",
  open: "공개",
  closed_judging: "심사 중",
  closed_announced: "발표 완료",
  archived: "보관됨",
};

type Props = {
  challenge: {
    slug: string;
    title: string;
    description_md: string;
    hero_media_url: string;
    open_at: string;
    close_at: string;
    announce_at: string;
    state: ChallengeState;
    submission_requirements: SubmissionRequirements;
    judging_config: JudgingConfig;
  };
};

export function ChallengeEditForm({ challenge }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTransitioning, startTransitionState] = useTransition();

  const isDraft = challenge.state === "draft";

  const [slug, setSlug] = useState(challenge.slug);
  const [title, setTitle] = useState(challenge.title);
  const [descriptionMd, setDescriptionMd] = useState(challenge.description_md);
  const [heroMediaUrl, setHeroMediaUrl] = useState(challenge.hero_media_url);
  const [openAt, setOpenAt] = useState(challenge.open_at);
  const [closeAt, setCloseAt] = useState(challenge.close_at);
  const [announceAt, setAnnounceAt] = useState(challenge.announce_at);
  const [submissionRequirements, setSubmissionRequirements] = useState<SubmissionRequirements>(
    challenge.submission_requirements,
  );
  const [judgingConfig, setJudgingConfig] = useState<JudgingConfig>(challenge.judging_config);

  const nextStates = allowedNextStates(challenge.state).filter(
    (s) => s !== "closed_announced" && s !== "archived",
  );

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateChallengeAction(challenge.slug, {
        slug: slug !== challenge.slug ? slug : undefined,
        title,
        description_md: descriptionMd || null,
        hero_media_url: heroMediaUrl || null,
        open_at: openAt || null,
        close_at: closeAt || null,
        announce_at: announceAt || null,
        submission_requirements: submissionRequirements,
        judging_config: judgingConfig,
      });

      if (!result.ok) {
        toast.error(result.error === "slug_locked"
          ? "슬러그는 초안 상태에서만 수정할 수 있어요."
          : result.error);
        return;
      }

      toast.success("저장되었습니다.");
      const finalSlug = slug !== challenge.slug ? slug : challenge.slug;
      router.push(`/${locale}/app/admin/challenges/${finalSlug}/edit`);
      router.refresh();
    });
  }

  function handleTransition(to: ChallengeState) {
    startTransitionState(async () => {
      const result = await transitionChallengeStateAction(challenge.slug, to);
      if (!result.ok) {
        toast.error(result.error === "invalid_transition"
          ? "유효하지 않은 상태 전환입니다."
          : result.error);
        return;
      }
      toast.success(`상태가 "${STATE_LABELS[to]}"(으)로 변경되었습니다.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* State panel */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">현재 상태</span>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium">
            {STATE_LABELS[challenge.state]}
          </span>
        </div>
        {nextStates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nextStates.map((next) => (
              <Button
                key={next}
                size="sm"
                variant="outline"
                disabled={isTransitioning}
                onClick={() => handleTransition(next)}
                className="focus-visible:ring-1 focus-visible:ring-ring"
              >
                → {STATE_LABELS[next as ChallengeState]}
              </Button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="slug">
            슬러그
            {!isDraft && (
              <span className="ml-2 text-xs text-muted-foreground">(잠금)</span>
            )}
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            readOnly={!isDraft}
            disabled={!isDraft}
            minLength={3}
            maxLength={50}
            required
            title={!isDraft ? "슬러그는 초안 상태에서만 수정할 수 있어요." : undefined}
            className={!isDraft ? "cursor-not-allowed opacity-60" : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description_md">설명 (Markdown)</Label>
          <Textarea
            id="description_md"
            value={descriptionMd}
            onChange={(e) => setDescriptionMd(e.target.value)}
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hero_media_url">대표 이미지 URL (선택)</Label>
          <Input
            id="hero_media_url"
            type="url"
            value={heroMediaUrl}
            onChange={(e) => setHeroMediaUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="open_at">공개 시작일</Label>
            <Input
              id="open_at"
              type="datetime-local"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="close_at">마감일</Label>
            <Input
              id="close_at"
              type="datetime-local"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announce_at">발표일</Label>
            <Input
              id="announce_at"
              type="datetime-local"
              value={announceAt}
              onChange={(e) => setAnnounceAt(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-2">
          <SubmissionRequirementsBuilder
            value={submissionRequirements}
            onChange={setSubmissionRequirements}
          />
        </div>

        <div className="rounded-lg border border-border p-4 space-y-2">
          <JudgingConfigBuilder value={judgingConfig} onChange={setJudgingConfig} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="pill" disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}
