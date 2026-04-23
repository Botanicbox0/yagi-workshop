import type { SubmissionRequirements } from "@/lib/challenges/types";

type Props = { requirements: SubmissionRequirements };

function prefix(required: boolean): string {
  return required ? "필수 · " : "선택 · ";
}

export function RequirementsDisplay({ requirements }: Props) {
  const parts: string[] = [];

  if (requirements.native_video) {
    const v = requirements.native_video;
    const maxSec = v.max_duration_sec ?? 60;
    const maxMb = v.max_size_mb ?? 500;
    parts.push(
      `${prefix(v.required)}${maxSec}초 이내 mp4 영상 (최대 ${maxMb}MB)`
    );
  }

  if (requirements.youtube_url) {
    const y = requirements.youtube_url;
    parts.push(`${prefix(y.required)}YouTube 링크`);
  }

  if (requirements.image) {
    const img = requirements.image;
    parts.push(
      `${prefix(img.required)}이미지 최대 ${img.max_count}장 (각 ${img.max_size_mb_each}MB)`
    );
  }

  if (requirements.pdf) {
    const pdf = requirements.pdf;
    parts.push(`${prefix(pdf.required)}PDF 1개 (최대 ${pdf.max_size_mb}MB)`);
  }

  if (requirements.text_description) {
    const txt = requirements.text_description;
    parts.push(
      `${prefix(txt.required)}텍스트 설명 ${txt.min_chars}-${txt.max_chars}자`
    );
  }

  if (parts.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
        작품 요건
      </p>
      <p className="text-sm text-foreground leading-relaxed">
        {parts.join(" · ")}
      </p>
    </div>
  );
}
