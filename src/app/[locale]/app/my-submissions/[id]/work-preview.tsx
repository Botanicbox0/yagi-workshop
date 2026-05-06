// Wave C v2 — WorkPreview component (HIGH-3 fix).
//
// K-06 LOOP-1 #1: prior shape rendered the work as a single bare anchor with
// the raw R2/external URL as link text — no media preview, no filename hint,
// no editorial framing. The detail page is the applicant's primary feedback
// surface; the work itself should read as the page anchor.
//
// MIME-aware branches:
//   image/* → <img> at full card width
//   video/* → <video controls> at full card width
//   external URL with embed (YouTube/Vimeo) → <iframe> at 16:9
//   external URL without embed → hostname chip + "open in new tab"
//   nothing/unknown → muted placeholder

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { objectPublicUrl } from "@/lib/r2/client";

type Props = {
  contentR2Key: string | null;
  contentMime: string | null;
  externalUrl: string | null;
  emptyLabel: string;
  openLabel: string;
};

function filenameFromKey(key: string): string {
  return key.split("/").pop() ?? "work";
}

type EmbedMatch = { src: string };

function detectEmbed(url: string): EmbedMatch | null {
  // YouTube watch / shorts / youtu.be
  const yt = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/,
  );
  if (yt) return { src: `https://www.youtube.com/embed/${yt[1]}` };
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { src: `https://player.vimeo.com/video/${vm[1]}` };
  return null;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function FilenameCard({
  filename,
  url,
  openLabel,
}: {
  filename: string;
  url: string;
  openLabel: string;
}) {
  return (
    <div className="rounded-card border border-edge-subtle bg-card-deep p-5 flex items-center justify-between gap-3">
      <p className="text-sm font-medium truncate">{filename}</p>
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-foreground hover:underline underline-offset-2 shrink-0"
      >
        {openLabel}
        <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}

function HostnameChip({
  url,
  openLabel,
}: {
  url: string;
  openLabel: string;
}) {
  const host = safeHostname(url);
  return (
    <div className="rounded-card border border-edge-subtle bg-card-deep p-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{host}</p>
        <p className="text-xs text-muted-foreground truncate">{url}</p>
      </div>
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-foreground hover:underline underline-offset-2 shrink-0"
      >
        {openLabel}
        <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}

export function WorkPreview({
  contentR2Key,
  contentMime,
  externalUrl,
  emptyLabel,
  openLabel,
}: Props) {
  // R2 path
  if (contentR2Key) {
    const url = objectPublicUrl(contentR2Key);
    const filename = filenameFromKey(contentR2Key);
    const mime = (contentMime ?? "").toLowerCase();

    if (mime.startsWith("image/")) {
      return (
        <figure className="overflow-hidden rounded-card border border-edge-subtle bg-card-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={filename} className="w-full block" />
          <figcaption className="px-4 py-2 text-xs text-muted-foreground border-t border-edge-subtle">
            {filename}
          </figcaption>
        </figure>
      );
    }
    if (mime.startsWith("video/")) {
      return (
        <div className="overflow-hidden rounded-card border border-edge-subtle bg-black">
          <video controls src={url} className="w-full block" />
          <p className="px-4 py-2 text-xs text-muted-foreground border-t border-edge-subtle bg-card">
            {filename}
          </p>
        </div>
      );
    }
    // Unknown MIME (or PDF / other) — filename card
    return <FilenameCard filename={filename} url={url} openLabel={openLabel} />;
  }

  // External URL path
  if (externalUrl) {
    const embed = detectEmbed(externalUrl);
    if (embed) {
      return (
        <div className="overflow-hidden rounded-card border border-edge-subtle">
          <div className="aspect-video w-full">
            <iframe
              src={embed.src}
              className="h-full w-full"
              allowFullScreen
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      );
    }
    return <HostnameChip url={externalUrl} openLabel={openLabel} />;
  }

  // Empty placeholder (rare — submission must have one of the two)
  return (
    <div className="rounded-card border border-dashed border-edge-subtle p-8 text-center">
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    </div>
  );
}
