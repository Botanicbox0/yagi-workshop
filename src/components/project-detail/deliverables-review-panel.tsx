"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FileVideo,
  ImageIcon,
  LinkIcon,
  Loader2,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Input } from "@/components/ui/input";
import {
  releaseDeliverableToClientAction,
  revertDeliverablePublicReviewAction,
  reviewProjectDeliverableAction,
  setProjectRevisionRoundsLimitAction,
} from "@/app/[locale]/app/projects/[id]/_actions/project-deliverables";
import {
  AnnotatedImage,
  AnnotationPanel,
  type AnnotationCoords,
  type AnnotationLabels,
  type AnnotationShape,
  type DeliverableAnnotation,
} from "@/components/project-detail/deliverable-annotations";
import {
  describeReleasedRound,
  getDeliverableTurnState,
} from "@/lib/project-deliverables/release-state";
import {
  formatReleasedRoundLabel,
  formatRevisionUsageLabel,
  formatScopeIncludedRevisionsLabel,
} from "@/components/project-detail/revision-round-labels";
import {
  TimedVideoPlayer,
  type TimedVideoLabels,
} from "@/components/project-detail/timed-video-player";

export type DeliveryReviewDeliverable = {
  id: string;
  version: number;
  status: "submitted" | "changes_requested" | "approved" | string;
  note: string | null;
  releasedAt: string | null;
  releasedRound: number | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  submittedBy: string | null;
  storageAssets: Array<{
    key: string;
    url: string;
    kind: "image" | "video" | "file";
  }>;
  externalAssets: Array<{
    url: string;
    provider: "youtube" | "vimeo" | "generic";
    title: string | null;
    thumbnailUrl: string | null;
  }>;
  annotations: DeliverableAnnotation[];
};

export type DeliverablesScopeSummary = {
  deliverableTypes: string[];
  channels: string[];
  ratioFormat: string | null;
};

type Labels = {
  title: string;
  subtitle: string;
  finalCount: string;
  emptyTitle: string;
  emptySub: string;
  version: string;
  final: string;
  internalDraft: string;
  release: string;
  releasing: string;
  releaseSuccess: string;
  releasedAt: string;
  initialDelivery: string;
  revisionRound: string;
  revisionUsage: string;
  scopeIncludedRevisions: string;
  scopeControlLabel: string;
  scopeControlSave: string;
  scopeControlSaving: string;
  scopeControlSaved: string;
  scopeControlError: string;
  extendScopeTitle: string;
  extendScopeBody: string;
  extendScopeConfirm: string;
  extendScopeCancel: string;
  agreedScope: string;
  scopeDeliverableTypes: string;
  scopeChannels: string;
  scopeRatioFormat: string;
  roundOverage: string;
  turn: Record<string, string>;
  submittedBy: string;
  submittedAt: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewNote: string;
  versionNote: string;
  noNote: string;
  download: string;
  openExternal: string;
  storedFile: string;
  reviewTitle: string;
  approve: string;
  requestChanges: string;
  revertReview: string;
  noteLabel: string;
  notePlaceholder: string;
  submitting: string;
  success: string;
  errors: {
    validation: string;
    forbidden: string;
    releaseFailed: string;
    generic: string;
  };
  video: TimedVideoLabels;
  status: Record<string, string>;
  annotations: AnnotationLabels;
};

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
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

