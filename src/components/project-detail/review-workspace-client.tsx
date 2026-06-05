"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  GalleryVerticalEnd,
  ImageIcon,
  MessageSquareText,
  Play,
  RotateCcw,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type WheelEvent,
} from "react";
import {
  TimedVideoPlayer,
  type TimedVideoLabels,
} from "@/components/project-detail/timed-video-player";
import type {
  AnnotationCoords,
  AnnotationShape,
  AnnotationStatus,
  AnnotationVisibility,
} from "@/components/project-detail/deliverable-annotations";
import { cn } from "@/lib/utils";

export type ReviewWorkspaceAnnotation = {
  id: string;
  projectId: string;
  deliverableId: string;
  assetIndex: number;
  seq: number;
  shape: AnnotationShape;
  coords: AnnotationCoords;
  visibility: AnnotationVisibility;
  status: AnnotationStatus;
  timestampSec: number | null;
  threadId: string;
  createdAt: string;
  createdBy: string;
};

export type ReviewWorkspaceDeliverable = {
  id: string;
  version: number;
  status: string;
  note: string | null;
  releasedAt: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  storageAssets: Array<{
    key: string;
    url: string;
    kind: "image" | "video" | "file";
    streamUid?: string | null;
    streamStatus?: string | null;
  }>;
  externalAssets: Array<{
    url: string;
    provider: "youtube" | "vimeo" | "generic";
    title: string | null;
    thumbnailUrl: string | null;
  }>;
  annotations: ReviewWorkspaceAnnotation[];
};

type ReviewWorkspaceClientProps = {
  projectTitle: string;
  isStudioContext: boolean;
  deliverables: ReviewWorkspaceDeliverable[];
};

type ReviewAsset =
  | {
      id: string;
      source: "storage";
      label: string;
      assetIndex: number;
      kind: "image" | "video" | "file";
      url: string;
      streamUid?: string | null;
      streamStatus?: string | null;
    }
  | {
      id: string;
      source: "external";
      label: string;
      assetIndex: null;
      kind: "external";
      url: string;
      provider: "youtube" | "vimeo" | "generic";
      title: string | null;
      thumbnailUrl: string | null;
    };

const VIDEO_LABELS: TimedVideoLabels = {
  play: "Play",
  pause: "Pause",
  speed: "Speed",
  frameBack: "Frame back",
  frameForward: "Frame forward",
  editTimecode: "Edit timecode",
  currentTime: "Current time",
  streamProcessing: "Stream processing",
  commentAtCurrentPrefix: "Comment at",
  commentAtCurrentSuffix: "",
  timecode: "Timecode",
};

function assetsForDeliverable(deliverable: ReviewWorkspaceDeliverable | null) {
  if (!deliverable) return [];

  const storageAssets: ReviewAsset[] = deliverable.storageAssets.map(
    (asset, index) => ({
      id: `storage:${index}:${asset.key}`,
      source: "storage",
      label: `${asset.kind.toUpperCase()} ${index + 1}`,
      assetIndex: index,
      kind: asset.kind,
      url: asset.url,
      streamUid: asset.streamUid,
      streamStatus: asset.streamStatus,
    }),
  );

  const externalAssets: ReviewAsset[] = deliverable.externalAssets.map(
    (asset, index) => ({
      id: `external:${index}:${asset.url}`,
      source: "external",
      label: `${asset.provider.toUpperCase()} ${index + 1}`,
      assetIndex: null,
      kind: "external",
      url: asset.url,
      provider: asset.provider,
      title: asset.title,
      thumbnailUrl: asset.thumbnailUrl,
    }),
  );

  return [...storageAssets, ...externalAssets];
}

function annotationTone(annotation: ReviewWorkspaceAnnotation) {
  return annotation.visibility === "internal"
    ? "border-gold bg-gold-soft text-gold"
    : "border-brand bg-brand-soft text-brand";
}

function hasBoxCoords(coords: AnnotationCoords): coords is AnnotationCoords & {
  w: number;
  h: number;
} {
  return "w" in coords && "h" in coords;
}

