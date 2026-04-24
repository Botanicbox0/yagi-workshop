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
import { createChallengeAction } from "@/app/[locale]/app/admin/challenges/actions";
import type { SubmissionRequirements, JudgingConfig } from "@/lib/challenges/types";

const DEFAULT_SUBMISSION_REQUIREMENTS: SubmissionRequirements = {
  text_description: { required: true, min_chars: 50, max_chars: 2000 },
};

const DEFAULT_JUDGING_CONFIG: JudgingConfig = { mode: "hybrid", admin_weight: 70 };

export default function NewChallengePage() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [heroMediaUrl, setHeroMediaUrl] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [announceAt, setAnnounceAt] = useState("");
  const [submissionRequirements, setSubmissionRequirements] = useState<SubmissionRequirements>(
    DEFAULT_SUBMISSION_REQUIREMENTS,
  );
  const [judgingConfig, setJudgingConfig] = useState<JudgingConfig>(DEFAULT_JUDGING_CONFIG);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createChallengeAction({
        slug,
        title,
        description_md: descriptionMd || undefined,
        hero_media_url: heroMediaUrl || undefined,
        open_at: openAt || undefined,
        close_at: closeAt || undefined,
        announce_at: announceAt || undefined,
        submission_requirements: submissionRequirements,
        judging_config: judgingConfig,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("챌린지가 생성되었습니다.");
      router.push(`/${locale}/app/admin/challenges/${result.slug}/edit`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <h1 className="text-xl font-semibold">새 챌린지 만들기</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="slug">슬러그</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="my-challenge"
            minLength={3}
            maxLength={50}
            pattern="[a-z0-9][a-z0-9\-]*[a-z0-9]|[a-z0-9]"
            required
          />
          <p className="text-xs text-muted-foreground">
            소문자, 숫자, 하이픈만 허용 (3-50자). 공개 URL에 사용됩니다.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="챌린지 제목"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description_md">설명 (Markdown)</Label>
          <Textarea
            id="description_md"
            value={descriptionMd}
            onChange={(e) => setDescriptionMd(e.target.value)}
            placeholder="챌린지에 대한 설명을 입력하세요..."
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
            {isPending ? "생성 중..." : "챌린지 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
