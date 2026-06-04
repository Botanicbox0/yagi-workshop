"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Pause, Play, StepBack, StepForward } from "lucide-react";
import type Hls from "hls.js";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMediaTime, parseMediaTime } from "@/lib/video-timecode";
import { streamHlsUrl, streamThumbnailUrl } from "@/lib/stream/urls";
import { cn } from "@/lib/utils";
import { refreshDeliverableStreamStatus } from "@/app/[locale]/app/projects/[id]/_actions/project-deliverables";
import type {
  AnnotationCoords,
  AnnotationShape,
} from "@/components/project-detail/deliverable-annotations";

export type TimedVideoLabels = {
  play: string;
  pause: string;
  speed: string;
  frameBack: string;
  frameForward: string;
  editTimecode: string;
  currentTime: string;
  streamProcessing: string;
  commentAtCurrentPrefix: string;
  commentAtCurrentSuffix: string;
  timecode: string;
};

type DraftAnnotation = {
  assetIndex: number;
  shape: AnnotationShape;
  coords: AnnotationCoords;
  timestampSec?: number;
};

type TimedVideoPlayerProps = {
  assetIndex: number;
  deliverableId?: string;
  src: string;
  streamUid?: string | null;
  streamStatus?: string | null;
  annotations: TimedVideoAnnotation[];
  selectedId: string | null;
  draft: DraftAnnotation | null;
  canAnnotate?: boolean;
  labels: TimedVideoLabels;
  onSelectAnnotation?: (id: string) => void;
  onDraftAnnotation?: (draft: DraftAnnotation) => void;
  onCaptureTime?: (timestampSec: number, assetIndex: number) => void;
};

export type TimedVideoAnnotation = {
  id: string;
  seq: number;
  shape: AnnotationShape;
  coords: AnnotationCoords;
  status?: string;
  timestampSec: number | null;
};

