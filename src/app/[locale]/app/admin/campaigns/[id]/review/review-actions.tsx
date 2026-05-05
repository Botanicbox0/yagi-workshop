"use client";

// Phase 7 Wave B.2 — Admin review action buttons.
//
// Available actions depend on the current status:
//   requested   → [Start review]
//   in_review   → [Approve], [Decline (note required)], [Request more info (note required)]
//   declined    → none (terminal state; admin can re-create from scratch)
//
// Each action: optional/required note → server action → toast → router.refresh()

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewCampaignRequestAction,
  approveCampaignRequestAction,
  declineCampaignRequestAction,
  requestMoreInfoAction,
} from "../../_actions/campaign-actions";

type Action = "review" | "approve" | "decline" | "more_info";

export function ReviewActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin_campaigns.review");
  const [comment, setComment] = useState("");
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: Action) {
    setPendingAction(action);
    startTransition(async () => {
      const trimmed = comment.trim();
      const arg = trimmed.length > 0 ? trimmed : undefined;

      let result: { ok: true } | { ok: false; error: string };
      switch (action) {
        case "review":
          result = await reviewCampaignRequestAction(campaignId, arg);
          break;
        case "approve":
          result = await approveCampaignRequestAction(campaignId, arg);
          break;
        case "decline":
          result = await declineCampaignRequestAction(campaignId, arg);
          break;
        case "more_info":
          result = await requestMoreInfoAction(campaignId, arg);
          break;
      }

      setPendingAction(null);

      if (!result.ok) {
        if (result.error === "comment_required") {
          toast.error(t("toast_decline_comment_required"));
        } else if (result.error === "stale_status") {
          toast.error(t("toast_stale_status"));
          // Refresh so the page reflects the current server-side status.
          router.refresh();
        } else {
          toast.error(t("toast_error"));
        }
        return;
      }

      switch (action) {
        case "review":
          toast.success(t("toast_review_started"));
          break;
        case "approve":
          toast.success(t("toast_approved"));
          break;
        case "decline":
          toast.success(t("toast_declined"));
          break;
        case "more_info":
          toast.success(t("toast_more_info_requested"));
          break;
      }
      setComment("");
      router.refresh();
    });
  }

  const actionsForStatus =
    status === "requested"
      ? (["review"] as Action[])
      : status === "in_review"
        ? (["approve", "decline", "more_info"] as Action[])
        : ([] as Action[]);

  if (actionsForStatus.length === 0) return null;

  return (
    <section className="rounded-[24px] border border-border bg-card p-6 md:p-8 space-y-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("actions_title")}
      </h2>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="review_comment">{t("comment_label")}</Label>
        <Textarea
          id="review_comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("comment_placeholder")}
          rows={4}
          maxLength={2000}
          className="rounded-[12px]"
        />
        {/* K-06 LOOP-1 F2 fix: replace 3 per-button helper paragraphs (which
            visually competed with the action buttons and blunted the
            primary-action signal) with a single quiet guidance line. */}
        {actionsForStatus.length > 1 && (
          <p className="text-[11px] text-muted-foreground keep-all leading-snug">
            {t("actions_summary")}
          </p>
        )}
      </div>

      {/* Action buttons — primary first, ghost (decline) last per visual weight */}
      <div className="flex flex-wrap gap-3 items-center">
        {actionsForStatus.includes("review") && (
          <ActionButton
            label={t("action_review")}
            disabled={isPending}
            isLoading={isPending && pendingAction === "review"}
            onClick={() => run("review")}
            variant="primary"
          />
        )}
        {actionsForStatus.includes("approve") && (
          <ActionButton
            label={t("action_approve")}
            disabled={isPending}
            isLoading={isPending && pendingAction === "approve"}
            onClick={() => run("approve")}
            variant="primary"
          />
        )}
        {actionsForStatus.includes("more_info") && (
          <ActionButton
            label={t("action_more_info")}
            disabled={isPending}
            isLoading={isPending && pendingAction === "more_info"}
            onClick={() => run("more_info")}
            variant="outline"
          />
        )}
        {actionsForStatus.includes("decline") && (
          <ActionButton
            label={t("action_decline")}
            disabled={isPending}
            isLoading={isPending && pendingAction === "decline"}
            onClick={() => run("decline")}
            variant="ghost"
          />
        )}
      </div>
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  isLoading,
  variant,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  variant: "primary" | "outline" | "ghost";
}) {
  const style =
    variant === "primary"
      ? { backgroundColor: "#71D083", color: "#000" }
      : undefined;
  const buttonVariant =
    variant === "primary" ? "default" : variant === "outline" ? "outline" : "ghost";
  return (
    <Button
      type="button"
      size="pill"
      variant={buttonVariant}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {isLoading ? "..." : label}
    </Button>
  );
}
