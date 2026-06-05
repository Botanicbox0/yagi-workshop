"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  CheckCircle2,
  ExternalLink,
  FileUp,
  FileVideo,
  ImageIcon,
  LinkIcon,
  Loader2,
  MessageSquare,
  PackagePlus,
  SendHorizontal,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProjectDeliverableVersionAction,
  getDeliverableUploadPutUrlAction,
  markDeliverableSeenAction,
  releaseDeliverableToClientAction,
} from "@/app/[locale]/app/projects/[id]/_actions/project-deliverables";
import {
  describeReleasedRound,
  getDeliverableTurnState,
} from "@/lib/project-deliverables/release-state";
import {
  formatReleasedRoundLabel,
  formatRevisionUsageLabel,
} from "@/components/project-detail/revision-round-labels";
import { streamThumbnailUrl } from "@/lib/stream/urls";

export type VersionStackDeliverable = {
  id: string;
  version: number;
  status: "submitted" | "changes_requested" | "approved" | string;
  note: string | null;
  releasedAt: string | null;
  releasedRound: number | null;
  seenByClient?: boolean;
  seenByYagi?: boolean;
  feedbackCount: number;
  createdAt: string;
  submittedBy: string | null;
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
};

type Labels = {
  title: string;
  subtitle: string;
  uploadTitle: string;
  uploadFile: string;
  uploadDropzoneTitle: string;
  uploadDropzoneSub: string;
  uploadSelectedFile: string;
  uploadClearFile: string;
  uploadUrl: string;
  uploadUrlPlaceholder: string;
  uploadNote: string;
  uploadNotePlaceholder: string;
  uploadSubmit: string;
  uploadSubmitting: string;
  emptyTitle: string;
  emptySub: string;
  version: string;
  submittedBy: string;
  submittedAt: string;
  versionsCount: string;
  assets: string;
  download: string;
  openExternal: string;
  storedFile: string;
  noNote: string;
  feedback: string;
  feedbackCount: string;
  delivery: string;
  final: string;
  internalDraft: string;
  release: string;
  releasing: string;
  releaseSuccess: string;
  releasedAt: string;
  initialDelivery: string;
  revisionRound: string;
  revisionUsage: string;
  seenByClient: string;
  seenByYagi: string;
  extendScopeTitle: string;
  extendScopeBody: string;
  extendScopeConfirm: string;
  extendScopeCancel: string;
  roundOverage: string;
  turn: Record<string, string>;
  errors: {
    assetRequired: string;
    invalidUrl: string;
    fileTooLarge: string;
    unsupportedFileType: string;
    uploadFailed: string;
    forbidden: string;
    releaseFailed: string;
    generic: string;
  };
  success: string;
  status: Record<string, string>;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

const chipClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium";
const neutralChipClass = `${chipClass} border-border bg-surface-card text-muted-foreground`;
const actionControlClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-card px-3 text-xs font-medium text-foreground transition-colors hover:border-brand hover:text-brand";

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isAllowedUploadFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type === "application/pdf"
  );
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com") return null;
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ko", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}

function statusClass(status: string) {
  if (status === "approved") {
    return "border-green-500/30 bg-green-500/10 text-green-300";
  }
  if (status === "changes_requested") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-border bg-surface-card text-muted-foreground";
}

