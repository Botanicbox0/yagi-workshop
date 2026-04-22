"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelMeeting } from "@/app/[locale]/app/meetings/actions";

type Props = {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelDialog({ meetingId, open, onOpenChange }: Props) {
  const t = useTranslations("meetings");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const reasonValid = reason.trim().length >= 3 && reason.trim().length <= 500;

  const handleConfirm = async () => {
    if (!reasonValid || pending) return;
    setPending(true);
    try {
      const result = await cancelMeeting(meetingId, reason.trim());
      if (result.ok) {
        toast.success(t("cancel_success"));
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(t("cancel_error"), {
          description: result.error,
        });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("cancel_confirm")}</DialogTitle>
          <DialogDescription>{t("cancel_dialog_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="cancel-reason">{t("cancel_reason_label")}</Label>
          <Textarea
            id="cancel-reason"
            placeholder={t("cancel_reason_ph")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={500}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {reason.length} / 500
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            className="rounded-full"
            onClick={handleConfirm}
            disabled={!reasonValid || pending}
          >
            {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {t("cancel_confirm_btn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