function formatVersion(version: number) {
  return `V${version}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ReviewWorkspaceClient({
  projectTitle,
  isStudioContext,
  deliverables,
}: ReviewWorkspaceClientProps) {
  const [selectedDeliverableId, setSelectedDeliverableId] = useState(
    deliverables[0]?.id ?? "general",
  );
  const selectedDeliverable =
    selectedDeliverableId === "general"
      ? null
      : deliverables.find((item) => item.id === selectedDeliverableId) ?? null;
  const selectedDeliverableIndex = selectedDeliverable
    ? deliverables.findIndex((item) => item.id === selectedDeliverable.id)
    : -1;
  const assets = useMemo(
    () => assetsForDeliverable(selectedDeliverable),
    [selectedDeliverable],
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? null;
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null,
  );
  const annotationsForAsset =
    selectedDeliverable && selectedAsset?.source === "storage"
      ? selectedDeliverable.annotations.filter(
          (annotation) => annotation.assetIndex === selectedAsset.assetIndex,
        )
      : [];

  useEffect(() => {
    setSelectedAssetId(assets[0]?.id ?? null);
    setSelectedAnnotationId(null);
  }, [selectedDeliverable?.id, assets]);

  const selectAdjacentVersion = (direction: -1 | 1) => {
    if (selectedDeliverableIndex < 0) return;
    const next = deliverables[selectedDeliverableIndex + direction];
    if (next) setSelectedDeliverableId(next.id);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
      <header className="flex flex-col gap-4 border-b border-border/70 bg-surface-card px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Review workspace
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              Unified media review
            </h2>
            <span className="max-w-full truncate text-sm text-muted-foreground">
              {projectTitle}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => selectAdjacentVersion(1)}
            disabled={selectedDeliverableIndex < 0 || selectedDeliverableIndex >= deliverables.length - 1}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Prev
          </button>
          <button
            type="button"
            onClick={() => selectAdjacentVersion(-1)}
            disabled={selectedDeliverableIndex <= 0}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden />
            {isStudioContext ? "Studio context" : "Client context"}
          </span>
        </div>
      </header>

      <div className="grid min-h-[720px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_360px]">
        <VersionRail
          deliverables={deliverables}
          selectedDeliverableId={selectedDeliverable?.id ?? "general"}
          onSelectDeliverable={setSelectedDeliverableId}
        />
        <main className="flex min-h-[480px] flex-col bg-background">
          <AssetStrip
            assets={assets}
            selectedAssetId={selectedAsset?.id ?? null}
            onSelectAsset={setSelectedAssetId}
          />
          <MediaCanvas
            deliverable={selectedDeliverable}
            asset={selectedAsset}
            annotations={annotationsForAsset}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={setSelectedAnnotationId}
          />
        </main>
        <ReadOnlyCommentPanel
          deliverable={selectedDeliverable}
          asset={selectedAsset}
          annotations={annotationsForAsset}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={setSelectedAnnotationId}
        />
      </div>
    </section>
  );
}

function VersionRail({
  deliverables,
  selectedDeliverableId,
  onSelectDeliverable,
}: {
  deliverables: ReviewWorkspaceDeliverable[];
  selectedDeliverableId: string;
  onSelectDeliverable: (id: string) => void;
}) {
  return (
    <aside className="border-b border-border/70 bg-surface-card lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <GalleryVerticalEnd className="h-4 w-4" aria-hidden />
        Versions
      </div>
      <div className="space-y-3 p-3">
        <button
          type="button"
          onClick={() => onSelectDeliverable("general")}
          className={cn(
            "w-full rounded-lg border px-3 py-3 text-left",
            selectedDeliverableId === "general"
              ? "border-brand/40 bg-brand/10"
              : "border-border bg-background",
          )}
        >
          <span className="block text-sm font-semibold text-foreground">
            General
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Project-level thread
          </span>
        </button>
        {deliverables.map((deliverable, index) => {
          const isSelected = deliverable.id === selectedDeliverableId;
          const assetCount =
            deliverable.storageAssets.length + deliverable.externalAssets.length;
          return (
            <button
              key={deliverable.id}
              type="button"
              onClick={() => onSelectDeliverable(deliverable.id)}
              className={cn(
                "w-full rounded-lg border px-3 py-3 text-left transition",
                isSelected
                  ? "border-brand/60 bg-brand/10"
                  : "border-border bg-background hover:border-border/80",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {formatVersion(deliverable.version)}
                </span>
                {index === 0 ? (
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-medium text-gold">
                    Latest
                  </span>
                ) : null}
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">
                {assetCount} assets - {deliverable.status}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {deliverable.releasedAt ? "Released" : "Unreleased"} -{" "}
                {formatDate(deliverable.createdAt)}
              </span>
            </button>
          );
        })}
        {deliverables.length === 0 ? (
          <div className="rounded-lg border border-border bg-background px-3 py-8 text-center text-sm text-muted-foreground">
            No versions yet
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function AssetStrip({
  assets,
  selectedAssetId,
  onSelectAsset,
}: {
  assets: ReviewAsset[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}) {
  return (
    <div className="border-b border-border/70 bg-background px-4 py-3">
      <div className="flex gap-2 overflow-x-auto">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => onSelectAsset(asset.id)}
            className={cn(
              "flex min-w-32 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs",
              asset.id === selectedAssetId
                ? "border-brand/60 bg-brand/10 text-foreground"
                : "border-border bg-surface-card text-muted-foreground",
            )}
          >
            {asset.kind === "image" ? (
              <ImageIcon className="h-4 w-4 shrink-0" aria-hidden />
            ) : asset.kind === "video" ? (
              <Play className="h-4 w-4 shrink-0" aria-hidden />
            ) : asset.kind === "external" ? (
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="truncate">{asset.label}</span>
          </button>
        ))}
        {assets.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface-card px-3 py-2 text-xs text-muted-foreground">
            No assets
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MediaCanvas({
  deliverable,
  asset,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
}: {
  deliverable: ReviewWorkspaceDeliverable | null;
  asset: ReviewAsset | null;
  annotations: ReviewWorkspaceAnnotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string) => void;
}) {
  if (!deliverable) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyCanvas title="General" body="Project-level comments will appear in Phase C." />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyCanvas title={formatVersion(deliverable.version)} body="No assets in this version." />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {asset.kind === "video" ? (
          <TimedVideoPlayer
            assetIndex={asset.assetIndex}
            deliverableId={deliverable.id}
            src={asset.url}
            streamUid={asset.streamUid}
            streamStatus={asset.streamStatus}
            annotations={annotations}
            selectedId={selectedAnnotationId}
            draft={null}
            canAnnotate={false}
            labels={VIDEO_LABELS}
            onSelectAnnotation={onSelectAnnotation}
          />
        ) : asset.kind === "image" ? (
          <ImageCanvas
            src={asset.url}
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={onSelectAnnotation}
          />
        ) : asset.kind === "external" ? (
          <ExternalCanvas asset={asset} />
        ) : (
          <FileCanvas asset={asset} />
        )}
      </div>
    </div>
  );
}

function ImageCanvas({
  src,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
}: {
  src: string;
  annotations: ReviewWorkspaceAnnotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(
    null,
  );

  const zoom = (next: number) => setScale(Math.min(4, Math.max(0.5, next)));
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoom(scale + (event.deltaY > 0 ? -0.1 : 0.1));
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      startX: offset.x,
      startY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.startX + event.clientX - dragRef.current.x,
      y: dragRef.current.startY + event.clientY - dragRef.current.y,
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-4 w-4" aria-hidden />
          Image canvas
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Zoom out" onClick={() => zoom(scale - 0.2)}>
            <ZoomOut className="h-4 w-4" aria-hidden />
          </IconButton>
          <span className="w-14 text-center text-xs text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <IconButton label="Zoom in" onClick={() => zoom(scale + 0.2)}>
            <ZoomIn className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton
            label="Reset view"
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>
      </div>
      <div
        className="relative flex aspect-video touch-none select-none items-center justify-center overflow-hidden bg-background"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="relative h-full w-full"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URL */}
          <img src={src} alt="" className="h-full w-full object-contain" draggable={false} />
          <div className="pointer-events-none absolute inset-0">
            {annotations.map((annotation) => (
              <AnnotationMarker
                key={annotation.id}
                annotation={annotation}
                selected={annotation.id === selectedAnnotationId}
                onSelect={onSelectAnnotation}
              />
            ))}
          </div>
        </div>
        <MiniMap
          src={src}
          annotations={annotations}
          scale={scale}
          selectedAnnotationId={selectedAnnotationId}
        />
      </div>
    </div>
  );
}

function AnnotationMarker({
  annotation,
  selected,
  onSelect,
}: {
  annotation: ReviewWorkspaceAnnotation;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const tone = annotationTone(annotation);
  const coords = annotation.coords;
  if (annotation.shape === "box" && hasBoxCoords(coords)) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(annotation.id);
        }}
        className={cn(
          "pointer-events-auto absolute rounded border-2",
          tone,
          selected ? "ring-2 ring-ring" : "",
        )}
        style={{
          left: `${coords.x * 100}%`,
          top: `${coords.y * 100}%`,
          width: `${coords.w * 100}%`,
          height: `${coords.h * 100}%`,
        }}
      >
        <span className="absolute -left-2 -top-2 rounded-full border bg-background px-1.5 py-0.5 text-[10px]">
          {annotation.seq}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(annotation.id);
      }}
      className={cn(
        "pointer-events-auto absolute flex h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold shadow-sm",
        tone,
        selected ? "ring-2 ring-ring" : "",
      )}
      style={{
        left: `${coords.x * 100}%`,
        top: `${coords.y * 100}%`,
      }}
    >
      {annotation.seq}
    </button>
  );
}

function MiniMap({
  src,
  annotations,
  scale,
  selectedAnnotationId,
}: {
  src: string;
  annotations: ReviewWorkspaceAnnotation[];
  scale: number;
  selectedAnnotationId: string | null;
}) {
  return (
    <div className="absolute bottom-3 right-3 w-40 rounded-lg border border-border bg-background/90 p-2 shadow-sm">
      <div className="relative aspect-video overflow-hidden rounded border border-border bg-surface-card">
        {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URL */}
        <img src={src} alt="" className="h-full w-full object-contain opacity-70" />
        {annotations.map((annotation) => (
          <span
            key={annotation.id}
            className={cn(
              "absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
              annotation.visibility === "internal" ? "bg-gold" : "bg-brand",
              annotation.id === selectedAnnotationId ? "ring-2 ring-ring" : "",
            )}
            style={{
              left: `${annotation.coords.x * 100}%`,
              top: `${annotation.coords.y * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Mini-map</span>
        <span>{Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
}

function ReadOnlyCommentPanel({
  deliverable,
  asset,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
}: {
  deliverable: ReviewWorkspaceDeliverable | null;
  asset: ReviewAsset | null;
  annotations: ReviewWorkspaceAnnotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string) => void;
}) {
  return (
    <aside className="border-t border-border/70 bg-surface-card lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <MessageSquareText className="h-4 w-4" aria-hidden />
        Pins
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-sm font-semibold text-foreground">
            {deliverable ? formatVersion(deliverable.version) : "General"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {asset ? asset.label : "Project-level context"}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
            Client
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gold" aria-hidden />
            Internal
          </span>
        </div>
        {annotations.map((annotation) => (
          <button
            key={annotation.id}
            type="button"
            onClick={() => onSelectAnnotation(annotation.id)}
            className={cn(
              "w-full rounded-lg border bg-background p-3 text-left",
              annotation.id === selectedAnnotationId
                ? "border-brand/60"
                : "border-border",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">
                Pin {annotation.seq}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  annotationTone(annotation),
                )}
              >
                {annotation.visibility}
              </span>
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              {annotation.shape}
              {annotation.timestampSec !== null
                ? ` - ${annotation.timestampSec.toFixed(1)}s`
                : ""}
            </span>
          </button>
        ))}
        {annotations.length === 0 ? (
          <div className="rounded-lg border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            No pins on this asset
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function EmptyCanvas({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex aspect-video w-full max-w-4xl items-center justify-center rounded-lg border border-border bg-surface-card">
      <div className="max-w-sm text-center">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function ExternalCanvas({ asset }: { asset: Extract<ReviewAsset, { source: "external" }> }) {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-surface-card p-6 text-center">
      <div className="max-w-md">
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- oEmbed thumbnail URL
          <img
            src={asset.thumbnailUrl}
            alt=""
            className="mx-auto mb-4 aspect-video w-full rounded-lg object-cover"
          />
        ) : (
          <ExternalLink className="mx-auto mb-4 h-8 w-8 text-muted-foreground" aria-hidden />
        )}
        <p className="text-base font-semibold text-foreground">
          {asset.title ?? asset.provider}
        </p>
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Open external
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function FileCanvas({ asset }: { asset: Extract<ReviewAsset, { kind: "file" }> }) {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-surface-card p-6 text-center">
      <div className="max-w-sm">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-base font-semibold text-foreground">Stored file</p>
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Open file
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );
}
