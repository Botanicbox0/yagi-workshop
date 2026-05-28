"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Pencil,
  RadioTower,
  SendHorizontal,
  TimerReset,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addCampaignDistributionAction,
  logCampaignDistributionMetricsAction,
  reviewCampaignSubmissionAction,
  setCampaignWorkflowStatusAction,
} from "@/app/[locale]/app/campaigns/actions";
import { statusPillClass } from "@/lib/ui/status-pill";
import { cn } from "@/lib/utils";

type CampaignStatus =
  | "requested"
  | "in_review"
  | "declined"
  | "draft"
  | "published"
  | "submission_closed"
  | "distributing"
  | "archived";

type SubmissionStatus =
  | "submitted"
  | "approved_for_distribution"
  | "declined"
  | "revision_requested"
  | "distributed"
  | "withdrawn";

type Decision = "approved" | "declined" | "revision_requested";
type Channel =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "youtube_shorts"
  | "x"
  | "other";

export type AdminCampaignConsoleCampaign = {
  id: string;
  slug: string;
  title: string;
  status: CampaignStatus;
  submission_open_at: string | null;
  submission_close_at: string | null;
  distribution_starts_at: string | null;
};

export type AdminCampaignConsoleSubmission = {
  id: string;
  title: string;
  description: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  team_name: string | null;
  external_url: string | null;
  content_r2_key: string | null;
  content_mime: string | null;
  status: SubmissionStatus;
  submitted_at: string;
  approved_at: string | null;
  declined_at: string | null;
  distributed_at: string | null;
  category: { id: string; name: string } | null;
  decisions: Array<{
    id: string;
    decision: Decision;
    comment: string | null;
    decided_at: string;
  }>;
  distributions: Array<{
    id: string;
    channel: Channel;
    url: string;
    posted_at: string;
    view_count: number | null;
    like_count: number | null;
    comment_count: number | null;
    metric_logged_at: string | null;
    metric_log_notes: string | null;
  }>;
};

const CHANNELS: Channel[] = [
  "tiktok",
  "instagram",
  "youtube",
  "youtube_shorts",
  "x",
  "other",
];

const DECISIONS: Decision[] = ["approved", "revision_requested", "declined"];

