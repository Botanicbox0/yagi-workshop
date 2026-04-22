"use client";

import { useRef, useState, useCallback, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Play, Video as VideoIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type VideoPlayerProps =
  | {
      kind: "upload";
      videoSrc: string;
      posterSrc: string | null;
      title?: string | null;
    }
  | {
      kind: "embed";
      provider: "youtube" | "vimeo";
      externalUrl: string;
      posterSrc: string | null;
      title?: string | null;
    }
  | {
      kind: "external";
      provider: "tiktok" | "instagram";
      externalUrl: string;
      posterSrc: string | null;
      title?: string | null;
    };

const YT_RE = /(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

function extractYoutubeId(url: string): string | null {
  const m = url.match(YT_RE);
  return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(VIMEO_RE);
  return m ? m[1] : null;
}

export function VideoPlayer(props: VideoPlayerProps) {
  const t = useTranslations("refs");

  if (props.kind === "upload") {
    return <UploadedVideo {...props} t={t} />;
  }
  if (props.kind === "embed") {
    return <EmbedVideo {...props} t={t} />;
  }
  return <ExternalVideo {...props} t={t} />;
}

// ----------------------- Uploaded (inline <video>) -----------------------

function UploadedVideo({
  videoSrc,
  posterSrc,
  title,
  t,
}: {
  videoSrc: string;
  posterSrc: string | null;
  title?: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const [errored, setErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLVideoElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) {
          void v.play().catch(() => {});
        } else {
          v.pause();
        }
      }
    },
    []
  );

  return (
    <div className="w-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        controls
        preload="metadata"
        poster={posterSrc ?? undefined}
        src={videoSrc}
        onError={() => setErrored(true)}
        onKeyDown={handleKeyDown}
        aria-label={title ?? undefined}
      >
        {/* No captions in this phase */}
      </video>
      {errored && (
        <a
          href={videoSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t("ref_video_unsupported_format")}
        </a>
      )}
    </div>
  );
}

// ----------------------- Embeddable (YouTube / Vimeo) -----------------------

function EmbedVideo({
  provider,
  externalUrl,
  posterSrc,
  title,
  t,
}: {
  provider: "youtube" | "vimeo";
  externalUrl: string;
  posterSrc: string | null;
  title?: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);

  const videoId =
    provider === "youtube"
      ? extractYoutubeId(externalUrl)
      : extractVimeoId(externalUrl);

  const embedUrl =
    provider === "youtube" && videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1`
      : provider === "vimeo" && videoId
      ? `https://player.vimeo.com/video/${videoId}?autoplay=1`
      : null;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const openDialog = () => setOpen(true);

  // Fallback if we couldn't extract an id: link out.
  if (!embedUrl) {
    return (
      <ExternalVideo
        provider="tiktok"
        externalUrl={externalUrl}
        posterSrc={posterSrc}
        title={title}
        t={t}
      />
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openDialog}
        onKeyDown={handleKeyDown}
        aria-label={title ?? t("ref_type_video")}
        className="group relative w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        {posterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt={title ?? ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <VideoIcon className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <span className="rounded-full bg-background/90 border border-border p-3">
            <Play className="h-5 w-5 fill-foreground text-foreground" />
          </span>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[900px] w-[calc(100vw-2rem)] p-0 overflow-hidden border-border sm:rounded-lg">
          <DialogTitle className="sr-only">
            {title ?? t("ref_type_video")}
          </DialogTitle>
          <div className="aspect-video w-full bg-black">
            {open && (
              <iframe
                src={embedUrl}
                title={title ?? t("ref_type_video")}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ----------------------- External-only (TikTok / Instagram) -----------------------

function ExternalVideo({
  externalUrl,
  posterSrc,
  title,
  t,
}: {
  provider: "tiktok" | "instagram";
  externalUrl: string;
  posterSrc: string | null;
  title?: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <a
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={title ?? t("ref_type_video")}
      className="group relative block w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
    >
      {posterSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterSrc}
          alt={title ?? ""}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <VideoIcon className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <span className="rounded-full bg-background/90 border border-border p-3">
          <Play className="h-5 w-5 fill-foreground text-foreground" />
        </span>
      </div>
    </a>
  );
}
