"use client";

// Phase 7 Wave C.3 — Applicant distribution registration + metric log panel.
//
// State machine (applicant-driven):
//   approved_for_distribution + 0 distributions → "Add channel" CTA shown
//   approved_for_distribution + 1+ distributions → Add CTA + list shown
//   distributed → list + "Add another channel" + per-distribution metric log

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import {
  addDistributionAction,
  logDistributionMetricsAction,
} from "../_actions/distribution-actions";

type Channel =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "youtube_shorts"
  | "x"
  | "other";

type Distribution = {
  id: string;
  channel: string;
  url: string;
  posted_at: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  metric_logged_at: string | null;
};

const CHANNELS: Channel[] = [
  "tiktok",
  "instagram",
  "youtube",
  "youtube_shorts",
  "x",
  "other",
];

const ERROR_KEYS = new Set([
  "input_invalid",
  "unauthorized",
  "submission_not_found",
  "wrong_status",
  "insert_failed",
  "update_failed",
]);

export function DistributionPanel({
  submissionId,
  status,
  distributions,
}: {
  submissionId: string;
  status: string;
  distributions: Distribution[];
}) {
  const router = useRouter();
  const t = useTranslations("my_submissions.distribution");
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(distributions.length === 0);
  const [channel, setChannel] = useState<Channel>("tiktok");
  const [url, setUrl] = useState("");

  function toastError(code: string) {
    const known = ERROR_KEYS.has(code);
    const key = (known
      ? `error.${code}`
      : "error.add_failed") as Parameters<typeof t>[0];
    toast.error(t(key));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error(t("error.url_required"));
      return;
    }
    startTransition(async () => {
      const res = await addDistributionAction({
        submission_id: submissionId,
        channel,
        url: url.trim(),
      });
      if (!res.ok) {
        toastError(res.error);
        return;
      }
      toast.success(t("toast_added"));
      setUrl("");
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-[24px] border border-border bg-card p-6 md:p-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("title")}
        </h2>
        <p className="text-xs text-muted-foreground keep-all leading-relaxed">
          {status === "approved_for_distribution"
            ? t("intro_pre_distribution")
            : t("intro_post_distribution")}
        </p>
      </div>

      {/* Existing distributions */}
      {distributions.length > 0 && (
        <ul className="space-y-3">
          {distributions.map((d) => (
            <DistributionRow key={d.id} distribution={d} />
          ))}
        </ul>
      )}

      {/* Add form */}
      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-4 rounded-[24px] border border-border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label htmlFor="dist_channel">{t("channel_label")}</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger id="dist_channel" className="rounded-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`channel.${c}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dist_url">{t("url_label")}</Label>
            <Input
              id="dist_url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("url_placeholder")}
              maxLength={2048}
              required
              className="rounded-[12px]"
            />
          </div>
          <div className="flex gap-3 justify-end">
            {distributions.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setUrl("");
                }}
              >
                {t("cancel_cta")}
              </Button>
            )}
            <Button
              type="submit"
              size="pill"
              disabled={isPending}
              className="bg-sage text-sage-ink hover:opacity-90"
            >
              {isPending ? "..." : t("add_cta")}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="rounded-full"
          >
            + {t("add_another_cta")}
          </Button>
        </div>
      )}
    </section>
  );
}

function DistributionRow({ distribution }: { distribution: Distribution }) {
  const t = useTranslations("my_submissions.distribution");
  const [editing, setEditing] = useState(false);
  const [views, setViews] = useState(
    distribution.view_count?.toString() ?? "",
  );
  const [likes, setLikes] = useState(
    distribution.like_count?.toString() ?? "",
  );
  const [comments, setComments] = useState(
    distribution.comment_count?.toString() ?? "",
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const channelLabel = t(`channel.${distribution.channel}` as Parameters<typeof t>[0]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await logDistributionMetricsAction({
        distribution_id: distribution.id,
        view_count: views.trim() ? parseInt(views.trim(), 10) : null,
        like_count: likes.trim() ? parseInt(likes.trim(), 10) : null,
        comment_count: comments.trim() ? parseInt(comments.trim(), 10) : null,
      });
      if (!res.ok) {
        toast.error(t("error.metric_save_failed"));
        return;
      }
      toast.success(t("toast_metric_saved"));
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <li className="rounded-[24px] border border-border bg-background p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-foreground border border-border">
              {channelLabel}
            </span>
          </div>
          <a
            href={distribution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline underline-offset-2 break-all"
          >
            {distribution.url}
          </a>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`v_${distribution.id}`} className="text-[11px]">
                {t("metric_views")}
              </Label>
              <Input
                id={`v_${distribution.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                value={views}
                onChange={(e) => setViews(e.target.value)}
                className="rounded-[12px] h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`l_${distribution.id}`} className="text-[11px]">
                {t("metric_likes")}
              </Label>
              <Input
                id={`l_${distribution.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                className="rounded-[12px] h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`c_${distribution.id}`} className="text-[11px]">
                {t("metric_comments")}
              </Label>
              <Input
                id={`c_${distribution.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="rounded-[12px] h-9 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              {t("cancel_cta")}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "..." : t("save_metric_cta")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex gap-4 text-muted-foreground tabular-nums">
            <span>
              {t("metric_views")}: {distribution.view_count ?? "—"}
            </span>
            <span>
              {t("metric_likes")}: {distribution.like_count ?? "—"}
            </span>
            <span>
              {t("metric_comments")}: {distribution.comment_count ?? "—"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-foreground hover:underline underline-offset-2"
          >
            {t("edit_metric_cta")}
          </button>
        </div>
      )}
    </li>
  );
}