export function VersionStackTab({
  projectId,
  deliverables,
  revisionRoundsLimit,
  releasedCount,
  canUpload,
  isYagiAdmin,
  locale,
  labels,
}: {
  projectId: string;
  deliverables: VersionStackDeliverable[];
  revisionRoundsLimit: number;
  releasedCount: number;
  canUpload: boolean;
  isYagiAdmin: boolean;
  locale: string;
  labels: Labels;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [note, setNote] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sortedDeliverables = useMemo(
    () => [...deliverables].sort((a, b) => b.version - a.version),
    [deliverables],
  );
  const usageLabel = formatRevisionUsageLabel(
    { releasedCount, revisionRoundsLimit },
    labels.revisionUsage,
  );

  function resetForm() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setExternalUrl("");
    setNote("");
  }

  function selectFile(nextFile: File | null) {
    if (nextFile && !isAllowedUploadFile(nextFile)) {
      toast.error(labels.errors.unsupportedFileType);
      return;
    }
    setFile(nextFile);
    if (!nextFile && fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    const trimmedUrl = externalUrl.trim();
    if (!file && !trimmedUrl) {
      toast.error(labels.errors.assetRequired);
      return;
    }
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error(labels.errors.fileTooLarge);
      return;
    }
    if (trimmedUrl && !isHttpUrl(trimmedUrl)) {
      toast.error(labels.errors.invalidUrl);
      return;
    }

    startTransition(async () => {
      let storagePaths: string[] = [];
      if (file) {
        const presign = await getDeliverableUploadPutUrlAction({
          projectId,
          fileName: file.name,
          contentType: file.type,
        });
        if (!presign.ok) {
          toast.error(
            presign.error === "forbidden"
              ? labels.errors.forbidden
              : labels.errors.uploadFailed,
          );
          return;
        }

        const putRes = await fetch(presign.putUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!putRes.ok) {
          toast.error(labels.errors.uploadFailed);
          return;
        }
        storagePaths = [presign.storageKey];
      }

      const result = await createProjectDeliverableVersionAction({
        projectId,
        storagePaths,
        externalUrls: trimmedUrl ? [trimmedUrl] : [],
        note: note.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(
          result.error === "forbidden" ? labels.errors.forbidden : labels.errors.generic,
        );
        return;
      }

      resetForm();
      toast.success(labels.success);
      router.refresh();
    });
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground keep-all">
              {labels.title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
              {labels.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-border bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {labels.versionsCount.replace(
                "{count}",
                String(sortedDeliverables.length),
              )}
            </div>
            <div className="rounded-full border border-border bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {usageLabel}
            </div>
          </div>
        </div>
      </div>

      {canUpload && (
        <div className="rounded-lg border border-border/70 bg-surface-card p-5">
          <div className="mb-5 flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-brand" aria-hidden="true" />
            <h3 className="text-base font-semibold text-foreground">
              {labels.uploadTitle}
            </h3>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-2">
              <Label htmlFor="version-file">{labels.uploadFile}</Label>
              <input
                ref={fileInputRef}
                id="version-file"
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                disabled={isPending}
                tabIndex={-1}
                className="sr-only"
              />
              <div
                role="button"
                tabIndex={isPending ? -1 : 0}
                aria-disabled={isPending}
                onClick={() => {
                  if (!isPending) fileInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (isPending) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (isPending) return;
                  dragDepthRef.current += 1;
                  setIsDraggingFile(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!isPending) setIsDraggingFile(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                  if (dragDepthRef.current === 0) setIsDraggingFile(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dragDepthRef.current = 0;
                  setIsDraggingFile(false);
                  if (isPending) return;
                  selectFile(event.dataTransfer.files?.[0] ?? null);
                }}
                className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition-colors focus:outline-none focus:ring-1 focus:ring-ring ${
                  isDraggingFile
                    ? "border-brand bg-brand-soft"
                    : "border-border/70 bg-background/40 hover:border-brand/70"
                } ${isPending ? "pointer-events-none opacity-60" : ""}`}
              >
                <FileUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-foreground keep-all">
                  {labels.uploadDropzoneTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground keep-all">
                  {labels.uploadDropzoneSub}
                </p>
              </div>
              {file ? (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-surface-card p-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {labels.uploadSelectedFile}
                    </p>
                    <p className="mt-1 truncate text-sm text-foreground">{file.name}</p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isPending}
                    aria-label={labels.uploadClearFile}
                    onClick={() => selectFile(null)}
                    className="h-8 w-8 shrink-0 rounded-full"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="version-url">{labels.uploadUrl}</Label>
                <Input
                  id="version-url"
                  type="url"
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                  placeholder={labels.uploadUrlPlaceholder}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version-note">{labels.uploadNote}</Label>
                <Textarea
                  id="version-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={labels.uploadNotePlaceholder}
                  className="min-h-28 resize-none"
                  disabled={isPending}
                  maxLength={2000}
                />
              </div>
            </div>
          </div>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="mt-5 gap-2 bg-brand text-brand-on hover:bg-brand/90"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? labels.uploadSubmitting : labels.uploadSubmit}
          </Button>
        </div>
      )}

      {sortedDeliverables.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-surface-card px-4 py-14 text-center">
          <FileVideo className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 text-base font-semibold text-foreground keep-all">
            {labels.emptyTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground keep-all">
            {labels.emptySub}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDeliverables.map((deliverable) => (
            <VersionCard
              key={deliverable.id}
              deliverable={deliverable}
              projectId={projectId}
              revisionRoundsLimit={revisionRoundsLimit}
              releasedCount={releasedCount}
              isYagiAdmin={isYagiAdmin}
              locale={locale}
              labels={labels}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function VersionCard({
  projectId,
  deliverable,
  revisionRoundsLimit,
  releasedCount,
  isYagiAdmin,
  locale,
  labels,
}: {
  projectId: string;
  deliverable: VersionStackDeliverable;
  revisionRoundsLimit: number;
  releasedCount: number;
  isYagiAdmin: boolean;
  locale: string;
  labels: Labels;
}) {
  const assets = deliverable.storageAssets.length + deliverable.externalAssets.length;
  const turnState = getDeliverableTurnState({
    releasedAt: deliverable.releasedAt,
    status: deliverable.status,
  });
  const roundLabel = formatReleasedRoundLabel(deliverable.releasedRound, labels);
  const usageLabel = formatRevisionUsageLabel(
    { releasedCount, revisionRoundsLimit },
    labels.revisionUsage,
  );
  const turnText = labels.turn[turnState].replace("{round}", roundLabel);
  const hasMarkedSeenRef = useRef(false);
  const releasedRoundDescription = describeReleasedRound(deliverable.releasedRound);
  const isOverIncludedRounds =
    releasedRoundDescription.kind === "revision" &&
    (releasedRoundDescription.revisionNumber ?? 0) > revisionRoundsLimit;
  const seenLabel =
    deliverable.releasedAt && isYagiAdmin && deliverable.seenByClient === true
      ? labels.seenByClient
      : deliverable.releasedAt && !isYagiAdmin && deliverable.seenByYagi === true
        ? labels.seenByYagi
        : null;

  useEffect(() => {
    if (!deliverable.releasedAt || hasMarkedSeenRef.current) return;
    hasMarkedSeenRef.current = true;
    void markDeliverableSeenAction({ deliverableId: deliverable.id }).catch(() => {
      // Read receipts are a non-critical signal; render must never depend on them.
    });
  }, [deliverable.id, deliverable.releasedAt]);

  return (
    <article className="overflow-hidden rounded-lg border border-border/70 bg-surface-raised">
      <div className="flex flex-col gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <span className="shrink-0 text-lg font-semibold tabular-nums text-foreground">
              {labels.version.replace("{version}", String(deliverable.version))}
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className={`${chipClass} ${statusClass(
                  deliverable.status,
                )}`}
              >
                {labels.status[deliverable.status] ?? deliverable.status}
              </span>
              {!deliverable.releasedAt ? (
                <span className={neutralChipClass}>
                  {labels.internalDraft}
                </span>
              ) : deliverable.releasedRound ? (
                <span className={`${chipClass} border-border bg-surface-card text-foreground`}>
                  {roundLabel}
                </span>
              ) : null}
              {deliverable.releasedAt ? (
                <span className={neutralChipClass}>
                  {usageLabel}
                </span>
              ) : null}
              {seenLabel ? (
                <span className={neutralChipClass}>
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {seenLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              {labels.submittedBy}: {deliverable.submittedBy ?? "-"}
            </span>
            <span>
              {labels.submittedAt}: {formatDate(deliverable.createdAt, locale)}
            </span>
            {deliverable.releasedAt ? (
              <span>
                {labels.releasedAt}: {formatDate(deliverable.releasedAt, locale)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
            {turnText}
          </p>
          {isOverIncludedRounds ? (
            <p className="mt-1 text-xs leading-5 text-amber-300 keep-all">
              {labels.roundOverage}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className={neutralChipClass}>
            {labels.assets.replace("{count}", String(assets))}
          </span>
          {isYagiAdmin && !deliverable.releasedAt ? (
            <ReleaseDeliverableButton
              projectId={projectId}
              deliverableId={deliverable.id}
              revisionRoundsLimit={revisionRoundsLimit}
              labels={labels}
            />
          ) : null}
          <Link
            href={`?tab=comments&feedback=${deliverable.id}`}
            className={actionControlClass}
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{labels.feedback}</span>
            <span className="text-muted-foreground">
              {labels.feedbackCount.replace(
                "{count}",
                String(deliverable.feedbackCount),
              )}
            </span>
          </Link>
          <Link
            href="?tab=deliverables"
            className={actionControlClass}
          >
            <SendHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{labels.delivery}</span>
            {deliverable.status === "approved" ? (
              <span className="text-gold">{labels.final}</span>
            ) : null}
          </Link>
        </div>
      </div>

      <div className="grid items-stretch gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid max-w-5xl gap-5 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {deliverable.storageAssets.map((asset) => (
            <StoragePreview key={asset.key} asset={asset} labels={labels} />
          ))}
          {deliverable.externalAssets.map((asset) => (
            <ExternalPreview key={asset.url} asset={asset} labels={labels} />
          ))}
        </div>
        <div className="flex min-h-40 rounded-lg border border-border/70 bg-background/40 p-5 lg:h-full">
          {deliverable.note ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground keep-all">
              {deliverable.note}
            </p>
          ) : (
            <p className="m-auto text-center text-sm text-muted-foreground">
              {labels.noNote}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function ReleaseDeliverableButton({
  projectId,
  deliverableId,
  revisionRoundsLimit,
  labels,
}: {
  projectId: string;
  deliverableId: string;
  revisionRoundsLimit: number;
  labels: Labels;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmScope, setConfirmScope] = useState({
    limit: revisionRoundsLimit,
    limitPlusOne: revisionRoundsLimit + 1,
  });

  function release(extendScope = false) {
    startTransition(async () => {
      const result = await releaseDeliverableToClientAction({
        projectId,
        deliverableId,
        extendScope,
      });
      if (!result.ok) {
        if (result.error === "round_limit") {
          const resultLimit = result.revisionsLimit ?? revisionRoundsLimit;
          const resultReleasedCount = (result.revisionsUsed ?? resultLimit) + 1;
          setConfirmScope({
            limit: resultLimit,
            limitPlusOne: Math.max(resultLimit + 1, resultReleasedCount),
          });
          setConfirmOpen(true);
          return;
        }
        toast.error(
          result.error === "forbidden"
            ? labels.errors.forbidden
            : labels.errors.releaseFailed,
        );
        return;
      }
      toast.success(labels.releaseSuccess);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => release(false)}
        className="h-8 gap-1.5 rounded-full px-3 text-xs"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {isPending ? labels.releasing : labels.release}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.extendScopeTitle}</AlertDialogTitle>
            <AlertDialogDescription className="keep-all leading-relaxed">
              {labels.extendScopeBody
                .replace("{limit}", String(confirmScope.limit))
                .replace("{limitPlusOne}", String(confirmScope.limitPlusOne))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {labels.extendScopeCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                release(true);
                setConfirmOpen(false);
              }}
              className="bg-brand text-brand-on hover:bg-brand/90"
            >
              {labels.extendScopeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StoragePreview({
  asset,
  labels,
}: {
  asset: VersionStackDeliverable["storageAssets"][number];
  labels: Labels;
}) {
  const poster =
    asset.kind === "video" &&
    asset.streamUid &&
    asset.streamStatus === "ready"
      ? streamThumbnailUrl(asset.streamUid, 0)
      : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="flex aspect-video items-center justify-center bg-surface-card">
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 public URL
          <img src={asset.url} alt="" className="h-full w-full object-cover" />
        ) : asset.kind === "video" ? (
          <Link
            href="?tab=deliverables"
            aria-label={labels.delivery}
            className="flex h-full w-full items-center justify-center"
          >
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudflare Stream thumbnail URL
              <img src={poster} alt="" className="h-full w-full object-cover" />
            ) : (
              <FileVideo className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            )}
          </Link>
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-center justify-between gap-4 p-5">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {asset.key.split("/").at(-1) ?? labels.storedFile}
        </p>
        <a
          href={asset.url}
          download
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground hover:border-brand hover:text-brand"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {labels.download}
        </a>
      </div>
    </div>
  );
}

function ExternalPreview({
  asset,
  labels,
}: {
  asset: VersionStackDeliverable["externalAssets"][number];
  labels: Labels;
}) {
  const embedUrl =
    asset.provider === "youtube"
      ? getYouTubeEmbedUrl(asset.url)
      : asset.provider === "vimeo"
        ? getVimeoEmbedUrl(asset.url)
        : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="aspect-video bg-surface-card">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={asset.title ?? asset.url}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- oEmbed thumbnail
          <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LinkIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 p-5">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {asset.title ?? asset.url}
        </p>
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground hover:border-brand hover:text-brand"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {labels.openExternal}
        </a>
      </div>
    </div>
  );
}