function formatDate(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function AdminCampaignConsole({
  campaign,
  submissions,
}: {
  campaign: AdminCampaignConsoleCampaign;
  submissions: AdminCampaignConsoleSubmission[];
}) {
  const t = useTranslations("admin_campaigns");
  const locale = useLocale();

  const counts = {
    submitted: submissions.filter((s) => s.status === "submitted").length,
    approved: submissions.filter(
      (s) => s.status === "approved_for_distribution",
    ).length,
    distributed: submissions.filter((s) => s.status === "distributed").length,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
              <RadioTower className="h-4 w-4" aria-hidden="true" />
              {t("console_eyebrow")}
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-foreground keep-all sm:text-3xl">
              {campaign.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("window", {
                open: formatDate(
                  campaign.submission_open_at,
                  locale,
                  t("unset"),
                ),
                close: formatDate(
                  campaign.submission_close_at,
                  locale,
                  t("unset"),
                ),
              })}
            </p>
          </div>
          <CampaignStatusControls campaign={campaign} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MetricTile label={t("metric_submitted")} value={counts.submitted} />
          <MetricTile label={t("metric_approved")} value={counts.approved} />
          <MetricTile label={t("metric_distributed")} value={counts.distributed} />
        </div>
      </section>

      {submissions.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border/70 bg-surface-card-deep p-8 text-center">
          <p className="text-sm text-muted-foreground keep-all">
            {t("empty_submissions")}
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {submissions.map((submission) => (
            <SubmissionReviewCard
              key={submission.id}
              campaignSlug={campaign.slug}
              submission={submission}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-card p-4">
      <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

function CampaignStatusControls({
  campaign,
}: {
  campaign: AdminCampaignConsoleCampaign;
}) {
  const t = useTranslations("admin_campaigns");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(status: "submission_closed" | "distributing" | "archived") {
    startTransition(async () => {
      const result = await setCampaignWorkflowStatusAction({
        campaignSlug: campaign.slug,
        status,
      });
      if (!result.ok) {
        toast.error(t(`error.${result.error}` as Parameters<typeof t>[0]));
        return;
      }
      toast.success(t("toast_status_saved"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-3 lg:items-end">
      <span
        className={cn(
          "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
          campaign.status === "archived"
            ? "bg-muted text-muted-foreground"
            : "bg-brand-soft text-brand",
        )}
      >
        {t(`campaign_status.${campaign.status}` as Parameters<typeof t>[0])}
      </span>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("submission_closed")}
          className="gap-2"
        >
          <TimerReset className="h-4 w-4" aria-hidden="true" />
          {t("close_submissions")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("distributing")}
          className="gap-2"
        >
          <RadioTower className="h-4 w-4" aria-hidden="true" />
          {t("start_distribution")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("archived")}
          className="gap-2"
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          {t("archive_campaign")}
        </Button>
      </div>
    </div>
  );
}

function SubmissionReviewCard({
  campaignSlug,
  submission,
}: {
  campaignSlug: string;
  submission: AdminCampaignConsoleSubmission;
}) {
  const t = useTranslations("admin_campaigns");
  const locale = useLocale();
  const latestDecision = submission.decisions[0] ?? null;

  return (
    <article className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${statusPillClass(
                "campaign_submission",
                submission.status,
              )}`}
            >
              {t(`submission_status.${submission.status}` as Parameters<typeof t>[0])}
            </span>
            <span className="text-xs text-muted-foreground">
              {submission.category?.name ?? t("uncategorized")}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground keep-all">
              {submission.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground keep-all">
              {submission.applicant_name}
              {submission.team_name ? ` / ${submission.team_name}` : ""} ·{" "}
              {formatDate(submission.submitted_at, locale, t("unset"))}
            </p>
          </div>
          {submission.description ? (
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground keep-all">
              {submission.description}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{submission.applicant_email}</span>
            {submission.applicant_phone ? <span>{submission.applicant_phone}</span> : null}
          </div>
          <WorkLinks submission={submission} />
        </div>
        {latestDecision ? (
          <div className="w-full rounded-lg border border-border/70 bg-surface-card p-4 text-sm lg:w-72">
            <p className="font-semibold text-foreground">
              {t(`decision.${latestDecision.decision}` as Parameters<typeof t>[0])}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(latestDecision.decided_at, locale, t("unset"))}
            </p>
            {latestDecision.comment ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground keep-all">
                {latestDecision.comment}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 border-t border-border/70 pt-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ReviewForm campaignSlug={campaignSlug} submission={submission} />
        <DistributionOps campaignSlug={campaignSlug} submission={submission} />
      </div>
    </article>
  );
}

function WorkLinks({
  submission,
}: {
  submission: AdminCampaignConsoleSubmission;
}) {
  const t = useTranslations("admin_campaigns");
  const links = [
    submission.external_url
      ? { href: submission.external_url, label: t("open_external") }
      : null,
    submission.content_r2_key
      ? { href: null, label: t("r2_key", { key: submission.content_r2_key }) }
      : null,
  ].filter(Boolean) as Array<{ href: string | null; label: string }>;

  if (links.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("no_work_link")}</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) =>
        link.href ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-xs text-foreground transition-colors hover:border-brand hover:text-brand"
          >
            {link.label}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <span
            key={link.label}
            className="inline-flex rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground"
          >
            {link.label}
          </span>
        ),
      )}
    </div>
  );
}

function ReviewForm({
  campaignSlug,
  submission,
}: {
  campaignSlug: string;
  submission: AdminCampaignConsoleSubmission;
}) {
  const t = useTranslations("admin_campaigns");
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>("approved");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const disabled = submission.status !== "submitted" || isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await reviewCampaignSubmissionAction({
        campaignSlug,
        submissionId: submission.id,
        decision,
        comment: comment.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(t(`error.${result.error}` as Parameters<typeof t>[0]));
        return;
      }
      toast.success(t("toast_review_saved"));
      setComment("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-border/70 bg-surface-card p-4"
    >
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-brand" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("review_title")}
        </h3>
      </div>
      <div className="grid gap-3">
        <div className="space-y-2">
          <Label htmlFor={`decision-${submission.id}`}>
            {t("decision_label")}
          </Label>
          <Select
            value={decision}
            onValueChange={(value) => setDecision(value as Decision)}
            disabled={disabled}
          >
            <SelectTrigger id={`decision-${submission.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DECISIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`decision.${item}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`comment-${submission.id}`}>
            {t("comment_label")}
          </Label>
          <Textarea
            id={`comment-${submission.id}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={disabled}
            rows={3}
            maxLength={2000}
            className="resize-none"
          />
        </div>
        <Button
          type="submit"
          disabled={disabled}
          className="w-full gap-2 bg-brand text-brand-on hover:bg-brand/90"
        >
          {decision === "approved" ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : decision === "declined" ? (
            <XCircle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Pencil className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? t("saving") : t("save_review")}
        </Button>
      </div>
    </form>
  );
}

function DistributionOps({
  campaignSlug,
  submission,
}: {
  campaignSlug: string;
  submission: AdminCampaignConsoleSubmission;
}) {
  const t = useTranslations("admin_campaigns");
  const canAdd =
    submission.status === "approved_for_distribution" ||
    submission.status === "distributed";

  return (
    <div className="rounded-lg border border-border/70 bg-surface-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <SendHorizontal className="h-4 w-4 text-brand" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("distribution_title")}
        </h3>
      </div>

      {submission.distributions.length > 0 ? (
        <ul className="mb-4 space-y-3">
          {submission.distributions.map((distribution) => (
            <DistributionMetricRow
              key={distribution.id}
              campaignSlug={campaignSlug}
              distribution={distribution}
            />
          ))}
        </ul>
      ) : (
        <p className="mb-4 rounded-lg border border-dashed border-border/70 px-4 py-5 text-center text-sm text-muted-foreground keep-all">
          {t("distribution_empty")}
        </p>
      )}

      {canAdd ? (
        <AddDistributionForm
          campaignSlug={campaignSlug}
          submissionId={submission.id}
        />
      ) : (
        <p className="text-xs text-muted-foreground keep-all">
          {t("distribution_locked")}
        </p>
      )}
    </div>
  );
}

function AddDistributionForm({
  campaignSlug,
  submissionId,
}: {
  campaignSlug: string;
  submissionId: string;
}) {
  const t = useTranslations("admin_campaigns");
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("tiktok");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addCampaignDistributionAction({
        campaignSlug,
        submissionId,
        channel,
        url: url.trim(),
        notes: notes.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(t(`error.${result.error}` as Parameters<typeof t>[0]));
        return;
      }
      toast.success(t("toast_distribution_saved"));
      setUrl("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
        <div className="space-y-2">
          <Label htmlFor={`channel-${submissionId}`}>{t("channel_label")}</Label>
          <Select
            value={channel}
            onValueChange={(value) => setChannel(value as Channel)}
            disabled={isPending}
          >
            <SelectTrigger id={`channel-${submissionId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`channel.${item}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`url-${submissionId}`}>{t("url_label")}</Label>
          <Input
            id={`url-${submissionId}`}
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t("url_placeholder")}
            maxLength={2048}
            required
            disabled={isPending}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`dist-notes-${submissionId}`}>{t("notes_label")}</Label>
        <Input
          id={`dist-notes-${submissionId}`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          disabled={isPending}
        />
      </div>
      <Button type="submit" disabled={isPending} size="sm" className="w-fit gap-2">
        <SendHorizontal className="h-4 w-4" aria-hidden="true" />
        {isPending ? t("saving") : t("save_distribution")}
      </Button>
    </form>
  );
}

function DistributionMetricRow({
  campaignSlug,
  distribution,
}: {
  campaignSlug: string;
  distribution: AdminCampaignConsoleSubmission["distributions"][number];
}) {
  const t = useTranslations("admin_campaigns");
  const router = useRouter();
  const [views, setViews] = useState(distribution.view_count?.toString() ?? "");
  const [likes, setLikes] = useState(distribution.like_count?.toString() ?? "");
  const [comments, setComments] = useState(
    distribution.comment_count?.toString() ?? "",
  );
  const [notes, setNotes] = useState(distribution.metric_log_notes ?? "");
  const [isPending, startTransition] = useTransition();

  function toMetric(value: string) {
    return value.trim().length > 0 ? parseInt(value.trim(), 10) : null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await logCampaignDistributionMetricsAction({
        campaignSlug,
        distributionId: distribution.id,
        viewCount: toMetric(views),
        likeCount: toMetric(likes),
        commentCount: toMetric(comments),
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        toast.error(t(`error.${result.error}` as Parameters<typeof t>[0]));
        return;
      }
      toast.success(t("toast_metric_saved"));
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-border/70 bg-background/40 p-3">
      <div className="mb-3 min-w-0">
        <span className="inline-flex rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-foreground">
          {t(`channel.${distribution.channel}` as Parameters<typeof t>[0])}
        </span>
        <a
          href={distribution.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block break-all text-xs text-muted-foreground hover:text-brand"
        >
          {distribution.url}
        </a>
      </div>
      <form onSubmit={submit} className="grid gap-2">
        <div className="grid grid-cols-3 gap-2">
          <MetricInput
            label={t("views")}
            value={views}
            onChange={setViews}
            disabled={isPending}
          />
          <MetricInput
            label={t("likes")}
            value={likes}
            onChange={setLikes}
            disabled={isPending}
          />
          <MetricInput
            label={t("comments")}
            value={comments}
            onChange={setComments}
            disabled={isPending}
          />
        </div>
        <Input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("metric_notes_placeholder")}
          maxLength={500}
          disabled={isPending}
        />
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending ? t("saving") : t("save_metric")}
        </Button>
      </form>
    </li>
  );
}

function MetricInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="grid gap-1 text-[11px] text-muted-foreground">
      {label}
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-9 text-xs"
      />
    </label>
  );
}