export function DeliverablesReviewPanel({
  projectId,
  deliverables,
  revisionRoundsLimit,
  releasedCount,
  scopeSummary,
  canReview,
  currentUserId,
  isYagiAdmin,
  locale,
  labels,
}: {
  projectId: string;
  deliverables: DeliveryReviewDeliverable[];
  revisionRoundsLimit: number;
  releasedCount: number;
  scopeSummary: DeliverablesScopeSummary;
  canReview: boolean;
  currentUserId: string;
  isYagiAdmin: boolean;
  locale: string;
  labels: Labels;
}) {
  const sortedDeliverables = useMemo(
    () => [...deliverables].sort((a, b) => b.version - a.version),
    [deliverables],
  );
  const finalCount = sortedDeliverables.filter(
    (deliverable) => deliverable.status === "approved",
  ).length;
  const usageLabel = formatRevisionUsageLabel(
    { releasedCount, revisionRoundsLimit },
    labels.revisionUsage,
  );

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
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {labels.finalCount.replace("{count}", String(finalCount))}
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-border bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {usageLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <AgreedScopeSummary
          revisionRoundsLimit={revisionRoundsLimit}
          summary={scopeSummary}
          labels={labels}
        />
        {isYagiAdmin ? (
          <RevisionScopeControl
            projectId={projectId}
            revisionRoundsLimit={revisionRoundsLimit}
            labels={labels}
          />
        ) : null}
      </div>

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
            <DeliverableCard
              key={deliverable.id}
              projectId={projectId}
              deliverable={deliverable}
              revisionRoundsLimit={revisionRoundsLimit}
              releasedCount={releasedCount}
              canReview={canReview}
              currentUserId={currentUserId}
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

function DeliverableCard({
  projectId,
  deliverable,
  revisionRoundsLimit,
  releasedCount,
  canReview,
  currentUserId,
  isYagiAdmin,
  locale,
  labels,
}: {
  projectId: string;
  deliverable: DeliveryReviewDeliverable;
  revisionRoundsLimit: number;
  releasedCount: number;
  canReview: boolean;
  currentUserId: string;
  isYagiAdmin: boolean;
  locale: string;
  labels: Labels;
}) {
  const assets = deliverable.storageAssets.length + deliverable.externalAssets.length;
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState<{
    assetIndex: number;
    shape: AnnotationShape;
    coords: AnnotationCoords;
    timestampSec?: number;
  } | null>(null);
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
  const releasedRoundDescription = describeReleasedRound(deliverable.releasedRound);
  const isOverIncludedRounds =
    releasedRoundDescription.kind === "revision" &&
    (releasedRoundDescription.revisionNumber ?? 0) > revisionRoundsLimit;

  return (
    <article className="overflow-hidden rounded-lg border border-border/70 bg-surface-raised">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-foreground">
              {labels.version.replace("{version}", String(deliverable.version))}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label ${statusClass(
                deliverable.status,
              )}`}
            >
              {labels.status[deliverable.status] ?? deliverable.status}
            </span>
            {deliverable.status === "approved" ? (
              <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-gold">
                {labels.final}
              </span>
            ) : null}
            {!deliverable.releasedAt ? (
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
                {labels.internalDraft}
              </span>
            ) : deliverable.releasedRound ? (
              <span className="rounded-full border border-border bg-surface-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-foreground">
                {roundLabel}
              </span>
            ) : null}
            {deliverable.releasedAt ? (
              <span className="rounded-full border border-border bg-surface-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
                {usageLabel}
              </span>
            ) : null}
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
          <span className="rounded-full border border-border bg-surface-card px-2.5 py-1 text-xs text-muted-foreground">
            {assets}
          </span>
          {isYagiAdmin && !deliverable.releasedAt ? (
            <ReleaseDeliverableButton
              projectId={projectId}
              deliverableId={deliverable.id}
              revisionRoundsLimit={revisionRoundsLimit}
              labels={labels}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-3 md:grid-cols-2">
          {deliverable.storageAssets.map((asset, index) => (
            <StoragePreview
              key={asset.key}
              asset={asset}
              assetIndex={index}
              annotations={deliverable.annotations.filter(
                (annotation) => annotation.assetIndex === index,
              )}
              selectedAnnotationId={selectedAnnotationId}
              draftAnnotation={draftAnnotation}
              canAnnotate={canReview}
              onSelectAnnotation={setSelectedAnnotationId}
              onDraftAnnotation={setDraftAnnotation}
              labels={labels}
            />
          ))}
          {deliverable.externalAssets.map((asset) => (
            <ExternalPreview key={asset.url} asset={asset} labels={labels} />
          ))}
        </div>

        <div className="space-y-3">
          <NoteBlock title={labels.versionNote} value={deliverable.note} labels={labels} />
          {(canReview || deliverable.annotations.length > 0) ? (
            <AnnotationPanel
              projectId={projectId}
              deliverableId={deliverable.id}
              currentUserId={currentUserId}
              isYagiAdmin={isYagiAdmin}
              annotations={deliverable.annotations}
              selectedId={selectedAnnotationId}
              draft={draftAnnotation}
              labels={labels.annotations}
              onSelect={setSelectedAnnotationId}
              onCancelDraft={() => setDraftAnnotation(null)}
            />
          ) : null}
          <div className="rounded-lg border border-border/70 bg-background/40 p-4">
            <p className="text-xs font-medium uppercase tracking-label text-muted-foreground">
              {labels.reviewNote}
            </p>
            {deliverable.reviewNote ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground keep-all">
                {deliverable.reviewNote}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{labels.noNote}</p>
            )}
            {deliverable.reviewedAt ? (
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  {labels.reviewedAt}: {formatDate(deliverable.reviewedAt, locale)}
                </p>
                <p>
                  {labels.reviewedBy}: {deliverable.reviewedBy ?? "-"}
                </p>
              </div>
            ) : null}
          </div>
          {canReview && deliverable.releasedAt ? (
            <ReviewControls
              projectId={projectId}
              deliverable={deliverable}
              isYagiAdmin={isYagiAdmin}
              labels={labels}
            />
          ) : null}
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
        className="h-8 gap-1.5"
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

function AgreedScopeSummary({
  revisionRoundsLimit,
  summary,
  labels,
}: {
  revisionRoundsLimit: number;
  summary: DeliverablesScopeSummary;
  labels: Labels;
}) {
  const rows = [
    summary.deliverableTypes.length > 0
      ? {
          label: labels.scopeDeliverableTypes,
          value: summary.deliverableTypes.join(", "),
        }
      : null,
    summary.channels.length > 0
      ? { label: labels.scopeChannels, value: summary.channels.join(", ") }
      : null,
    summary.ratioFormat
      ? { label: labels.scopeRatioFormat, value: summary.ratioFormat }
      : null,
    {
      label: labels.scopeControlLabel,
      value: formatScopeIncludedRevisionsLabel(
        revisionRoundsLimit,
        labels.scopeIncludedRevisions,
      ),
    },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <section className="rounded-lg border border-border/70 bg-surface-card p-5">
      <p className="text-sm font-semibold text-foreground">{labels.agreedScope}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-label text-muted-foreground">
              {row.label}
            </p>
            <p className="text-sm leading-6 text-foreground keep-all">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RevisionScopeControl({
  projectId,
  revisionRoundsLimit,
  labels,
}: {
  projectId: string;
  revisionRoundsLimit: number;
  labels: Labels;
}) {
  const router = useRouter();
  const [limit, setLimit] = useState(String(revisionRoundsLimit));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 50) {
      setMessage(labels.scopeControlError);
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const result = await setProjectRevisionRoundsLimitAction({
        projectId,
        limit: parsed,
      });
      if (!result.ok) {
        setMessage(
          result.error === "forbidden"
            ? labels.errors.forbidden
            : labels.scopeControlError,
        );
        return;
      }
      setMessage(labels.scopeControlSaved);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-border/70 bg-surface-card p-5">
      <div className="space-y-2">
        <Label htmlFor="revision-rounds-limit">{labels.scopeControlLabel}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="revision-rounds-limit"
            type="number"
            min={0}
            max={50}
            step={1}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            disabled={isPending}
            className="h-9"
          />
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={isPending}
            className="h-9 shrink-0 bg-brand text-brand-on hover:bg-brand/90"
          >
            {isPending ? labels.scopeControlSaving : labels.scopeControlSave}
          </Button>
        </div>
      </div>
      {message ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground keep-all">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function NoteBlock({
  title,
  value,
  labels,
}: {
  title: string;
  value: string | null;
  labels: Labels;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-4">
      <p className="text-xs font-medium uppercase tracking-label text-muted-foreground">
        {title}
      </p>
      {value ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground keep-all">
          {value}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{labels.noNote}</p>
      )}
    </div>
  );
}

function ReviewControls({
  projectId,
  deliverable,
  isYagiAdmin,
  labels,
}: {
  projectId: string;
  deliverable: DeliveryReviewDeliverable;
  isYagiAdmin: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [note, setNote] = useState(deliverable.reviewNote ?? "");
  const [isPending, startTransition] = useTransition();
  const disabled = isPending || note.trim().length === 0;

  function review(status: "approved" | "changes_requested") {
    startTransition(async () => {
      const result = await reviewProjectDeliverableAction({
        projectId,
        deliverableId: deliverable.id,
        status,
        reviewNote: note.trim(),
      });

      if (!result.ok) {
        if (result.error === "validation") toast.error(labels.errors.validation);
        else if (result.error === "forbidden") toast.error(labels.errors.forbidden);
        else toast.error(labels.errors.generic);
        return;
      }

      toast.success(
        labels.success.replace("{status}", labels.status[status] ?? status),
      );
      router.refresh();
    });
  }

  function revert() {
    startTransition(async () => {
      const result = await revertDeliverablePublicReviewAction({
        projectId,
        deliverableId: deliverable.id,
      });
      if (!result.ok) {
        toast.error(
          result.error === "forbidden" ? labels.errors.forbidden : labels.errors.generic,
        );
        return;
      }
      toast.success(labels.success.replace("{status}", labels.status.submitted ?? "submitted"));
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border/70 bg-surface-card p-4">
      <p className="text-sm font-semibold text-foreground">{labels.reviewTitle}</p>
      <div className="mt-3 space-y-2">
        <Label htmlFor={`review-note-${deliverable.id}`}>{labels.noteLabel}</Label>
        <Textarea
          id={`review-note-${deliverable.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={labels.notePlaceholder}
          className="min-h-[88px] resize-none"
          disabled={isPending}
          maxLength={2000}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => review("approved")}
          disabled={disabled}
          className="gap-2 bg-brand text-brand-on hover:bg-brand/90"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? labels.submitting : labels.approve}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => review("changes_requested")}
          disabled={disabled}
          className="gap-2"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {labels.requestChanges}
        </Button>
        {isYagiAdmin && deliverable.status !== "submitted" ? (
          <Button
            type="button"
            variant="outline"
            onClick={revert}
            disabled={isPending}
          >
            {labels.revertReview}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StoragePreview({
  asset,
  assetIndex,
  annotations,
  selectedAnnotationId,
  draftAnnotation,
  canAnnotate,
  onSelectAnnotation,
  onDraftAnnotation,
  labels,
}: {
  asset: DeliveryReviewDeliverable["storageAssets"][number];
  assetIndex: number;
  annotations: DeliverableAnnotation[];
  selectedAnnotationId: string | null;
  draftAnnotation: {
    assetIndex: number;
    shape: AnnotationShape;
    coords: AnnotationCoords;
    timestampSec?: number;
  } | null;
  canAnnotate: boolean;
  onSelectAnnotation: (id: string) => void;
  onDraftAnnotation: (draft: {
    assetIndex: number;
    shape: AnnotationShape;
    coords: AnnotationCoords;
    timestampSec?: number;
  }) => void;
  labels: Labels;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="flex aspect-video items-center justify-center bg-surface-card">
        {asset.kind === "image" && canAnnotate ? (
          <AnnotatedImage
            assetIndex={assetIndex}
            src={asset.url}
            alt=""
            annotations={annotations}
            selectedId={selectedAnnotationId}
            draft={draftAnnotation}
            labels={labels.annotations}
            onSelect={onSelectAnnotation}
            onDraft={onDraftAnnotation}
          />
        ) : asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 public URL
          <img src={asset.url} alt="" className="h-full w-full object-cover" />
        ) : asset.kind === "video" ? (
          <TimedVideoPlayer
            assetIndex={assetIndex}
            src={asset.url}
            annotations={annotations}
            selectedId={selectedAnnotationId}
            draft={draftAnnotation}
            canAnnotate={canAnnotate}
            labels={labels.video}
            onSelectAnnotation={onSelectAnnotation}
            onDraftAnnotation={onDraftAnnotation}
            onCaptureTime={
              canAnnotate
                ? (timestampSec, index) =>
                    onDraftAnnotation({
                      assetIndex: index,
                      shape: "pin",
                      coords: { x: 0.5, y: 0.5 },
                      timestampSec,
                    })
                : undefined
            }
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {asset.key.split("/").at(-1) ?? labels.storedFile}
        </p>
        <a
          href={asset.url}
          download
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-foreground hover:border-brand hover:text-brand"
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
  asset: DeliveryReviewDeliverable["externalAssets"][number];
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
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {asset.title ?? asset.url}
        </p>
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-foreground hover:border-brand hover:text-brand"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {labels.openExternal}
        </a>
      </div>
    </div>
  );
}
