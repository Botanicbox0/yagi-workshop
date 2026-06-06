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
  useTransition,
  type ReactNode,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThreadPanel, type ThreadMessage } from "@/components/project/thread-panel";
import { createDeliverableAnnotationAction } from "@/app/[locale]/app/projects/[id]/annotation-actions";
import {
  releaseDeliverableToClientAction,
  reviewProjectDeliverableAction,
} from "@/app/[locale]/app/projects/[id]/_actions/project-deliverables";
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
  messages: ThreadMessage[];
};

export type ReviewWorkspaceThread = {
  id: string | null;
  deliverableId: string | null;
  annotationId: string | null;
  messages: ThreadMessage[];
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
  thread: ReviewWorkspaceThread;
};

type ReviewWorkspaceClientProps = {
  projectId: string;
  projectTitle: string;
  isStudioContext: boolean;
  canReview: boolean;
  currentUserId: string;
  deliverables: ReviewWorkspaceDeliverable[];
  generalThread: ReviewWorkspaceThread;
};

type StorageImageAsset = {
  id: string;
  source: "storage";
  label: string;
  assetIndex: number;
  kind: "image";
  url: string;
};

type StorageVideoAsset = {
  id: string;
  source: "storage";
  label: string;
  assetIndex: number;
  kind: "video";
  url: string;
  streamUid?: string | null;
  streamStatus?: string | null;
};

type StorageFileAsset = {
  id: string;
  source: "storage";
  label: string;
  assetIndex: number;
  kind: "file";
  url: string;
};

