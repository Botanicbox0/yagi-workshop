"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LinkIcon, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectDeliverableVersionAction } from "@/app/[locale]/app/projects/[id]/_actions/project-deliverables";

export type GuestDeliverable = {
  id: string;
  status: string;
  external_urls: string[];
  storage_paths: string[];
  note: string | null;
  version: number;
  created_at: string;
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function GuestDeliverablesPanel({
  projectId,
  initialDeliverables,
}: {
  projectId: string;
  initialDeliverables: GuestDeliverable[];
}) {
  const t = useTranslations("project_detail.guest.deliverables");
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const trimmedUrl = url.trim();
    if (!isHttpUrl(trimmedUrl)) {
      toast.error(t("error_url"));
      return;
    }
    setSubmitting(true);
    const result = await createProjectDeliverableVersionAction({
      projectId,
      externalUrls: [trimmedUrl],
      note: note.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(
        result.error === "unauthenticated" ? t("error_unauthenticated") : t("error_db"),
      );
      return;
    }
    setUrl("");
    setNote("");
    toast.success(t("submitted"));
    router.refresh();
  }

  return (
    <section className="rounded-card border border-border bg-card-deep p-5 space-y-4">
      <div className="flex items-center gap-2">
        <PackagePlus className="h-4 w-4 text-brand" aria-hidden="true" />
        <h2 className="text-base font-semibold ink-primary">{t("title")}</h2>
      </div>

      <div className="space-y-3">
        {initialDeliverables.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm ink-tertiary keep-all">
            {t("empty")}
          </p>
        ) : (
          initialDeliverables.map((deliverable) => (
            <article
              key={deliverable.id}
              className="rounded-card border border-border bg-background p-4 text-sm"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium ink-primary">
                  {t("version", { version: deliverable.version })}
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] ink-tertiary">
                  {deliverable.status}
                </span>
              </div>
              {deliverable.note && (
                <p className="mb-3 whitespace-pre-wrap ink-secondary keep-all">
                  {deliverable.note}
                </p>
              )}
              <div className="space-y-2">
                {deliverable.external_urls.map((item) => (
                  <a
                    key={item}
                    href={item}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3 py-1 text-xs ink-primary hover:border-brand hover:text-brand"
                  >
                    <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="truncate">{item}</span>
                  </a>
                ))}
                {deliverable.storage_paths.length > 0 && (
                  <p className="text-xs ink-tertiary">
                    {t("stored_files", { count: deliverable.storage_paths.length })}
                  </p>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="space-y-2">
          <Label htmlFor="guest-deliverable-url">{t("url_label")}</Label>
          <Input
            id="guest-deliverable-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guest-deliverable-note">{t("note_label")}</Label>
          <Textarea
            id="guest-deliverable-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("note_placeholder")}
            className="min-h-[84px] resize-none"
            maxLength={2000}
          />
        </div>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full gap-2 bg-brand text-brand-on hover:brightness-105"
        >
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </div>
    </section>
  );
}
