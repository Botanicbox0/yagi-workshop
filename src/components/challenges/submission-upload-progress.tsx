"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type UploadState = "idle" | "uploading" | "done" | "error";

type Props = {
  filename: string;
  progress: number;
  state: UploadState;
  onCancel?: () => void;
};

const STATE_LABEL: Record<UploadState, string> = {
  idle: "대기 중",
  uploading: "올리는 중",
  done: "완료",
  error: "실패",
};

export function SubmissionUploadProgress({
  filename,
  progress,
  state,
  onCancel,
}: Props) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm truncate">{filename}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {state === "uploading"
              ? `${Math.round(progress)}%`
              : STATE_LABEL[state]}
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-150"
            style={{ width: `${state === "done" ? 100 : progress}%` }}
          />
        </div>
      </div>
      {onCancel && state !== "done" && (
        <Button
          size="icon"
          variant="ghost"
          type="button"
          onClick={onCancel}
          aria-label="업로드 취소"
          className="shrink-0 h-7 w-7"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
