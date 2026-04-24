"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SubmissionUploadProgress } from "./submission-upload-progress";
import { buildSubmissionSchema } from "@/lib/challenges/content-schema";
import { isValidYouTubeUrl } from "@/lib/validation/youtube";
import { readVideoMetadata } from "@/lib/references/video";
import type { Database } from "@/lib/supabase/database.types";
import type { SubmissionRequirements } from "@/lib/challenges/types";
import {
  requestUploadUrlsAction,
  submitChallengeAction,
  type UploadSlot,
  type IssuedUpload,
} from "@/app/challenges/[slug]/submit/actions";

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];

const ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: "로그인이 필요해요. 다시 시도해주세요.",
  wrong_role: "창작자 계정으로 전환해주세요.",
  not_open: "챌린지가 마감됐어요.",
  already_submitted: "이미 이 챌린지에 작품을 올렸어요.",
  validation_failed: "입력을 확인해주세요.",
  upload_missing: "업로드가 완료되지 않았어요. 다시 시도해주세요.",
};

type UploadEntry = {
  file: File;
  slotKey: string;
  kind: UploadSlot["kind"];
  progress: number;
  state: "idle" | "uploading" | "done" | "error";
};

type Props = { challenge: ChallengeRow };

export function SubmissionForm({ challenge }: Props) {
  const router = useRouter();
  const requirements = challenge.submission_requirements as SubmissionRequirements;
  const schema = useMemo(
    () => buildSubmissionSchema(requirements),
    [requirements]
  );

  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxVideoBytes = (requirements.native_video?.max_size_mb ?? 500) * 1024 * 1024;
  const maxImageBytes = (requirements.image?.max_size_mb_each ?? 10) * 1024 * 1024;
  const maxImageCount = requirements.image?.max_count ?? 5;
  const maxPdfBytes = (requirements.pdf?.max_size_mb ?? 20) * 1024 * 1024;

  function updateUploadProgress(slotKey: string, progress: number, state: UploadEntry["state"]) {
    setUploads((prev) =>
      prev.map((u) => (u.slotKey === slotKey ? { ...u, progress, state } : u))
    );
  }

  function uploadViaXhr(
    uploadUrl: string,
    file: File,
    slotKey: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          updateUploadProgress(slotKey, (e.loaded / e.total) * 100, "uploading");
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateUploadProgress(slotKey, 100, "done");
          resolve();
        } else {
          updateUploadProgress(slotKey, 0, "error");
          reject(new Error(`upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => {
        updateUploadProgress(slotKey, 0, "error");
        reject(new Error("network error"));
      };
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    // Client-side file size validation
    if (videoFile && videoFile.size > maxVideoBytes) {
      setVideoError(`영상은 최대 ${requirements.native_video!.max_size_mb}MB까지 올릴 수 있어요`);
      return;
    }
    for (const img of imageFiles) {
      if (img.size > maxImageBytes) {
        setImageError(`각 이미지는 최대 ${requirements.image!.max_size_mb_each}MB까지 올릴 수 있어요`);
        return;
      }
    }
    if (pdfFile && pdfFile.size > maxPdfBytes) {
      setPdfError(`PDF는 최대 ${requirements.pdf!.max_size_mb}MB까지 올릴 수 있어요`);
      return;
    }

    // YouTube validation
    if (requirements.youtube_url !== undefined && youtubeUrl.trim()) {
      if (!isValidYouTubeUrl(youtubeUrl.trim())) {
        setYoutubeError("유효한 YouTube URL을 입력해주세요");
        return;
      }
    }

    // Build slots for upload
    const pendingSlots: UploadSlot[] = [];
    if (videoFile) {
      pendingSlots.push({
        kind: "native_video",
        filename: videoFile.name,
        contentType: videoFile.type,
        size: videoFile.size,
      });
    }
    for (const img of imageFiles) {
      pendingSlots.push({
        kind: "image",
        filename: img.name,
        contentType: img.type,
        size: img.size,
      });
    }
    if (pdfFile) {
      pendingSlots.push({
        kind: "pdf",
        filename: pdfFile.name,
        contentType: pdfFile.type,
        size: pdfFile.size,
      });
    }

    setIsSubmitting(true);

    // Request presigned URLs
    if (pendingSlots.length > 0) {
      const urlResult = await requestUploadUrlsAction(challenge.id, pendingSlots);
      if (!urlResult.ok) {
        toast.error(ERROR_MESSAGES[urlResult.error] ?? urlResult.error);
        setIsSubmitting(false);
        return;
      }

      // Map issued uploads back to files
      const fileList: File[] = [];
      if (videoFile) fileList.push(videoFile);
      fileList.push(...imageFiles);
      if (pdfFile) fileList.push(pdfFile);

      const entries: UploadEntry[] = urlResult.issued.map((issued, i) => ({
        file: fileList[i],
        slotKey: issued.slotKey,
        kind: pendingSlots[i].kind,
        progress: 0,
        state: "idle" as const,
      }));
      setUploads(entries);

      // Upload all files via XHR for reliable progress
      const results = await Promise.allSettled(
        urlResult.issued.map((issued: IssuedUpload, i: number) =>
          uploadViaXhr(issued.uploadUrl, fileList[i], issued.slotKey)
        )
      );

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        toast.error(ERROR_MESSAGES.upload_missing);
        setIsSubmitting(false);
        return;
      }

      // Build final content object using objectKeys from issued
      const videoIssued = videoFile
        ? urlResult.issued.find((_: IssuedUpload, i: number) => pendingSlots[i].kind === "native_video")
        : undefined;

      let videoPosterUrl: string | undefined;
      let videoDurationSec: number | undefined;
      if (videoFile) {
        const meta = await readVideoMetadata(videoFile);
        if (meta.poster) {
          videoPosterUrl = URL.createObjectURL(meta.poster);
        }
        if (meta.duration_seconds !== null) {
          videoDurationSec = meta.duration_seconds;
        }
      }

      const imageIssued = urlResult.issued.filter((_: IssuedUpload, i: number) => pendingSlots[i].kind === "image");

      const pdfIssued = pdfFile
        ? urlResult.issued.find((_: IssuedUpload, i: number) => pendingSlots[i].kind === "pdf")
        : undefined;

      const contentPayload = {
        text_description: description,
        ...(videoIssued
          ? {
              native_video: {
                objectKey: videoIssued.objectKey,
                ...(videoPosterUrl ? { poster_url: videoPosterUrl } : {}),
                ...(videoDurationSec !== undefined ? { duration_sec: videoDurationSec } : {}),
              },
            }
          : {}),
        ...(youtubeUrl.trim() ? { youtube_url: youtubeUrl.trim() } : {}),
        ...(imageIssued.length > 0
          ? { images: imageIssued.map((i: IssuedUpload) => ({ objectKey: i.objectKey })) }
          : {}),
        ...(pdfIssued ? { pdf: { objectKey: pdfIssued.objectKey } } : {}),
      };

      // Validate schema before submit
      const parseResult = schema.safeParse(contentPayload);
      if (!parseResult.success) {
        toast.error(ERROR_MESSAGES.validation_failed);
        setIsSubmitting(false);
        return;
      }

      const submitResult = await submitChallengeAction(challenge.id, contentPayload);
      if (!submitResult.ok) {
        toast.error(ERROR_MESSAGES[submitResult.error] ?? submitResult.error);
        setIsSubmitting(false);
        return;
      }

      toast.success("작품 올렸어요");
      router.push(submitResult.redirectTo);
      return;
    }

    // Text + youtube only (no file uploads)
    const contentPayload = {
      text_description: description,
      ...(youtubeUrl.trim() ? { youtube_url: youtubeUrl.trim() } : {}),
    };

    const parseResult = schema.safeParse(contentPayload);
    if (!parseResult.success) {
      toast.error(ERROR_MESSAGES.validation_failed);
      setIsSubmitting(false);
      return;
    }

    const submitResult = await submitChallengeAction(challenge.id, contentPayload);
    if (!submitResult.ok) {
      toast.error(ERROR_MESSAGES[submitResult.error] ?? submitResult.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("작품 올렸어요");
    router.push(submitResult.redirectTo);
  }

  const descMin = requirements.text_description.min_chars;
  const descMax = requirements.text_description.max_chars;
  const descLen = description.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Text description — always present */}
      <div className="space-y-2">
        <Label htmlFor="text_description">
          작품 설명
          {requirements.text_description.required && (
            <span className="text-destructive ml-1" aria-hidden>*</span>
          )}
        </Label>
        <Textarea
          id="text_description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`${descMin}자 이상 입력해주세요`}
          rows={5}
          required
          aria-describedby="desc-counter"
        />
        <p
          id="desc-counter"
          className={`text-xs text-right ${descLen > descMax ? "text-destructive" : "text-muted-foreground"}`}
        >
          {descLen} / {descMax}자
        </p>
      </div>

      {/* Native video */}
      {requirements.native_video !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="native_video">
            영상 파일 (MP4)
            {requirements.native_video.required && (
              <span className="text-destructive ml-1" aria-hidden>*</span>
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            최대 {requirements.native_video.max_size_mb}MB · MP4만 가능 ·{" "}
            {requirements.native_video.max_duration_sec}초 이하
          </p>
          <Input
            id="native_video"
            type="file"
            accept="video/mp4"
            required={requirements.native_video.required}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setVideoError(null);
              if (f && f.size > maxVideoBytes) {
                setVideoError(`영상은 최대 ${requirements.native_video!.max_size_mb}MB까지 올릴 수 있어요`);
                setVideoFile(null);
                return;
              }
              setVideoFile(f);
            }}
          />
          {videoError && (
            <p className="text-xs text-destructive">{videoError}</p>
          )}
          {uploads
            .filter((u) => u.kind === "native_video")
            .map((u) => (
              <SubmissionUploadProgress
                key={u.slotKey}
                filename={u.file.name}
                progress={u.progress}
                state={u.state}
              />
            ))}
        </div>
      )}

      {/* Images */}
      {requirements.image !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="images">
            이미지 (JPG / PNG)
            {requirements.image.required && (
              <span className="text-destructive ml-1" aria-hidden>*</span>
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            최대 {maxImageCount}개 · 각 {requirements.image.max_size_mb_each}MB 이하
          </p>
          <Input
            id="images"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            required={requirements.image.required}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setImageError(null);
              if (files.length > maxImageCount) {
                setImageError(`이미지는 최대 ${maxImageCount}개까지 올릴 수 있어요`);
                setImageFiles([]);
                return;
              }
              const oversized = files.find((f) => f.size > maxImageBytes);
              if (oversized) {
                setImageError(`각 이미지는 최대 ${requirements.image!.max_size_mb_each}MB까지 올릴 수 있어요`);
                setImageFiles([]);
                return;
              }
              setImageFiles(files);
            }}
          />
          {imageError && (
            <p className="text-xs text-destructive">{imageError}</p>
          )}
          {uploads
            .filter((u) => u.kind === "image")
            .map((u) => (
              <SubmissionUploadProgress
                key={u.slotKey}
                filename={u.file.name}
                progress={u.progress}
                state={u.state}
              />
            ))}
        </div>
      )}

      {/* PDF */}
      {requirements.pdf !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="pdf">
            PDF 파일
            {requirements.pdf.required && (
              <span className="text-destructive ml-1" aria-hidden>*</span>
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            최대 {requirements.pdf.max_size_mb}MB
          </p>
          <Input
            id="pdf"
            type="file"
            accept="application/pdf"
            required={requirements.pdf.required}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPdfError(null);
              if (f && f.size > maxPdfBytes) {
                setPdfError(`PDF는 최대 ${requirements.pdf!.max_size_mb}MB까지 올릴 수 있어요`);
                setPdfFile(null);
                return;
              }
              setPdfFile(f);
            }}
          />
          {pdfError && (
            <p className="text-xs text-destructive">{pdfError}</p>
          )}
          {uploads
            .filter((u) => u.kind === "pdf")
            .map((u) => (
              <SubmissionUploadProgress
                key={u.slotKey}
                filename={u.file.name}
                progress={u.progress}
                state={u.state}
              />
            ))}
        </div>
      )}

      {/* YouTube URL */}
      {requirements.youtube_url !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="youtube_url">
            YouTube URL
            {requirements.youtube_url.required && (
              <span className="text-destructive ml-1" aria-hidden>*</span>
            )}
          </Label>
          <Input
            id="youtube_url"
            type="url"
            value={youtubeUrl}
            required={requirements.youtube_url.required}
            placeholder="https://youtube.com/watch?v=..."
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              setYoutubeError(null);
            }}
            onBlur={() => {
              if (youtubeUrl.trim() && !isValidYouTubeUrl(youtubeUrl.trim())) {
                setYoutubeError("유효한 YouTube URL을 입력해주세요");
              }
            }}
          />
          {youtubeError && (
            <p className="text-xs text-destructive">{youtubeError}</p>
          )}
        </div>
      )}

      <Button size="pill" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "올리는 중..." : "작품 올리기"}
      </Button>
    </form>
  );
}