const PLAYBACK_RATES = [0.5, 1, 1.5, 2];
// HTML5 video exposes no reliable frame-rate API, so frame stepping uses a 30fps approximation.
const FRAME = 1 / 30;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function coordsFromPointer(
  event: React.PointerEvent<HTMLElement>,
  element: HTMLElement,
) {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

export function TimedVideoPlayer({
  assetIndex,
  deliverableId,
  src,
  streamUid,
  streamStatus,
  annotations,
  selectedId,
  draft,
  canAnnotate = false,
  labels,
  onSelectAnnotation,
  onDraftAnnotation,
  onCaptureTime,
}: TimedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const restoreAfterSourceSwapRef = useRef<{
    time: number;
    shouldResume: boolean;
  } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const pointerRef = useRef<number | null>(null);
  const timeInputOnFocusRef = useRef(formatMediaTime(0));
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [timeInput, setTimeInput] = useState(formatMediaTime(0));
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [effectiveStreamStatus, setEffectiveStreamStatus] = useState<string | null>(
    streamStatus ?? null,
  );
  const [hlsUnavailable, setHlsUnavailable] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{
    time: number;
    x: number;
    width: number;
  } | null>(null);
  const [thumbnailPreviewFailed, setThumbnailPreviewFailed] = useState(false);
  const localDraft = draft?.assetIndex === assetIndex ? draft : null;
  const streamSrcCandidate =
    streamUid && effectiveStreamStatus === "ready" ? streamHlsUrl(streamUid) : null;
  const streamSrc = hlsUnavailable ? null : streamSrcCandidate;
  const playbackSrc = streamSrc ?? src;
  const streamPoster =
    streamUid && effectiveStreamStatus === "ready"
      ? streamThumbnailUrl(streamUid, 0)
      : null;
  const hoverPreviewUrl =
    streamUid &&
    effectiveStreamStatus === "ready" &&
    hoverPreview &&
    !thumbnailPreviewFailed
      ? streamThumbnailUrl(streamUid, hoverPreview.time)
      : null;
  const showStreamProcessing = Boolean(
    streamUid && effectiveStreamStatus === "pending" && !streamSrc,
  );
  const timedAnnotations = useMemo(
    () =>
      annotations
        .filter((annotation) => annotation.timestampSec != null)
        .sort(
          (a, b) =>
            (a.timestampSec ?? 0) - (b.timestampSec ?? 0) || a.seq - b.seq,
        ),
    [annotations],
  );

  useEffect(() => {
    setEffectiveStreamStatus(streamStatus ?? null);
  }, [streamStatus, streamUid]);

  useEffect(() => {
    setHlsUnavailable(false);
    setThumbnailPreviewFailed(false);
  }, [streamSrcCandidate]);

  useEffect(() => {
    if (!deliverableId || !streamUid || effectiveStreamStatus !== "pending") return;

    let disposed = false;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (attempts > 60) {
        window.clearInterval(interval);
        return;
      }

      void refreshDeliverableStreamStatus({ deliverableId }).then((result) => {
        if (disposed || !result.ok) return;
        if (result.streamStatus) setEffectiveStreamStatus(result.streamStatus);
        if (result.streamStatus === "ready" || result.streamStatus === "error") {
          window.clearInterval(interval);
        }
      });
    }, 5_000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [deliverableId, effectiveStreamStatus, streamUid]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamSrc) return;

    let disposed = false;
    let hls: Hls | null = null;
    const restoreAfterSourceSwap = () => {
      const restore = restoreAfterSourceSwapRef.current;
      if (!restore || disposed) return;
      if (restore.time > 0) {
        video.currentTime = Math.min(
          restore.time,
          Number.isFinite(video.duration) ? video.duration : restore.time,
        );
      }
      if (restore.shouldResume) {
        video.play().catch(() => undefined);
        setIsPlaying(true);
      }
      restoreAfterSourceSwapRef.current = null;
    };

    restoreAfterSourceSwapRef.current = {
      time: video.currentTime,
      shouldResume: !video.paused,
    };
    video.pause();
    setIsPlaying(false);
    video.addEventListener("loadedmetadata", restoreAfterSourceSwap, { once: true });

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamSrc;
      video.load();
      return () => {
        video.removeEventListener("loadedmetadata", restoreAfterSourceSwap);
      };
    }

    void import("hls.js")
      .then(({ default: HlsConstructor }) => {
        if (disposed) return;
        if (!HlsConstructor.isSupported()) {
          setHlsUnavailable(true);
          return;
        }
        hls = new HlsConstructor();
        hls.on(HlsConstructor.Events.ERROR, (_event, data) => {
          if (data.fatal) setHlsUnavailable(true);
        });
        hls.loadSource(streamSrc);
        hls.attachMedia(video);
      })
      .catch((error) => {
        console.error("[TimedVideoPlayer] hls.js load failed:", error);
        if (!disposed) setHlsUnavailable(true);
      });

    return () => {
      disposed = true;
      video.removeEventListener("loadedmetadata", restoreAfterSourceSwap);
      hls?.destroy();
      if (video.isConnected) {
        video.src = src;
        video.load();
      }
    };
  }, [src, streamSrc]);

  useEffect(() => {
    const selected = annotations.find((annotation) => annotation.id === selectedId);
    if (!selected || selected.timestampSec == null || !videoRef.current) return;
    if (Math.abs(videoRef.current.currentTime - selected.timestampSec) > 0.25) {
      videoRef.current.currentTime = selected.timestampSec;
      setCurrent(selected.timestampSec);
      if (!isEditingTime) setTimeInput(formatMediaTime(selected.timestampSec));
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [annotations, isEditingTime, selectedId]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate, playbackSrc]);

  function syncFromVideo() {
    const video = videoRef.current;
    if (!video) return;
    const nextCurrent = video.currentTime;
    setCurrent(nextCurrent);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setIsPlaying(!video.paused);
    video.playbackRate = playbackRate;
    if (!isEditingTime) setTimeInput(formatMediaTime(nextCurrent));
  }

  function clampTime(value: number) {
    const maxTime = duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
    return Math.min(Math.max(value, 0), maxTime);
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (!video) return;
    const clamped = clampTime(value);
    video.currentTime = clamped;
    setCurrent(clamped);
    if (!isEditingTime) setTimeInput(formatMediaTime(clamped));
  }

  function updateHoverPreview(event: React.PointerEvent<HTMLDivElement>) {
    if (!streamUid || effectiveStreamStatus !== "ready" || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp01((event.clientX - rect.left) / rect.width);
    setHoverPreview({
      time: ratio * duration,
      x: ratio * rect.width,
      width: rect.width,
    });
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function stepFrame(direction: -1 | 1) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    seek(video.currentTime + direction * FRAME);
  }

  function commitTimeInput() {
    const changed = timeInput !== timeInputOnFocusRef.current;
    setIsEditingTime(false);
    if (!changed) return;

    const parsed = parseMediaTime(timeInput);
    if (parsed == null) {
      setTimeInput(formatMediaTime(current));
      return;
    }
    const clamped = clampTime(parsed);
    seek(clamped);
    setTimeInput(formatMediaTime(clamped));
  }

  function createDraftAtCurrent(coords: AnnotationCoords, shape: AnnotationShape) {
    if (!canAnnotate || !onDraftAnnotation) return;
    const video = videoRef.current;
    if (video) video.pause();
    setIsPlaying(false);
    onDraftAnnotation({
      assetIndex,
      shape,
      coords,
      timestampSec: Math.max(0, video?.currentTime ?? current),
    });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!canAnnotate || event.button !== 0) return;
    const point = coordsFromPointer(event, event.currentTarget);
    startRef.current = point;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!canAnnotate || pointerRef.current !== event.pointerId || !startRef.current) {
      return;
    }
    const start = startRef.current;
    const end = coordsFromPointer(event, event.currentTarget);
    startRef.current = null;
    pointerRef.current = null;

    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    if (dx < 0.012 && dy < 0.012) {
      createDraftAtCurrent(end, "pin");
      return;
    }

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    createDraftAtCurrent(
      {
        x,
        y,
        w: Math.min(Math.max(dx, 0.01), 1 - x),
        h: Math.min(Math.max(dy, 0.01), 1 - y),
      },
      "box",
    );
  }

  const timelineValue = duration > 0 ? Math.min(current, duration) : 0;

  return (
    <div className="w-full space-y-3">
      <div className="flex min-h-[220px] items-center justify-center bg-surface-card sm:min-h-[280px]">
        <div
          className="relative max-h-[72vh] max-w-full touch-manipulation select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <video
            ref={videoRef}
            src={streamSrc ? undefined : src}
            poster={streamPoster ?? undefined}
            className="block max-h-[72vh] max-w-full object-contain"
            playsInline
            preload="metadata"
            onLoadedMetadata={syncFromVideo}
            onTimeUpdate={syncFromVideo}
            onPause={syncFromVideo}
            onPlay={syncFromVideo}
          />
          {showStreamProcessing ? (
            <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              {labels.streamProcessing}
            </div>
          ) : null}
          {annotations.map((annotation) => (
            <VideoFrameMarker
              key={annotation.id}
              annotation={annotation}
              selected={annotation.id === selectedId}
              onSelect={(id) => {
                onSelectAnnotation?.(id);
                const target = annotations.find((item) => item.id === id);
                if (target?.timestampSec != null) seek(target.timestampSec);
              }}
            />
          ))}
          {localDraft ? <VideoDraftMarker draft={localDraft} /> : null}
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-background/70 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => stepFrame(-1)}
              className="h-9 w-9"
              aria-label={labels.frameBack}
              disabled={duration <= 0}
            >
              <StepBack className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePlayback}
              className="h-9 gap-2"
              aria-label={isPlaying ? labels.pause : labels.play}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {isPlaying ? labels.pause : labels.play}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => stepFrame(1)}
              className="h-9 w-9"
              aria-label={labels.frameForward}
              disabled={duration <= 0}
            >
              <StepForward className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <input
              value={timeInput}
              onChange={(event) => setTimeInput(event.currentTarget.value)}
              onFocus={() => {
                videoRef.current?.pause();
                setIsPlaying(false);
                setIsEditingTime(true);
                timeInputOnFocusRef.current = timeInput;
              }}
              onBlur={commitTimeInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setIsEditingTime(false);
                  setTimeInput(formatMediaTime(current));
                  event.currentTarget.blur();
                }
              }}
              className="h-8 w-16 rounded-md border border-transparent bg-transparent px-1 text-xs tabular-nums text-muted-foreground outline-none transition-colors focus:border-border focus:bg-surface-card focus:text-foreground focus:ring-1 focus:ring-ring"
              aria-label={labels.editTimecode}
              inputMode="text"
            />
            <div
              className="relative flex-1"
              onPointerMove={updateHoverPreview}
              onPointerLeave={() => setHoverPreview(null)}
            >
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.05}
                value={timelineValue}
                onChange={(event) => seek(Number(event.currentTarget.value))}
                className="h-2 w-full cursor-pointer accent-brand"
                aria-label={labels.currentTime}
                disabled={duration <= 0}
              />
              {duration > 0
                ? timedAnnotations.map((annotation) => (
                    <button
                      key={annotation.id}
                      type="button"
                      className={cn(
                        "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background",
                        annotation.id === selectedId ? "bg-gold" : "bg-brand",
                      )}
                      style={{
                        left: `${Math.min(100, Math.max(0, ((annotation.timestampSec ?? 0) / duration) * 100))}%`,
                      }}
                      title={`#${annotation.seq} · ${formatMediaTime(annotation.timestampSec)}`}
                      onClick={() => {
                        onSelectAnnotation?.(annotation.id);
                        seek(annotation.timestampSec ?? 0);
                      }}
                    />
                  ))
                : null}
              {hoverPreview && hoverPreviewUrl ? (
                <div
                  className="pointer-events-none absolute bottom-6 z-10 w-36 -translate-x-1/2 overflow-hidden rounded-lg border border-border/70 bg-background shadow-lg"
                  style={{
                    left: `${Math.min(
                      Math.max(hoverPreview.x, 72),
                      Math.max(72, hoverPreview.width - 72),
                    )}px`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudflare Stream thumbnail URL */}
                  <img
                    src={hoverPreviewUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                    onError={() => setThumbnailPreviewFailed(true)}
                  />
                  <div className="border-t border-border/70 px-2 py-1 text-center text-xs tabular-nums text-muted-foreground">
                    {formatMediaTime(hoverPreview.time)}
                  </div>
                </div>
              ) : null}
            </div>
            <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
              {formatMediaTime(duration)}
            </span>
          </div>
          <Select
            value={String(playbackRate)}
            onValueChange={(value) => setPlaybackRate(Number(value))}
          >
            <SelectTrigger
              className="h-9 w-full border-border bg-surface-card text-xs tabular-nums text-muted-foreground sm:w-[92px]"
              aria-label={labels.speed}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_RATES.map((rate) => (
                <SelectItem key={rate} value={String(rate)}>
                  {rate}×
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {onCaptureTime ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCaptureTime(Math.max(0, videoRef.current?.currentTime ?? current), assetIndex)}
            className="mt-3 w-full gap-2 sm:w-auto"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {labels.commentAtCurrentPrefix}
            <span className="tabular-nums">{formatMediaTime(current)}</span>
            {labels.commentAtCurrentSuffix}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function VideoFrameMarker({
  annotation,
  selected,
  onSelect,
}: {
  annotation: TimedVideoAnnotation;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const coords = annotation.coords;
  const baseClass = cn(
    "absolute z-10 border-2 text-left transition-colors",
    annotation.status === "resolved" ? "border-muted-foreground/70" : "border-brand",
    selected && "ring-2 ring-gold",
  );

  if (annotation.shape === "box" && "w" in coords) {
    return (
      <button
        type="button"
        className={baseClass}
        style={{
          left: `${coords.x * 100}%`,
          top: `${coords.y * 100}%`,
          width: `${coords.w * 100}%`,
          height: `${coords.h * 100}%`,
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(annotation.id);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
      >
        <span className="absolute -left-3 -top-3 flex h-7 min-w-7 items-center justify-center rounded-full border border-brand bg-brand px-2 text-xs font-bold text-brand-on">
          {annotation.seq}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "absolute z-10 flex h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border px-2 text-xs font-bold shadow-lg",
        annotation.status === "resolved"
          ? "border-border bg-muted text-muted-foreground"
          : "border-brand bg-brand text-brand-on",
        selected && "ring-2 ring-gold",
      )}
      style={{ left: `${coords.x * 100}%`, top: `${coords.y * 100}%` }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(annotation.id);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      {annotation.seq}
    </button>
  );
}

function VideoDraftMarker({ draft }: { draft: DraftAnnotation }) {
  const coords = draft.coords;
  if (draft.shape === "box" && "w" in coords) {
    return (
      <div
        className="pointer-events-none absolute z-10 border-2 border-dashed border-gold"
        style={{
          left: `${coords.x * 100}%`,
          top: `${coords.y * 100}%`,
          width: `${coords.w * 100}%`,
          height: `${coords.h * 100}%`,
        }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute z-10 h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold bg-gold px-2 text-center text-xs font-bold leading-7 text-gold-on"
      style={{ left: `${coords.x * 100}%`, top: `${coords.y * 100}%` }}
    >
      +
    </div>
  );
}
