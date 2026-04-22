"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Archive, ArchiveRestore } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  archiveChannel,
  unarchiveChannel,
  updateChannel,
} from "@/app/[locale]/app/team/[slug]/actions";
import type { Channel } from "@/lib/team-channels/queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
};

export function EditChannelDialog({ open, onOpenChange, channel }: Props) {
  const t = useTranslations("team_chat");
  const router = useRouter();

  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic ?? "");
  const [saving, startSaveTransition] = useTransition();
  const [archivePending, startArchiveTransition] = useTransition();
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  // Reset form state when channel or open-state changes.
  useEffect(() => {
    if (open) {
      setName(channel.name);
      setTopic(channel.topic ?? "");
    }
  }, [open, channel.name, channel.topic]);

  const nameValid = name.trim().length > 0 && name.trim().length <= 50;
  const topicValid = topic.length <= 200;
  const canSubmit = nameValid && topicValid && !saving;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    startSaveTransition(async () => {
      const res = await updateChannel({
        channelId: channel.id,
        name: name.trim(),
        topic: topic.trim() || null,
      });
      if (!res.ok) {
        toast.error(t("edit_channel_save_failed"));
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  };

  const doArchiveToggle = () => {
    startArchiveTransition(async () => {
      const fn = channel.is_archived ? unarchiveChannel : archiveChannel;
      const res = await fn({ channelId: channel.id });
      if (!res.ok) {
        toast.error(t("edit_channel_save_failed"));
        return;
      }
      if (channel.is_archived) {
        toast.success(t("success_channel_created")); // generic positive — no dedicated unarchive key
      } else {
        toast.success(t("success_channel_archived"));
      }
      setConfirmArchiveOpen(false);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("edit_channel_title")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-name">{t("new_channel_name_label")}</Label>
              <Input
                id="ec-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                required
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-topic">{t("new_channel_topic_label")}</Label>
              <Textarea
                id="ec-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("new_channel_topic_placeholder")}
                maxLength={200}
                rows={2}
                className="resize-none"
              />
              {!topicValid && (
                <p className="text-[11px] text-destructive keep-all">
                  {t("edit_channel_topic_too_long")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmArchiveOpen(true)}
                disabled={archivePending}
                className="justify-start"
              >
                {channel.is_archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    {t("unarchive_channel")}
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    {t("archive_channel")}
                  </>
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t("new_channel_cancel")}
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t("edit_channel_save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmArchiveOpen}
        onOpenChange={setConfirmArchiveOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="keep-all">
              {channel.is_archived
                ? t("unarchive_channel_confirm_title")
                : t("archive_channel_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="keep-all">
              {channel.is_archived
                ? t("unarchive_channel_confirm_body")
                : t("archive_channel_confirm_body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archivePending}>
              {t("new_channel_cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doArchiveToggle();
              }}
              disabled={archivePending}
            >
              {archivePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : channel.is_archived ? (
                t("unarchive_channel_confirm_action")
              ) : (
                t("archive_channel_confirm_action")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