type ExternalReviewAsset = {
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

type StorageReviewAsset =
  | StorageImageAsset
  | StorageVideoAsset
  | StorageFileAsset;

type ReviewAsset = StorageReviewAsset | ExternalReviewAsset;
type ComparableAsset = StorageImageAsset | StorageVideoAsset;
type ComparableKind = ComparableAsset["kind"];

type DraftAnnotation = {
  assetIndex: number;
  shape: AnnotationShape;
  coords: AnnotationCoords;
  timestampSec?: number;
};

type AssetKindLabels = {
  image: string;
  video: string;
  file: string;
  youtube: string;
  vimeo: string;
  generic: string;
};

type StatusLabels = {
  submitted: string;
  changesRequested: string;
  approved: string;
  fallback: string;
};

function formatReviewStatus(status: string, labels: StatusLabels) {
  if (status === "submitted") return labels.submitted;
  if (status === "changes_requested") return labels.changesRequested;
  if (status === "approved") return labels.approved;
  return status || labels.fallback;
}

function assetsForDeliverable(
  deliverable: ReviewWorkspaceDeliverable | null,
  labels: AssetKindLabels,
) {
  if (!deliverable) return [];

  const storageAssets: StorageReviewAsset[] = deliverable.storageAssets.map(
    (asset, index) => {
      const base = {
        id: `storage:${index}:${asset.key}`,
        source: "storage" as const,
        label: `${labels[asset.kind]} ${index + 1}`,
        assetIndex: index,
        url: asset.url,
      };

      if (asset.kind === "video") {
        return {
          ...base,
          kind: "video",
          streamUid: asset.streamUid,
          streamStatus: asset.streamStatus,
        };
      }

      if (asset.kind === "image") {
        return {
          ...base,
          kind: "image",
        };
      }

      return {
        ...base,
        kind: "file",
      };
    },
  );

  const externalAssets: ExternalReviewAsset[] = deliverable.externalAssets.map(
    (asset, index) => ({
      id: `external:${index}:${asset.url}`,
      source: "external",
      label: `${labels[asset.provider]} ${index + 1}`,
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

function comparableAssetsForDeliverable(
  deliverable: ReviewWorkspaceDeliverable | null,
  labels: AssetKindLabels,
) {
  return assetsForDeliverable(deliverable, labels).filter(
    (asset): asset is ComparableAsset =>
      asset.source === "storage" &&
      (asset.kind === "image" || asset.kind === "video"),
  );
}

function getComparableAsset(
  deliverable: ReviewWorkspaceDeliverable | null,
  preferredKind: ComparableKind,
  labels: AssetKindLabels,
) {
  const comparable = comparableAssetsForDeliverable(deliverable, labels);
  return (
    comparable.find((asset) => asset.kind === preferredKind) ??
    comparable[0] ??
    null
  );
}

function annotationsForAsset(
  deliverable: ReviewWorkspaceDeliverable | null,
  asset: ComparableAsset | null,
) {
  if (!deliverable || !asset) return [];
  return deliverable.annotations.filter(
    (annotation) => annotation.assetIndex === asset.assetIndex,
  );
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
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function appendAnnotation(
  annotations: ReviewWorkspaceAnnotation[],
  next: ReviewWorkspaceAnnotation,
) {
  if (annotations.some((annotation) => annotation.id === next.id)) {
    return annotations;
  }
  return [...annotations, next].sort((a, b) => a.seq - b.seq);
}

export function ReviewWorkspaceClient({
  projectId,
  projectTitle,
  isStudioContext,
  canReview,
  currentUserId,
  deliverables,
  generalThread,
}: ReviewWorkspaceClientProps) {
  const router = useRouter();
  const t = useTranslations("project_detail.review_workspace");
  const assetKindLabels = useMemo<AssetKindLabels>(
    () => ({
      image: t("asset_kind.image"),
      video: t("asset_kind.video"),
      file: t("asset_kind.file"),
      youtube: t("asset_kind.youtube"),
      vimeo: t("asset_kind.vimeo"),
      generic: t("asset_kind.generic"),
    }),
    [t],
  );
  const [isPending, startTransition] = useTransition();
  const [isLifecyclePending, startLifecycleTransition] = useTransition();
  const [localDeliverables, setLocalDeliverables] = useState(deliverables);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState(
    deliverables[0]?.id ?? "general",
  );
  const selectedDeliverable =
    selectedDeliverableId === "general"
      ? null
      : localDeliverables.find((item) => item.id === selectedDeliverableId) ??
        null;
  const selectedDeliverableIndex = selectedDeliverable
    ? localDeliverables.findIndex((item) => item.id === selectedDeliverable.id)
    : -1;
  const assets = useMemo(
    () => assetsForDeliverable(selectedDeliverable, assetKindLabels),
    [assetKindLabels, selectedDeliverable],
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? null;
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null,
  );
  const [pinMode, setPinMode] = useState(false);
  const [draftAnnotation, setDraftAnnotation] = useState<DraftAnnotation | null>(
    null,
  );
  const [draftBody, setDraftBody] = useState("");
  const [draftInternal, setDraftInternal] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState(
    localDeliverables[1]?.id ?? localDeliverables[0]?.id ?? "",
  );
  const [compareRightId, setCompareRightId] = useState(
    localDeliverables[0]?.id ?? "",
  );
  const [reviewNote, setReviewNote] = useState("");
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);
  const [releaseConfirmScope, setReleaseConfirmScope] = useState({
    limit: 0,
    limitPlusOne: 1,
  });
  const annotationsForAsset =
    selectedDeliverable && selectedAsset?.source === "storage"
      ? selectedDeliverable.annotations.filter(
          (annotation) => annotation.assetIndex === selectedAsset.assetIndex,
        )
      : [];
  const allAnnotations = useMemo(
    () => localDeliverables.flatMap((deliverable) => deliverable.annotations),
    [localDeliverables],
  );

  useEffect(() => {
    setLocalDeliverables(deliverables);
  }, [deliverables]);

  useEffect(() => {
    if (
      selectedDeliverableId !== "general" &&
      !localDeliverables.some((deliverable) => deliverable.id === selectedDeliverableId)
    ) {
      setSelectedDeliverableId(localDeliverables[0]?.id ?? "general");
    }
  }, [localDeliverables, selectedDeliverableId]);

  useEffect(() => {
    setSelectedAssetId(null);
    setSelectedAnnotationId(null);
    setDraftAnnotation(null);
    setDraftBody("");
  }, [selectedDeliverableId]);

  useEffect(() => {
    setCompareLeftId((current) =>
      localDeliverables.some((deliverable) => deliverable.id === current)
        ? current
        : localDeliverables[1]?.id ?? localDeliverables[0]?.id ?? "",
    );
    setCompareRightId((current) =>
      localDeliverables.some((deliverable) => deliverable.id === current)
        ? current
        : localDeliverables[0]?.id ?? "",
    );
  }, [localDeliverables]);

  const selectedAnnotation =
    (compareMode ? allAnnotations : annotationsForAsset).find(
      (annotation) => annotation.id === selectedAnnotationId,
    ) ??
    null;
  const canPin =
    selectedDeliverable !== null &&
    selectedAsset?.source === "storage" &&
    (selectedAsset.kind === "image" || selectedAsset.kind === "video");
  const compareKind =
    selectedAsset?.source === "storage" &&
    (selectedAsset.kind === "image" || selectedAsset.kind === "video")
      ? selectedAsset.kind
      : "image";

  function saveDraftAnnotation() {
    if (!selectedDeliverable || !draftAnnotation || draftBody.trim().length === 0) {
      return;
    }
    const body = draftBody.trim();
    const visibility = isStudioContext && draftInternal ? "internal" : "client";
    const createdAt = new Date().toISOString();
    startTransition(async () => {
      const result = await createDeliverableAnnotationAction({
        projectId,
        deliverableId: selectedDeliverable.id,
        assetIndex: draftAnnotation.assetIndex,
        shape: draftAnnotation.shape,
        coords: draftAnnotation.coords,
        timestampSec: draftAnnotation.timestampSec,
        visibility,
        body,
      });
      if (!result.ok) {
        toast.error(
          result.error === "forbidden"
            ? t("toast.forbidden")
            : t("toast.pin_failed"),
        );
        return;
      }
      const optimisticAnnotation: ReviewWorkspaceAnnotation = {
        id: result.annotationId,
        projectId,
        deliverableId: selectedDeliverable.id,
        assetIndex: draftAnnotation.assetIndex,
        seq: result.seq,
        shape: draftAnnotation.shape,
        coords: draftAnnotation.coords,
        visibility,
        status: "open",
        timestampSec: draftAnnotation.timestampSec ?? null,
        threadId: result.threadId,
        createdAt,
        createdBy: currentUserId,
        messages: [
          {
            id: `optimistic:${result.threadId}`,
            thread_id: result.threadId,
            author_id: currentUserId,
            body,
            visibility: visibility === "internal" ? "internal" : "shared",
            created_at: createdAt,
            author: null,
            attachments: [],
          },
        ],
      };
      setLocalDeliverables((current) =>
        current.map((deliverable) =>
          deliverable.id === selectedDeliverable.id
            ? {
                ...deliverable,
                annotations: appendAnnotation(
                  deliverable.annotations,
                  optimisticAnnotation,
                ),
              }
            : deliverable,
        ),
      );
      setDraftAnnotation(null);
      setDraftBody("");
      setDraftInternal(false);
      setPinMode(false);
      setSelectedAnnotationId(result.annotationId);
      router.refresh();
    });
  }

  function releaseSelectedDeliverable(extendScope = false) {
    if (!selectedDeliverable || !isStudioContext) return;
    startLifecycleTransition(async () => {
      const result = await releaseDeliverableToClientAction({
        projectId,
        deliverableId: selectedDeliverable.id,
        extendScope,
      });
      if (!result.ok) {
        if (result.error === "round_limit") {
          const resultLimit = result.revisionsLimit ?? 0;
          const resultReleasedCount = (result.revisionsUsed ?? resultLimit) + 1;
          setReleaseConfirmScope({
            limit: resultLimit,
            limitPlusOne: Math.max(resultLimit + 1, resultReleasedCount),
          });
          setReleaseConfirmOpen(true);
          return;
        }
        toast.error(result.message ?? t("toast.release_failed"));
        return;
      }
      toast.success(t("toast.release_success"));
      const releasedAt = result.releasedAt;
      setLocalDeliverables((current) =>
        current.map((deliverable) =>
          deliverable.id === selectedDeliverable.id
            ? { ...deliverable, releasedAt }
            : deliverable,
        ),
      );
      setReleaseConfirmOpen(false);
      router.refresh();
    });
  }

  function reviewSelectedDeliverable(status: "approved" | "changes_requested") {
    if (!selectedDeliverable || reviewNote.trim().length === 0) return;
    const submittedReviewNote = reviewNote.trim();
    const reviewedAt = new Date().toISOString();
    startLifecycleTransition(async () => {
      const result = await reviewProjectDeliverableAction({
        projectId,
        deliverableId: selectedDeliverable.id,
        status,
        reviewNote: submittedReviewNote,
      });
      if (!result.ok) {
        toast.error(result.message ?? t("toast.review_failed"));
        return;
      }
      toast.success(
        status === "approved"
          ? t("toast.approved")
          : t("toast.changes_requested"),
      );
      setLocalDeliverables((current) =>
        current.map((deliverable) =>
          deliverable.id === selectedDeliverable.id
            ? {
                ...deliverable,
                status,
                reviewNote: submittedReviewNote,
                reviewedAt,
                reviewedBy: currentUserId,
              }
            : deliverable,
        ),
      );
      setReviewNote("");
      router.refresh();
    });
  }

  const selectAdjacentVersion = (direction: -1 | 1) => {
    if (selectedDeliverableIndex < 0) return;
    const next = localDeliverables[selectedDeliverableIndex + direction];
    if (next) setSelectedDeliverableId(next.id);
  };

  const toggleCompareMode = () => {
    setCompareMode((value) => !value);
    setPinMode(false);
    setDraftAnnotation(null);
    setDraftBody("");
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
      <header className="flex flex-col gap-4 border-b border-border/70 bg-surface-card px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t("header.eyebrow")}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              {t("header.title")}
            </h2>
            <span className="max-w-full truncate text-sm text-muted-foreground">
              {projectTitle}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => selectAdjacentVersion(1)}
              disabled={
                selectedDeliverableIndex < 0 ||
                selectedDeliverableIndex >= localDeliverables.length - 1
              }
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              {t("nav.prev")}
            </button>
            <button
              type="button"
              onClick={() => selectAdjacentVersion(-1)}
              disabled={selectedDeliverableIndex <= 0}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("nav.next")}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden />
              {isStudioContext ? t("context.studio") : t("context.client")}
            </span>
            <button
              type="button"
              onClick={toggleCompareMode}
              disabled={localDeliverables.length < 2}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40",
                compareMode
                  ? "border-brand/60 bg-brand/10 text-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {t("nav.compare")}
            </button>
          </div>
          <LifecycleHeaderActions
            deliverable={selectedDeliverable}
            isStudioContext={isStudioContext}
            canReview={canReview}
            reviewNote={reviewNote}
            isPending={isLifecyclePending}
            releaseConfirmOpen={releaseConfirmOpen}
            releaseConfirmScope={releaseConfirmScope}
            onReviewNoteChange={setReviewNote}
            onRelease={() => releaseSelectedDeliverable(false)}
            onConfirmRelease={() => releaseSelectedDeliverable(true)}
            onReleaseConfirmOpenChange={setReleaseConfirmOpen}
            onReview={reviewSelectedDeliverable}
          />
        </div>
      </header>

      <div className="grid min-h-[720px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_360px]">
        <VersionRail
          deliverables={localDeliverables}
          selectedDeliverableId={selectedDeliverable?.id ?? "general"}
          onSelectDeliverable={setSelectedDeliverableId}
        />
        <main className="flex min-h-[480px] flex-col bg-background">
          {compareMode ? (
            <>
              <CompareControls
                deliverables={localDeliverables}
                leftId={compareLeftId}
                rightId={compareRightId}
                onLeftChange={setCompareLeftId}
                onRightChange={setCompareRightId}
              />
              <CompareView
                deliverables={localDeliverables}
                leftId={compareLeftId}
                rightId={compareRightId}
                preferredKind={compareKind}
                selectedAnnotationId={selectedAnnotationId}
                onSelectAnnotation={setSelectedAnnotationId}
              />
            </>
          ) : (
            <>
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
                draftAnnotation={draftAnnotation}
                pinMode={pinMode && canPin}
                onSelectAnnotation={setSelectedAnnotationId}
                onDraftAnnotation={setDraftAnnotation}
              />
            </>
          )}
        </main>
        <CommentsPanel
          projectId={projectId}
          currentUserId={currentUserId}
          isStudioContext={isStudioContext}
          generalThread={generalThread}
          deliverable={selectedDeliverable}
          asset={selectedAsset}
          annotations={annotationsForAsset}
          selectedAnnotation={selectedAnnotation}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={setSelectedAnnotationId}
          pinMode={compareMode ? false : pinMode}
          canPin={compareMode ? false : canPin}
          onTogglePinMode={() => setPinMode((value) => !value)}
          draftAnnotation={draftAnnotation}
          draftBody={draftBody}
          draftInternal={draftInternal}
          isPending={isPending}
          onDraftBodyChange={setDraftBody}
          onDraftInternalChange={setDraftInternal}
          onCancelDraft={() => {
            setDraftAnnotation(null);
            setDraftBody("");
            setDraftInternal(false);
          }}
          onSaveDraft={saveDraftAnnotation}
        />
      </div>
    </section>
  );
}

function LifecycleHeaderActions({
  deliverable,
  isStudioContext,
  canReview,
  reviewNote,
  isPending,
  releaseConfirmOpen,
  releaseConfirmScope,
  onReviewNoteChange,
  onRelease,
  onConfirmRelease,
  onReleaseConfirmOpenChange,
  onReview,
}: {
  deliverable: ReviewWorkspaceDeliverable | null;
  isStudioContext: boolean;
  canReview: boolean;
  reviewNote: string;
  isPending: boolean;
  releaseConfirmOpen: boolean;
  releaseConfirmScope: { limit: number; limitPlusOne: number };
  onReviewNoteChange: (value: string) => void;
  onRelease: () => void;
  onConfirmRelease: () => void;
  onReleaseConfirmOpenChange: (open: boolean) => void;
  onReview: (status: "approved" | "changes_requested") => void;
}) {
  const t = useTranslations("project_detail.review_workspace");
  const statusLabels: StatusLabels = {
    submitted: t("status.submitted"),
    changesRequested: t("status.changes_requested"),
    approved: t("status.approved"),
    fallback: t("status.unknown"),
  };
  if (!deliverable) return null;

  const isReleased = deliverable.releasedAt !== null;
  const canSubmitReview = canReview && isReleased && reviewNote.trim().length > 0;
  const statusLabel = formatReviewStatus(deliverable.status, statusLabels);

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-2 rounded-lg border border-border bg-background p-3 lg:w-[560px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t("lifecycle.title")}
          </p>
          <p className="truncate text-sm text-foreground">
            {t("lifecycle.summary", {
              version: formatVersion(deliverable.version),
              status: statusLabel,
              release: isReleased
                ? t("status.released")
                : t("status.unreleased"),
            })}
          </p>
        </div>
        {isStudioContext && (
          <AlertDialog
            open={releaseConfirmOpen}
            onOpenChange={onReleaseConfirmOpenChange}
          >
            <button
              type="button"
              onClick={onRelease}
              disabled={isPending || isReleased}
              className="inline-flex h-8 items-center rounded-full bg-brand px-3 text-xs font-medium text-brand-on disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isReleased ? t("status.released") : t("lifecycle.release")}
            </button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("lifecycle.extend_title")}</AlertDialogTitle>
                <AlertDialogDescription className="leading-relaxed">
                  {t("lifecycle.extend_body", {
                    limit: releaseConfirmScope.limit,
                    limitPlusOne: releaseConfirmScope.limitPlusOne,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  {t("actions.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    onConfirmRelease();
                  }}
                  className="bg-brand text-brand-on hover:bg-brand/90"
                >
                  {t("lifecycle.extend_confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {canReview && (
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <Textarea
            value={reviewNote}
            onChange={(event) => onReviewNoteChange(event.target.value)}
            placeholder={
              isReleased
                ? t("lifecycle.review_note")
                : t("lifecycle.release_required")
            }
            disabled={isPending || !isReleased}
            className="min-h-[68px] resize-none bg-surface text-sm"
          />
          <div className="flex flex-wrap gap-2 md:flex-col">
            <button
              type="button"
              onClick={() => onReview("approved")}
              disabled={isPending || !canSubmitReview}
              className="inline-flex h-8 items-center justify-center rounded-full bg-brand px-3 text-xs font-medium text-brand-on disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("lifecycle.approve")}
            </button>
            <button
              type="button"
              onClick={() => onReview("changes_requested")}
              disabled={isPending || !canSubmitReview}
              className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("lifecycle.request_changes")}
            </button>
          </div>
        </div>
      )}
    </div>
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
  const t = useTranslations("project_detail.review_workspace");
  const statusLabels: StatusLabels = {
    submitted: t("status.submitted"),
    changesRequested: t("status.changes_requested"),
    approved: t("status.approved"),
    fallback: t("status.unknown"),
  };
  return (
    <aside className="border-b border-border/70 bg-surface-card lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <GalleryVerticalEnd className="h-4 w-4" aria-hidden />
        {t("versions.title")}
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
            {t("versions.general")}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {t("versions.general_subtitle")}
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
                    {t("versions.latest")}
                  </span>
                ) : null}
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">
                {t("versions.asset_status", {
                  count: assetCount,
                  status: formatReviewStatus(deliverable.status, statusLabels),
                })}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {deliverable.releasedAt
                  ? t("status.released")
                  : t("status.unreleased")}{" - "}
                {formatDate(deliverable.createdAt)}
              </span>
            </button>
          );
        })}
        {deliverables.length === 0 ? (
          <div className="rounded-lg border border-border bg-background px-3 py-8 text-center text-sm text-muted-foreground">
            {t("versions.empty")}
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
  const t = useTranslations("project_detail.review_workspace");
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
            {t("assets.empty")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CompareControls({
  deliverables,
  leftId,
  rightId,
  onLeftChange,
  onRightChange,
}: {
  deliverables: ReviewWorkspaceDeliverable[];
  leftId: string;
  rightId: string;
  onLeftChange: (id: string) => void;
  onRightChange: (id: string) => void;
}) {
  const t = useTranslations("project_detail.review_workspace");
  return (
    <div className="border-b border-border/70 bg-background px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t("compare.title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("compare.read_only")}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <VersionSelect
            label={t("compare.left")}
            value={leftId}
            deliverables={deliverables}
            onChange={onLeftChange}
          />
          <VersionSelect
            label={t("compare.right")}
            value={rightId}
            deliverables={deliverables}
            onChange={onRightChange}
          />
        </div>
      </div>
    </div>
  );
}

function VersionSelect({
  label,
  value,
  deliverables,
  onChange,
}: {
  label: string;
  value: string;
  deliverables: ReviewWorkspaceDeliverable[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-card px-3 py-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-32 bg-background px-2 py-1 text-foreground outline-none"
      >
        {deliverables.map((deliverable) => (
          <option key={deliverable.id} value={deliverable.id}>
            {formatVersion(deliverable.version)}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompareView({
  deliverables,
  leftId,
  rightId,
  preferredKind,
  selectedAnnotationId,
  onSelectAnnotation,
}: {
  deliverables: ReviewWorkspaceDeliverable[];
  leftId: string;
  rightId: string;
  preferredKind: ComparableKind;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string) => void;
}) {
  const t = useTranslations("project_detail.review_workspace");
  const assetKindLabels = useMemo<AssetKindLabels>(
    () => ({
      image: t("asset_kind.image"),
      video: t("asset_kind.video"),
      file: t("asset_kind.file"),
      youtube: t("asset_kind.youtube"),
      vimeo: t("asset_kind.vimeo"),
      generic: t("asset_kind.generic"),
    }),
    [t],
  );
  const leftDeliverable =
    deliverables.find((deliverable) => deliverable.id === leftId) ?? null;
  const rightDeliverable =
    deliverables.find((deliverable) => deliverable.id === rightId) ?? null;
  const leftAsset = getComparableAsset(
    leftDeliverable,
    preferredKind,
    assetKindLabels,
  );
  const rightAsset = getComparableAsset(
    rightDeliverable,
    preferredKind,
    assetKindLabels,
  );

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="grid w-full max-w-7xl gap-4 xl:grid-cols-2">
        <ComparePane
          side={t("compare.left")}
          deliverable={leftDeliverable}
          asset={leftAsset}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={onSelectAnnotation}
        />
        <ComparePane
          side={t("compare.right")}
          deliverable={rightDeliverable}
          asset={rightAsset}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={onSelectAnnotation}
        />
      </div>
    </div>
  );
}

function ComparePane({
  side,
  deliverable,
  asset,
  selectedAnnotationId,
  onSelectAnnotation,
}: {
  side: string;
  deliverable: ReviewWorkspaceDeliverable | null;
  asset: ComparableAsset | null;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string) => void;
}) {
  const t = useTranslations("project_detail.review_workspace");
  const videoT = useTranslations("project_detail.review_workspace.video");
  const videoLabels: TimedVideoLabels = {
    play: videoT("play"),
    pause: videoT("pause"),
    speed: videoT("speed"),
    frameBack: videoT("frame_back"),
    frameForward: videoT("frame_forward"),
    editTimecode: videoT("edit_timecode"),
    currentTime: videoT("current_time"),
    streamProcessing: videoT("stream_processing"),
    commentAtCurrentPrefix: videoT("comment_at_current_prefix"),
    commentAtCurrentSuffix: videoT("comment_at_current_suffix"),
    timecode: videoT("timecode"),
  };
  const annotations = annotationsForAsset(deliverable, asset);
  const assetTypeLabel = !asset
    ? t("compare.none")
    : asset.kind === "image"
      ? t("asset_type.image")
      : t("asset_type.video");

  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface-card p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {side}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {deliverable
              ? formatVersion(deliverable.version)
              : t("empty.no_version_title")}
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
          {assetTypeLabel}
        </span>
      </div>
      {!deliverable ? (
        <EmptyCanvas
          title={t("empty.no_version_title")}
          body={t("empty.no_version_body")}
        />
      ) : !asset ? (
        <EmptyCanvas
          title={formatVersion(deliverable.version)}
          body={t("empty.no_comparable")}
        />
      ) : asset.kind === "video" ? (
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
          labels={videoLabels}
          onSelectAnnotation={onSelectAnnotation}
        />
      ) : (
        <ImageCanvas
          assetIndex={asset.assetIndex}
          src={asset.url}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          draftAnnotation={null}
          pinMode={false}
          onSelectAnnotation={onSelectAnnotation}
          onDraftAnnotation={() => undefined}
        />
      )}
    </div>
  );
}

function MediaCanvas({
  deliverable,
  asset,
  annotations,
  selectedAnnotationId,
  draftAnnotation,
  pinMode,
  onSelectAnnotation,
  onDraftAnnotation,
}: {
  deliverable: ReviewWorkspaceDeliverable | null;
  asset: ReviewAsset | null;
  annotations: ReviewWorkspaceAnnotation[];
  selectedAnnotationId: string | null;
  draftAnnotation: DraftAnnotation | null;
  pinMode: boolean;
  onSelectAnnotation: (id: string) => void;
  onDraftAnnotation: (draft: DraftAnnotation) => void;
}) {
  const t = useTranslations("project_detail.review_workspace");
  const videoT = useTranslations("project_detail.review_workspace.video");
  const videoLabels: TimedVideoLabels = {
    play: videoT("play"),
    pause: videoT("pause"),
    speed: videoT("speed"),
    frameBack: videoT("frame_back"),
    frameForward: videoT("frame_forward"),
    editTimecode: videoT("edit_timecode"),
    currentTime: videoT("current_time"),
    streamProcessing: videoT("stream_processing"),
    commentAtCurrentPrefix: videoT("comment_at_current_prefix"),
    commentAtCurrentSuffix: videoT("comment_at_current_suffix"),
    timecode: videoT("timecode"),
  };
  if (!deliverable) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyCanvas
          title={t("versions.general")}
          body={t("empty.general_body")}
        />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyCanvas
          title={formatVersion(deliverable.version)}
          body={t("empty.no_assets_in_version")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {asset.source === "storage" && asset.kind === "video" ? (
          <TimedVideoPlayer
            assetIndex={asset.assetIndex}
            deliverableId={deliverable.id}
            src={asset.url}
            streamUid={asset.streamUid}
            streamStatus={asset.streamStatus}
            annotations={annotations}
            selectedId={selectedAnnotationId}
            draft={draftAnnotation}
            canAnnotate={pinMode}
            labels={videoLabels}
            onSelectAnnotation={onSelectAnnotation}
            onDraftAnnotation={onDraftAnnotation}
          />
        ) : asset.source === "storage" && asset.kind === "image" ? (
          <ImageCanvas
            assetIndex={asset.assetIndex}
            src={asset.url}
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            draftAnnotation={draftAnnotation}
            pinMode={pinMode}
            onSelectAnnotation={onSelectAnnotation}
            onDraftAnnotation={onDraftAnnotation}
          />
        ) : asset.source === "external" ? (
          <ExternalCanvas asset={asset} />
        ) : (
          <FileCanvas asset={asset} />
        )}
      </div>
    </div>
  );
}

function ImageCanvas({
  assetIndex,
  src,
  annotations,
  selectedAnnotationId,
  draftAnnotation,
  pinMode,
  onSelectAnnotation,
  onDraftAnnotation,
}: {
  assetIndex: number;
  src: string;
  annotations: ReviewWorkspaceAnnotation[];
  selectedAnnotationId: string | null;
  draftAnnotation: DraftAnnotation | null;
  pinMode: boolean;
  onSelectAnnotation: (id: string) => void;
  onDraftAnnotation: (draft: DraftAnnotation) => void;
}) {
  const t = useTranslations("project_detail.review_workspace");
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
    if (pinMode) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      onDraftAnnotation({
        assetIndex,
        shape: "pin",
        coords: { x, y },
      });
      return;
    }
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
          {t("canvas.image")}
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={t("canvas.zoom_out")} onClick={() => zoom(scale - 0.2)}>
            <ZoomOut className="h-4 w-4" aria-hidden />
          </IconButton>
          <span className="w-14 text-center text-xs text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <IconButton label={t("canvas.zoom_in")} onClick={() => zoom(scale + 0.2)}>
            <ZoomIn className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton
            label={t("canvas.reset_view")}
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
            {draftAnnotation?.assetIndex === assetIndex ? (
              <span
                className="absolute flex h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-brand bg-brand-soft text-xs font-semibold text-brand"
                style={{
                  left: `${draftAnnotation.coords.x * 100}%`,
                  top: `${draftAnnotation.coords.y * 100}%`,
                }}
              >
                +
              </span>
            ) : null}
          </div>
        </div>
        <MiniMap
          src={src}
          annotations={annotations}
          scale={scale}
          selectedAnnotationId={selectedAnnotationId}
          label={t("canvas.minimap")}
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
  label,
}: {
  src: string;
  annotations: ReviewWorkspaceAnnotation[];
  scale: number;
  selectedAnnotationId: string | null;
  label: string;
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
        <span>{label}</span>
        <span>{Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
}

function CommentsPanel({
  projectId,
  currentUserId,
  isStudioContext,
  generalThread,
  deliverable,
  asset,
  annotations,
  selectedAnnotation,
  selectedAnnotationId,
  onSelectAnnotation,
  pinMode,
  canPin,
  onTogglePinMode,
  draftAnnotation,
  draftBody,
  draftInternal,
  isPending,
  onDraftBodyChange,
  onDraftInternalChange,
  onCancelDraft,
  onSaveDraft,
}: {
  projectId: string;
  currentUserId: string;
  isStudioContext: boolean;
  generalThread: ReviewWorkspaceThread;
  deliverable: ReviewWorkspaceDeliverable | null;
  asset: ReviewAsset | null;
  annotations: ReviewWorkspaceAnnotation[];
  selectedAnnotation: ReviewWorkspaceAnnotation | null;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string) => void;
  pinMode: boolean;
  canPin: boolean;
  onTogglePinMode: () => void;
  draftAnnotation: DraftAnnotation | null;
  draftBody: string;
  draftInternal: boolean;
  isPending: boolean;
  onDraftBodyChange: (value: string) => void;
  onDraftInternalChange: (value: boolean) => void;
  onCancelDraft: () => void;
  onSaveDraft: () => void;
}) {
  const t = useTranslations("project_detail.review_workspace");
  const threadId = selectedAnnotation
    ? selectedAnnotation.threadId
    : deliverable
      ? deliverable.thread.id
      : generalThread.id;
  const initialMessages = selectedAnnotation
    ? selectedAnnotation.messages
    : deliverable
      ? deliverable.thread.messages
      : generalThread.messages;

  return (
    <aside className="border-t border-border/70 bg-surface-card lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <MessageSquareText className="h-4 w-4" aria-hidden />
        {t("pins.title")}
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-sm font-semibold text-foreground">
            {deliverable ? formatVersion(deliverable.version) : t("versions.general")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {asset ? asset.label : t("pins.project_context")}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
            {t("visibility.client")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gold" aria-hidden />
            {t("visibility.internal")}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <Button
            type="button"
            variant={pinMode ? "default" : "outline"}
            size="sm"
            disabled={!canPin}
            onClick={onTogglePinMode}
            className="w-full rounded-full text-xs uppercase tracking-[0.12em]"
          >
            {pinMode ? t("pins.pin_mode_on") : t("pins.add_pin")}
          </Button>
          {draftAnnotation ? (
            <div className="mt-3 space-y-3">
              <Textarea
                value={draftBody}
                onChange={(event) => onDraftBodyChange(event.target.value)}
                placeholder={t("pins.comment_placeholder")}
                className="min-h-24 resize-none"
              />
              {isStudioContext ? (
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="review-workspace-pin-internal" className="text-xs">
                    {draftInternal
                      ? t("visibility.internal")
                      : t("visibility.client")}
                  </Label>
                  <Switch
                    id="review-workspace-pin-internal"
                    checked={draftInternal}
                    onCheckedChange={onDraftInternalChange}
                  />
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || draftBody.trim().length === 0}
                  onClick={onSaveDraft}
                  className="rounded-full text-xs uppercase tracking-[0.12em]"
                >
                  {t("pins.save")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onCancelDraft}
                  className="rounded-full text-xs uppercase tracking-[0.12em]"
                >
                  {t("actions.cancel")}
                </Button>
              </div>
            </div>
          ) : null}
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
                {t("pins.pin_label", { seq: annotation.seq })}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  annotationTone(annotation),
                )}
              >
                {annotation.visibility === "internal"
                  ? t("visibility.internal")
                  : t("visibility.client")}
              </span>
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              {annotation.shape === "box" ? t("pins.shape_box") : t("pins.shape_pin")}
              {annotation.timestampSec !== null
                ? ` - ${annotation.timestampSec.toFixed(1)}s`
                : ""}
            </span>
          </button>
        ))}
        {annotations.length === 0 ? (
          <div className="rounded-lg border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            {t("pins.empty")}
          </div>
        ) : null}
        <ThreadPanel
          key={selectedAnnotation?.id ?? deliverable?.id ?? "general"}
          projectId={projectId}
          deliverableId={selectedAnnotation ? selectedAnnotation.deliverableId : deliverable?.id ?? null}
          annotationId={selectedAnnotation?.id ?? null}
          annotationVisibility={selectedAnnotation?.visibility ?? null}
          threadId={threadId}
          currentUserId={currentUserId}
          isYagiAdmin={isStudioContext}
          initialMessages={initialMessages}
        />
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

function ExternalCanvas({ asset }: { asset: ExternalReviewAsset }) {
  const t = useTranslations("project_detail.review_workspace");
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
          {t("assets.open_external")}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function FileCanvas({ asset }: { asset: StorageFileAsset }) {
  const t = useTranslations("project_detail.review_workspace");
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-surface-card p-6 text-center">
      <div className="max-w-sm">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-base font-semibold text-foreground">
          {t("assets.stored_file")}
        </p>
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {t("assets.open_file")}
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
