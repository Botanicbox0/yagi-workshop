"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestMeetingAction } from "@/app/[locale]/app/meetings/request-actions";

// Phase 2.8.6 Task A.5/A.6 — meeting request card + modal.
//
// Permanently mounted under /app/projects so clients can request a
// pre-project intro meeting at any time (yagi: "첫 프로젝트 진행
// 이후에도 남아있으면 좋을듯"). Modal collects 1-3 proposed times +
// agenda + duration. Submit → requestMeetingAction → row inserted with
// status='requested'; admins see the request in /app/admin/meetings.

const MIN_AGENDA = 20;
const MAX_AGENDA = 2000;
const TWENTY_FOUR_HOURS_MS = 24 * 3600 * 1000;

type Props = {
  workspaceId: string | null;
};

export function MeetingRequestCard({ workspaceId }: Props) {
  const t = useTranslations("meetings");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <section className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-medium keep-all">
            {t("request_card_title")}
          </h3>
          <p className="text-sm text-muted-foreground keep-all">
            {t("request_card_sub")}
          </p>
        </div>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            disabled={!workspaceId}
            className="rounded-full uppercase tracking-[0.1em] text-xs sm:flex-shrink-0"
          >
            {t("request_card_cta")}
          </Button>
        </DialogTrigger>
      </section>

      <DialogContent className="sm:max-w-lg">
        {workspaceId ? (
          <RequestForm workspaceId={workspaceId} onClose={() => setOpen(false)} />
        ) : (
          <div className="space-y-2">
            <DialogTitle>{t("request_modal_no_workspace_title")}</DialogTitle>
            <DialogDescription>
              {t("request_modal_no_workspace_body")}
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RequestForm({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(t("request_default_title"));
  const [agenda, setAgenda] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<30 | 60 | 90>(30);
  const [slots, setSlots] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);

  function setSlot(i: number, value: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  }
  function addSlot() {
    if (slots.length < 3) setSlots((prev) => [...prev, ""]);
  }
  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onSubmit() {
    setError(null);
    const filled = slots.map((s) => s.trim()).filter(Boolean);
    if (filled.length === 0) {
      setError(t("request_err_no_slot"));
      return;
    }
    if (agenda.trim().length < MIN_AGENDA) {
      setError(t("request_err_agenda_too_short"));
      return;
    }
    // Local time strings from <input type="datetime-local"> have no
    // timezone — interpret as the browser's local zone, then send ISO.
    const isoOptions: string[] = [];
    for (const s of filled) {
      const ts = new Date(s).getTime();
      if (Number.isNaN(ts)) {
        setError(t("request_err_invalid_slot"));
        return;
      }
      if (ts < Date.now() + TWENTY_FOUR_HOURS_MS) {
        setError(t("request_err_slot_too_soon"));
        return;
      }
      isoOptions.push(new Date(ts).toISOString());
    }

    startTransition(async () => {
      const res = await requestMeetingAction({
        workspaceId,
        title: title.trim(),
        agenda: agenda.trim(),
        durationMinutes,
        requestedAtOptions: isoOptions,
      });
      if (!res.ok) {
        toast.error(t("request_submit_error"));
        setError(res.error);
        return;
      }
      toast.success(t("request_submit_success"));
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t("request_modal_title")}</DialogTitle>
        <DialogDescription className="keep-all">
          {t("request_modal_sub")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="title">{t("request_field_title")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agenda">{t("request_field_agenda")}</Label>
        <Textarea
          id="agenda"
          rows={4}
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          maxLength={MAX_AGENDA}
          placeholder={t("request_field_agenda_ph")}
        />
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {agenda.length} / {MAX_AGENDA}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t("request_field_duration")}</Label>
        <Select
          value={String(durationMinutes)}
          onValueChange={(v) => setDurationMinutes(Number(v) as 30 | 60 | 90)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 min</SelectItem>
            <SelectItem value="60">60 min</SelectItem>
            <SelectItem value="90">90 min</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("request_field_slots")}</Label>
        <p className="text-xs text-muted-foreground keep-all">
          {t("request_field_slots_hint")}
        </p>
        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={s}
                onChange={(e) => setSlot(i, e.target.value)}
                className="flex-1"
              />
              {slots.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSlot(i)}
                  aria-label={t("request_slot_remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {slots.length < 3 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addSlot}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {t("request_slot_add")}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("request_cancel")}
        </Button>
        <Button type="button" onClick={onSubmit} disabled={pending}>
          {pending ? t("request_submitting") : t("request_submit")}
        </Button>
      </DialogFooter>
    </div>
  );
}
