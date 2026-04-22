"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveMeetingSummary, sendMeetingSummary } from "@/app/[locale]/app/meetings/actions";

const MAX_CHARS = 20000;

type Props = {
  meetingId: string;
  initialSummary: string | null;
  summarySentAt: string | null;
  locale: string;
};

export function SummaryEditor({
  meetingId,
  initialSummary,
  summarySentAt,
  locale,
}: Props) {
  const t = useTranslations("meetings");

  const [value, setValue] = useState(initialSummary ?? "");
  const [lastSaved, setLastSaved] = useState(initialSummary ?? "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(summarySentAt);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(
    async (silent = false) => {
      if (saving) return;
      setSaving(true);
      try {
        const result = await saveMeetingSummary(meetingId, value);
        if (result.ok) {
          setLastSaved(value);
          if (!silent) toast.success(t("summary_saved"));
        } else {
          if (!silent)
            toast.error(t("summary_save_error"), {
              description: result.error,
            });
        }
      } finally {
        setSaving(false);
      }
    },
    [meetingId, value, saving, t]
  );

  const handleSend = useCallback(async () => {
    if (sending) return;

    // Auto-save if there are unsaved changes
    if (value !== lastSaved && value.length > 0) {
      const saveResult = await saveMeetingSummary(meetingId, value);
      if (saveResult.ok) {
        setLastSaved(value);
      } else {
        toast.error(t("summary_save_error"), {
          description: saveResult.error,
        });
        return;
      }
    }

    setSending(true);
    try {
      const result = await sendMeetingSummary(meetingId);
      if (result.ok) {
        const now = new Date().toISOString();
        setSentAt(now);
        toast.success(t("summary_send_success"));
      } else {
        toast.error(t("summary_send_error"), {
          description: result.error,
        });
      }
    } finally {
      setSending(false);
    }
  }, [meetingId, value, lastSaved, sending, t]);

  const handleBlur = useCallback(() => {
    // Autosave on blur if content changed and non-empty
    if (value !== lastSaved && value.length > 0) {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        handleSave(true);
      }, 300);
    }
  }, [value, lastSaved, handleSave]);

  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });

  return (
    <div id="summary" className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="summary-textarea" className="text-base font-semibold">
          {t("summary_title")}
        </Label>
        <span
          className={`text-xs tabular-nums ${
            value.length > MAX_CHARS * 0.9
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {value.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
      </div>

      <Textarea
        id="summary-textarea"
        placeholder={t("summary_ph")}
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= MAX_CHARS) {
            setValue(e.target.value);
          }
        }}
        onBlur={handleBlur}
        rows={12}
        className="font-mono text-sm resize-y"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => handleSave(false)}
          disabled={saving || value === lastSaved}
        >
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {t("summary_save")}
        </Button>

        <Button
          size="sm"
          className="rounded-full"
          onClick={handleSend}
          disabled={sending || !value.trim()}
        >
          {sending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {t("summary_send")}
        </Button>

        {sentAt && (
          <p className="text-xs text-muted-foreground">
            {t("summary_sent_at")}: {fmt.format(new Date(sentAt))}
          </p>
        )}
      </div>
    </div>
  );
}
