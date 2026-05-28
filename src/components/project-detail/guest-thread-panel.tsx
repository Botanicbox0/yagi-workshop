"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MessageSquare, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/app/[locale]/app/projects/[id]/thread-actions";
import { cn } from "@/lib/utils";

export type GuestThreadMessage = {
  id: string;
  author_id: string;
  body: string | null;
  created_at: string;
  author_name: string | null;
  is_mine: boolean;
};

export function GuestThreadPanel({
  projectId,
  messages,
}: {
  projectId: string;
  messages: GuestThreadMessage[];
}) {
  const t = useTranslations("project_detail.guest.thread");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const result = await sendMessage({
      projectId,
      body: trimmed,
      visibility: "shared",
    });
    setSubmitting(false);
    if (result && "error" in result) {
      toast.error(t(`error_${result.error}` as "error_db"));
      return;
    }
    setBody("");
    toast.success(t("sent"));
    router.refresh();
  }

  return (
    <section className="rounded-card border border-border bg-card-deep p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-brand" aria-hidden="true" />
        <h2 className="text-base font-semibold ink-primary">{t("title")}</h2>
      </div>

      <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm ink-tertiary keep-all">
            {t("empty")}
          </p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "flex",
                message.is_mine ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[82%] rounded-card border px-4 py-3 text-sm leading-body",
                  message.is_mine
                    ? "border-brand bg-brand text-brand-on"
                    : "border-border bg-background ink-primary"
                )}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] ink-tertiary">
                  <span>{message.author_name ?? t("unknown_author")}</span>
                  <span>
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(message.created_at))}
                  </span>
                </div>
                <p className="whitespace-pre-wrap keep-all">{message.body}</p>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("placeholder")}
          className="min-h-[92px] resize-none"
          maxLength={10000}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting || body.trim().length === 0}
            className="gap-2 bg-brand text-brand-on hover:brightness-105"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
            {submitting ? t("sending") : t("send")}
          </Button>
        </div>
      </div>
    </section>
  );
}
