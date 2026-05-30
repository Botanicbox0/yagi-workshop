"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Check, MessageSquare, X } from "lucide-react";
import { transitionDealAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  dealId: string;
  status: string;
};

export function DealActionPanel({ dealId, status }: Props) {
  const t = useTranslations("deals.actions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(toStatus: "accepted" | "negotiating" | "declined") {
    setError(null);
    startTransition(async () => {
      const result = await transitionDealAction({
        dealId,
        toStatus,
        comment,
      });

      if (!result.ok) {
        setError(t(`server_error.${result.error}`));
        return;
      }

      toast.success(t(`success.${toStatus}`));
      router.refresh();
    });
  }

  if (status !== "offered" && status !== "negotiating") {
    return null;
  }

  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-foreground keep-all">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
          {status === "offered" ? t("description_offered") : t("description_negotiating")}
        </p>
      </div>

      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t("comment_placeholder")}
        maxLength={1000}
        className="min-h-24 resize-y bg-surface-card"
      />

      {error && (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive keep-all">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {status === "offered" && (
          <>
            <Button
              type="button"
              disabled={isPending}
              variant="outline"
              className="rounded-full"
              onClick={() => submit("negotiating")}
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {isPending ? t("submitting") : t("negotiate")}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              variant="outline"
              className="rounded-full"
              onClick={() => submit("declined")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              {t("decline")}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              className="rounded-full bg-brand text-brand-on hover:bg-brand/90"
              onClick={() => submit("accepted")}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {t("accept")}
            </Button>
          </>
        )}
        {status === "negotiating" && (
          <Button
            type="button"
            disabled={isPending}
            variant="outline"
            className="rounded-full"
            onClick={() => submit("declined")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {isPending ? t("submitting") : t("decline")}
          </Button>
        )}
      </div>
    </section>
  );
}
