"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { MoreHorizontal, Copy, Edit2, Send, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  markMeetingCompleted,
  retryCalendarSync,
  sendMeetingSummary,
} from "@/app/[locale]/app/meetings/actions";
import { CancelDialog } from "@/components/meetings/cancel-dialog";

type Meeting = {
  id: string;
  status: string;
  meet_link: string | null;
  calendar_sync_status: string;
  summary_md: string | null;
  summary_sent_at: string | null;
};

type Props = {
  meeting: Meeting;
};

export function MeetingActionsMenu({ meeting }: Props) {
  const t = useTranslations("meetings");
  const router = useRouter();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const isCompleted = meeting.status === "completed";
  const isCancelled = meeting.status === "cancelled";
  const canComplete =
    meeting.status === "scheduled" || meeting.status === "in_progress";
  const canCancel = !isCancelled && !isCompleted;
  const canRetry =
    meeting.calendar_sync_status === "failed" ||
    meeting.calendar_sync_status === "fallback_ics";
  const hasSummary = !!meeting.summary_md?.trim();
  const summaryNotSent = !meeting.summary_sent_at;

  const handleCopyMeetLink = async () => {
    if (!meeting.meet_link) {
      toast.error(t("meet_link_missing"));
      return;
    }
    try {
      await navigator.clipboard.writeText(meeting.meet_link);
      toast.success(t("meet_link_copied"));
    } catch {
      toast.error(t("copy_failed"));
    }
  };

  const handleScrollToSummary = () => {
    const el = document.getElementById("summary");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const textarea = el.querySelector("textarea");
      if (textarea) {
        setTimeout(() => textarea.focus(), 400);
      }
    }
  };

  const handleSendSummary = async () => {
    if (busy) return;
    setBusy("send");
    try {
      const result = await sendMeetingSummary(meeting.id);
      if (result.ok) {
        toast.success(t("summary_send_success"));
        router.refresh();
      } else {
        toast.error(t("summary_send_error"), { description: result.error });
      }
    } finally {
      setBusy(null);
    }
  };

  const handleMarkCompleted = async () => {
    if (busy) return;
    setBusy("complete");
    try {
      const result = await markMeetingCompleted(meeting.id);
      if (result.ok) {
        toast.success(t("mark_completed_success"));
        router.refresh();
      } else {
        toast.error(t("mark_completed_error"), { description: result.error });
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRetrySync = async () => {
    if (busy) return;
    setBusy("retry");
    try {
      const result = await retryCalendarSync(meeting.id);
      if (result.ok) {
        toast.success(t("sync_retry_success", { status: result.syncStatus }));
        router.refresh();
      } else {
        toast.error(t("sync_retry_error"), { description: result.error });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9"
            aria-label={t("actions_menu_label")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {/* Copy meet link */}
          {meeting.meet_link && (
            <DropdownMenuItem onClick={handleCopyMeetLink}>
              <Copy className="mr-2 h-4 w-4" />
              {t("copy_meet_link")}
            </DropdownMenuItem>
          )}

          {/* Edit summary — scroll to textarea */}
          <DropdownMenuItem onClick={handleScrollToSummary}>
            <Edit2 className="mr-2 h-4 w-4" />
            {t("edit_summary")}
          </DropdownMenuItem>

          {/* Send summary */}
          {hasSummary && summaryNotSent && (
            <DropdownMenuItem
              onClick={handleSendSummary}
              disabled={busy === "send"}
            >
              <Send className="mr-2 h-4 w-4" />
              {t("summary_send")}
            </DropdownMenuItem>
          )}

          {(meeting.meet_link || hasSummary) && (canComplete || canRetry || canCancel) && (
            <DropdownMenuSeparator />
          )}

          {/* Mark completed */}
          {canComplete && (
            <DropdownMenuItem
              onClick={handleMarkCompleted}
              disabled={busy === "complete"}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {t("mark_completed")}
            </DropdownMenuItem>
          )}

          {/* Retry sync */}
          {canRetry && (
            <DropdownMenuItem
              onClick={handleRetrySync}
              disabled={busy === "retry"}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("sync_retry")}
            </DropdownMenuItem>
          )}

          {/* Cancel meeting */}
          {canCancel && (
            <>
              {(canComplete || canRetry) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setCancelOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("cancel_meeting")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelDialog
        meetingId={meeting.id}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
    </>
  );
}
