"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  LinkIcon,
  Loader2,
  MessageSquare,
  Pencil,
} from "lucide-react";
import type {
  DeliverableShareAsset,
  DeliverableShareData,
  DeliverableShareItem,
} from "@/lib/share/deliverable-share-data";
import { describeReleasedRound } from "@/lib/project-deliverables/release-state";
import {
  formatReleasedRoundLabel,
  formatRevisionUsageLabel,
  formatScopeIncludedRevisionsLabel,
} from "@/components/project-detail/revision-round-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TimedVideoPlayer,
  type TimedVideoLabels,
} from "@/components/project-detail/timed-video-player";
import type {
  AnnotationCoords,
  AnnotationShape,
} from "@/components/project-detail/deliverable-annotations";
import { formatMediaTime } from "@/lib/video-timecode";

type Labels = {
  eyebrow: string;
  subtitle: string;
  targetDelivery: string;
  unset: string;
  initialDelivery: string;
  revisionRound: string;
  revisionUsage: string;
  scopeIncludedRevisions: string;
  scopeControlLabel: string;
  agreedScope: string;
  scopeDeliverableTypes: string;
  scopeChannels: string;
  scopeRatioFormat: string;
  roundOverage: string;
  deliverableTypeOptions: Record<string, string>;
  channelOptions: Record<string, string>;
  visualRatioOptions: Record<string, string>;
  status: Record<string, string>;
  turn: Record<string, string>;
  note: string;
  noNote: string;
  comments: string;
  commentEmpty: string;
  commentTitle: string;
  reviewTitle: string;
  name: string;
  email: string;
  body: string;
  commentSubmit: string;
  approve: string;
  requestChanges: string;
  submitting: string;
  successComment: string;
  successReview: string;
  errorGeneric: string;
  errorRequired: string;
  download: string;
  open: string;
  asset: string;
  timecode: string;
  video: TimedVideoLabels;
};

function formatDate(value: string | null, locale: "ko" | "en", fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "approved") return "border-green-500/30 bg-green-500/10 text-green-300";
  if (status === "changes_requested") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-border bg-surface-card text-muted-foreground";
}

function turnKey(status: string) {
  if (status === "approved") return "approved";
  if (status === "changes_requested") return "yagi_revision";
  return "client_review";
}

