// =============================================================================
// Phase 5 Wave C C_3 — 첨부자료 요약 (현황 tab).
//
// Per SPEC §"첨부자료 요약":
//   - Count header: "기획서 N개 · 레퍼런스 M개"
//   - Top-3 thumbnail strip (~64px height, 기획서 우선 → 레퍼런스 thumbnail)
//   - "전체 보기 →" link → ?tab=board
//
// Server component (no interaction). Thumbnail source priority:
//   1. briefing_documents.thumbnail_url (set by Wave B oembed proxy for
//      youtube/vimeo, sometimes by client uploads)
//   2. (uploaded brief PDFs/PPTs) → no auto-thumbnail; fallback to a
//      file-icon tile. PDF first-page rendering is FU (kickoff §C_3
//      ON_FAIL_LOOP loop 2).
// =============================================================================

import Link from "next/link";
import Image from "next/image";
import { FileText, Link as LinkIcon } from "lucide-react";

export type AttachmentItem = {
  id: string;
  kind: "brief" | "reference";
  source_type: "upload" | "url";
  thumbnail_url: string | null;
  filename: string | null;
  url: string | null;
};

type Props = {
  briefCount: number;
  referenceCount: number;
  topThree: AttachmentItem[];
  labels: {
    section_heading: string;
    count_brief: (n: number) => string;
    count_reference: (n: number) => string;
    view_all: string;
    cta_attachments: string;
    empty: string;
  };
};

export function AttachmentSummary({
  briefCount,
  referenceCount,
  topThree,
  labels,
}: Props) {
  const total = briefCount + referenceCount;
  return (
    <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
          {labels.section_heading}
        </h3>
        {total > 0 ? (
          <p className="text-sm text-foreground/80 keep-all">
            {labels.count_brief(briefCount)}
            <span className="text-muted-foreground/60 mx-2">·</span>
            {labels.count_reference(referenceCount)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/70 keep-all">
            {labels.empty}
          </p>
        )}
      </header>

      {topThree.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {topThree.map((item) => (
            <ThumbnailTile key={item.id} item={item} />
          ))}
        </div>
      )}

      <div className="pt-1">
        <Link
          href="?tab=board"
          scroll={false}
          className="text-xs font-medium text-foreground/70 underline-offset-4 hover:underline transition-colors keep-all"
        >
          {labels.cta_attachments}
        </Link>
      </div>
    </section>
  );
}

function ThumbnailTile({ item }: { item: AttachmentItem }) {
  // 64px height, aspect ~16:9 → ~110px wide. shrink-0 so the strip
  // scrolls horizontally rather than wrapping.
  const isUpload = item.source_type === "upload";
  const fallbackLabel = isUpload
    ? (item.filename ?? "")
    : (item.url ?? "");

  if (item.thumbnail_url) {
    return (
      <div
        className="shrink-0 h-16 w-[110px] rounded-lg overflow-hidden relative bg-muted"
        title={fallbackLabel}
      >
        <Image
          src={item.thumbnail_url}
          alt=""
          fill
          sizes="110px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 h-16 w-[110px] rounded-lg bg-muted flex items-center justify-center"
      title={fallbackLabel}
    >
      {isUpload ? (
        <FileText className="w-5 h-5 text-muted-foreground" />
      ) : (
        <LinkIcon className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );
}
