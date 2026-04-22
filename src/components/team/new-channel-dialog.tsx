"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createChannel } from "@/app/[locale]/app/team/[slug]/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/** Transform free-form text into a slug candidate (not authoritative). */
function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function NewChannelDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("team_chat");
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [topic, setTopic] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset state every time the dialog opens.
  useEffect(() => {
    if (open) {
      setName("");
      setSlug("");
      setTopic("");
      setSlugTouched(false);
      // Autofocus on next tick.
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [open]);

  // Auto-derive slug from name unless user has edited slug directly.
  useEffect(() => {
    if (!slugTouched) setSlug(suggestSlug(name));
  }, [name, slugTouched]);

  const slugValid = useMemo(() => SLUG_REGEX.test(slug), [slug]);
  const nameValid = name.trim().length > 0 && name.trim().length <= 50;
  const topicValid = topic.length <= 200;

  const canSubmit = nameValid && slugValid && topicValid && !pending;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const res = await createChannel({
        name: name.trim(),
        slug: slug.trim(),
        topic: topic.trim() || null,
      });
      if (!res.ok) {
        if (res.error === "name_taken") {
          toast.error(t("new_channel_name_taken"));
        } else if (res.error === "validation") {
          toast.error(t("new_channel_slug_invalid"));
        } else if (res.error === "forbidden" || res.error === "auth_required") {
          toast.error(t("error_send_failed"));
        } else {
          toast.error(t("error_send_failed"));
        }
        return;
      }
      toast.success(t("success_channel_created"));
      onOpenChange(false);
      router.push(
        `/app/team/${res.channel.slug}` as `/app/team/${string}`
      );
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("new_channel_title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nc-name">{t("new_channel_name_label")}</Label>
            <Input
              id="nc-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("new_channel_name_placeholder")}
              maxLength={50}
              required
              autoComplete="off"
            />
            {!nameValid && name.length > 0 && (
              <p className="text-[11px] text-destructive keep-all">
                {t("new_channel_name_required")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nc-slug">{t("new_channel_slug_label")}</Label>
            <Input
              id="nc-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder={t("new_channel_slug_placeholder")}
              maxLength={50}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-sm"
            />
            <p
              className={
                !slugValid && slug.length > 0
                  ? "text-[11px] text-destructive keep-all"
                  : "text-[11px] text-muted-foreground keep-all"
              }
            >
              {!slugValid && slug.length > 0
                ? t("new_channel_slug_invalid")
                : t("new_channel_slug_hint")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nc-topic">{t("new_channel_topic_label")}</Label>
            <Textarea
              id="nc-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t("new_channel_topic_placeholder")}
              maxLength={200}
              rows={2}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {t("new_channel_cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                t("new_channel_create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