export function DeliverableShareRoom({
  data,
  locale,
  labels,
}: {
  data: DeliverableShareData;
  locale: "ko" | "en";
  labels: Labels;
}) {
  const deliverables = useMemo(
    () => [...data.deliverables].sort((a, b) => b.releasedRound - a.releasedRound),
    [data.deliverables],
  );
  const usageLabel = formatRevisionUsageLabel(
    {
      releasedCount: data.releasedCount,
      revisionRoundsLimit: data.project.revisionRoundsLimit,
    },
    labels.revisionUsage,
  );
  const ratioFormat = data.project.visualRatio
    ? data.project.visualRatio === "custom"
      ? data.project.visualRatioCustom
        ? `${labels.visualRatioOptions.custom} (${data.project.visualRatioCustom})`
        : labels.visualRatioOptions.custom
      : (labels.visualRatioOptions[data.project.visualRatio] ??
        data.project.visualRatio)
    : null;
  const scopeRows = [
    data.project.deliverableTypes.length > 0
      ? {
          label: labels.scopeDeliverableTypes,
          value: data.project.deliverableTypes
            .map((kind) => labels.deliverableTypeOptions[kind] ?? kind)
            .join(", "),
        }
      : null,
    data.project.channels.length > 0
      ? {
          label: labels.scopeChannels,
          value: data.project.channels
            .map((channel) => labels.channelOptions[channel] ?? channel)
            .join(", "),
        }
      : null,
    ratioFormat ? { label: labels.scopeRatioFormat, value: ratioFormat } : null,
    {
      label: labels.scopeControlLabel,
      value: formatScopeIncludedRevisionsLabel(
        data.project.revisionRoundsLimit,
        labels.scopeIncludedRevisions,
      ),
    },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1180px] space-y-6">
        <header className="rounded-lg border border-border bg-surface-raised p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-label text-brand">
            {labels.eyebrow}
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-display-ko text-foreground sm:text-4xl">
                {data.project.title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
                {labels.subtitle}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
              <span className="block text-xs uppercase tracking-label">
                {labels.targetDelivery}
              </span>
              <span className="mt-1 block text-foreground">
                {formatDate(data.project.targetDeliveryAt, locale, labels.unset)}
              </span>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-border bg-surface-raised p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm font-semibold text-foreground">{labels.agreedScope}</p>
            <span className="inline-flex w-fit rounded-full border border-border bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {usageLabel}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scopeRows.map((row) => (
              <div key={row.label} className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-label text-muted-foreground">
                  {row.label}
                </p>
                <p className="text-sm leading-6 text-foreground keep-all">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          {deliverables.map((deliverable) => (
            <DeliverableCard
              key={deliverable.id}
              token={data.token}
              deliverable={deliverable}
              releasedCount={data.releasedCount}
              revisionRoundsLimit={data.project.revisionRoundsLimit}
              locale={locale}
              labels={labels}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function DeliverableCard({
  token,
  deliverable,
  releasedCount,
  revisionRoundsLimit,
  locale,
  labels,
}: {
  token: string;
  deliverable: DeliverableShareItem;
  releasedCount: number;
  revisionRoundsLimit: number;
  locale: "ko" | "en";
  labels: Labels;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [commentAssetIndex, setCommentAssetIndex] = useState<number | null>(null);
  const [commentTimestampSec, setCommentTimestampSec] = useState<number | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const roundLabel = formatReleasedRoundLabel(deliverable.releasedRound, labels);
  const usageLabel = formatRevisionUsageLabel(
    { releasedCount, revisionRoundsLimit },
    labels.revisionUsage,
  );
  const releasedRoundDescription = describeReleasedRound(deliverable.releasedRound);
  const overage =
    releasedRoundDescription.kind === "revision" &&
    (releasedRoundDescription.revisionNumber ?? 0) > revisionRoundsLimit;
  const turn = labels.turn[turnKey(deliverable.status)].replace(
    "{round}",
    roundLabel,
  );

  function canSubmit(text: string) {
    return name.trim() && email.trim() && text.trim() && email.includes("@");
  }

  function submitComment() {
    if (!canSubmit(comment)) {
      setMessage(labels.errorRequired);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/share/d/${token}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverable_id: deliverable.id,
          author_name: name,
          author_email: email,
          body: comment,
          asset_index: commentAssetIndex ?? undefined,
          timestamp_sec: commentTimestampSec ?? undefined,
        }),
      });
      if (!res.ok) {
        setMessage(labels.errorGeneric);
        return;
      }
      setComment("");
      setCommentAssetIndex(null);
      setCommentTimestampSec(null);
      setMessage(labels.successComment);
    });
  }

  function submitReview(decision: "approved" | "changes_requested") {
    if (!canSubmit(reviewNote)) {
      setMessage(labels.errorRequired);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/share/d/${token}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverable_id: deliverable.id,
          decision,
          reviewer_name: name,
          reviewer_email: email,
          note: reviewNote,
        }),
      });
      if (!res.ok) {
        setMessage(labels.errorGeneric);
        return;
      }
      setReviewNote("");
      setMessage(labels.successReview);
    });
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface-raised">
      <div className="border-b border-border p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                V{deliverable.version}
              </h2>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label ${statusClass(deliverable.status)}`}>
                {labels.status[deliverable.status] ?? deliverable.status}
              </span>
              <span className="rounded-full border border-border bg-surface-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-foreground">
                {roundLabel}
              </span>
              <span className="rounded-full border border-border bg-surface-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
                {usageLabel}
              </span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground keep-all">
              {turn}
            </p>
            {overage ? (
              <p className="text-xs leading-5 text-amber-300 keep-all">
                {labels.roundOverage}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(deliverable.releasedAt, locale, labels.unset)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {deliverable.assets.map((asset, index) => (
              <AssetPreview
                key={`${asset.kind}-${asset.kind === "storage" ? asset.key : asset.url}`}
                asset={asset}
                index={index}
                annotations={deliverable.annotations.filter(
                  (annotation) => annotation.assetIndex === index,
                )}
                selectedAnnotationId={selectedAnnotationId}
                labels={labels}
                onSelectAnnotation={setSelectedAnnotationId}
                onCaptureTime={(timestampSec, assetIndex) => {
                  setCommentAssetIndex(assetIndex);
                  setCommentTimestampSec(timestampSec);
                }}
              />
            ))}
          </div>
          <section className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-medium uppercase tracking-label text-muted-foreground">
              {labels.note}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground keep-all">
              {deliverable.note || labels.noNote}
            </p>
          </section>
          <section className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-medium uppercase tracking-label text-muted-foreground">
              {labels.comments}
            </p>
            {deliverable.annotations.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{labels.commentEmpty}</p>
            ) : (
              <div className="mt-3 space-y-3">
                {deliverable.annotations.map((annotation) => (
                  <div key={annotation.id} className="rounded-md border border-border bg-surface-card p-3">
                    <p className="text-xs font-semibold text-foreground">
                      #{annotation.seq}
                    </p>
                    {annotation.timestampSec != null ? (
                      <button
                        type="button"
                        onClick={() => setSelectedAnnotationId(annotation.id)}
                        className="mt-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground hover:border-brand hover:text-brand"
                      >
                        {labels.timecode}: {formatMediaTime(annotation.timestampSec)}
                      </button>
                    ) : null}
                    {annotation.messages.map((item) => (
                      <div key={item.id} className="mt-2 border-t border-border/70 pt-2">
                        <p className="text-xs text-muted-foreground">
                          {item.authorName ?? "Client"} ·{" "}
                          {formatDate(item.createdAt, locale, labels.unset)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground keep-all">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-sm font-semibold text-foreground">{labels.commentTitle}</p>
            <IdentityFields
              name={name}
              email={email}
              labels={labels}
              onName={setName}
              onEmail={setEmail}
            />
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-3 min-h-[96px] resize-none"
              placeholder={labels.body}
              maxLength={4000}
            />
            {commentTimestampSec != null ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border bg-surface-card px-3 py-2 text-xs text-muted-foreground">
                <span>
                  {labels.asset.replace(
                    "{index}",
                    String((commentAssetIndex ?? 0) + 1),
                  )}{" "}
                  · {labels.timecode}: {formatMediaTime(commentTimestampSec)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCommentAssetIndex(null);
                    setCommentTimestampSec(null);
                  }}
                  className="text-foreground hover:text-brand"
                >
                  {labels.unset}
                </button>
              </div>
            ) : null}
            <Button
              type="button"
              onClick={submitComment}
              disabled={isPending}
              className="mt-3 w-full gap-2 bg-brand text-brand-on hover:bg-brand/90"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              {isPending ? labels.submitting : labels.commentSubmit}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-sm font-semibold text-foreground">{labels.reviewTitle}</p>
            <Textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              className="mt-3 min-h-[96px] resize-none"
              placeholder={labels.body}
              maxLength={4000}
            />
            <div className="mt-3 grid gap-2">
              <Button
                type="button"
                onClick={() => submitReview("approved")}
                disabled={isPending}
                className="gap-2 bg-brand text-brand-on hover:bg-brand/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                {labels.approve}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => submitReview("changes_requested")}
                disabled={isPending}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                {labels.requestChanges}
              </Button>
            </div>
          </div>

          {message ? (
            <p className="rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function IdentityFields({
  name,
  email,
  labels,
  onName,
  onEmail,
}: {
  name: string;
  email: string;
  labels: Labels;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-3">
      <div className="space-y-1.5">
        <Label>{labels.name}</Label>
        <Input value={name} onChange={(event) => onName(event.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>{labels.email}</Label>
        <Input
          type="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
        />
      </div>
    </div>
  );
}
function AssetPreview({
  asset,
  index,
  annotations,
  selectedAnnotationId,
  labels,
  onSelectAnnotation,
  onCaptureTime,
}: {
  asset: DeliverableShareAsset;
  index: number;
  annotations: DeliverableShareItem["annotations"];
  selectedAnnotationId: string | null;
  labels: Labels;
  onSelectAnnotation: (id: string) => void;
  onCaptureTime: (timestampSec: number, assetIndex: number) => void;
}) {
  if (asset.kind === "external") {
    return (
      <a
        href={asset.url}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-[160px] flex-col justify-between rounded-lg border border-border bg-background p-4 transition-colors hover:border-brand/70"
      >
        <LinkIcon className="h-6 w-6 text-muted-foreground" />
        <span className="mt-5 line-clamp-2 text-sm text-foreground">{asset.url}</span>
        <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
          {labels.open}
        </span>
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex aspect-video items-center justify-center bg-surface-card">
        {asset.mediaKind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL
          <img src={asset.url} alt={`Deliverable asset ${index + 1}`} className="h-full w-full object-contain" />
        ) : asset.mediaKind === "video" ? (
          <TimedVideoPlayer
            assetIndex={index}
            src={asset.url}
            streamUid={asset.streamUid}
            streamStatus={asset.streamStatus}
            annotations={annotations.map((annotation) => ({
              id: annotation.id,
              seq: annotation.seq,
              shape: annotation.shape as AnnotationShape,
              coords: annotation.coords as AnnotationCoords,
              status: annotation.status,
              timestampSec: annotation.timestampSec,
            }))}
            selectedId={selectedAnnotationId}
            draft={null}
            labels={labels.video}
            onSelectAnnotation={onSelectAnnotation}
            onCaptureTime={onCaptureTime}
          />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}
        {asset.mediaKind === "file" ? null : <ImageIcon className="sr-only" />}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {asset.key.split("/").at(-1)}
        </span>
        <a
          href={asset.url}
          download
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-foreground hover:border-brand hover:text-brand"
        >
          <Download className="h-3.5 w-3.5" />
          {labels.download}
        </a>
      </div>
    </div>
  );
}
