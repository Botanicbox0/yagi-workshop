"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitJudgmentAction } from "./actions";

type Props = {
  challengeId: string;
  submissionId: string;
  slug: string;
  submitterId: string;
  content: Record<string, unknown>;
  initialScore: number | null;
  initialNotes: string;
};

export function SubmissionJudgeCard({
  challengeId,
  submissionId,
  slug,
  submitterId,
  content,
  initialScore,
  initialNotes,
}: Props) {
  const [score, setScore] = useState<string>(
    initialScore !== null ? String(initialScore) : "",
  );
  const [notes, setNotes] = useState<string>(initialNotes ?? "");
  const [saved, setSaved] = useState(initialScore !== null);
  const [isPending, startTransition] = useTransition();

  const textDescription =
    typeof content?.text_description === "string"
      ? content.text_description
      : null;

  const mediaUrl =
    typeof content?.youtube_url === "string"
      ? content.youtube_url
      : typeof content?.native_video_url === "string"
        ? content.native_video_url
        : null;

  const displayHandle = submitterId.slice(0, 8);

  function handleSave() {
    const parsed = parseFloat(score);
    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
      toast.error("점수는 0에서 10 사이여야 해요.");
      return;
    }
    // Round to nearest 0.5
    const rounded = Math.round(parsed * 2) / 2;

    startTransition(async () => {
      const result = await submitJudgmentAction(
        challengeId,
        submissionId,
        slug,
        rounded,
        notes,
      );
      if (result.ok) {
        setSaved(true);
        setScore(String(rounded));
        toast.success("심사 결과가 저장됐어요.");
      } else {
        toast.error(
          result.error === "challenge_not_judgeable"
            ? "이 챌린지는 현재 심사할 수 없는 상태예요."
            : "저장 중 오류가 발생했어요. 다시 시도해주세요.",
        );
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            창작자: <span className="font-mono">{displayHandle}…</span>
          </p>
          {textDescription && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {textDescription}
            </p>
          )}
          {mediaUrl && (
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-foreground underline underline-offset-2 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
            >
              미디어 보기
            </a>
          )}
        </div>
        {saved && (
          <span className="shrink-0 inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            저장됨
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-3 items-start">
        <div className="space-y-1">
          <label
            htmlFor={`score-${submissionId}`}
            className="text-xs font-medium text-foreground"
          >
            점수 (0–10)
          </label>
          <Input
            id={`score-${submissionId}`}
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={score}
            onChange={(e) => {
              setSaved(false);
              setScore(e.target.value);
            }}
            placeholder="0–10"
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`notes-${submissionId}`}
            className="text-xs font-medium text-foreground"
          >
            메모 (선택)
          </label>
          <Textarea
            id={`notes-${submissionId}`}
            value={notes}
            onChange={(e) => {
              setSaved(false);
              setNotes(e.target.value);
            }}
            placeholder="심사 메모를 입력하세요…"
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isPending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}
