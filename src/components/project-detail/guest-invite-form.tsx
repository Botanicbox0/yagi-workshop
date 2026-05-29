"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendGuestInvitation } from "@/app/[locale]/app/projects/[id]/_actions/send-guest-invitation";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function GuestInviteForm({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const t = useTranslations("project_detail.guest.invite");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!isEmail(trimmed)) {
      toast.error(t("error_validation"));
      return;
    }
    setSubmitting(true);
    const result = await sendGuestInvitation({
      workspaceId,
      projectId,
      email: trimmed,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(t(`error_${result.error}` as Parameters<typeof t>[0]));
      return;
    }
    setEmail("");
    setInviteUrl(result.inviteUrl);
    toast.success(t("success"));
    router.refresh();
  }

  async function onCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copy_failed"));
    }
  }

  return (
    <div className="w-full rounded-lg border border-border/70 bg-surface-card p-4 md:max-w-xl">
      <div className="mb-3 flex items-center gap-2">
        <MailPlus className="h-4 w-4 text-brand" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("placeholder")}
          autoComplete="email"
        />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="gap-2 bg-brand text-brand-on hover:brightness-105"
        >
          <MailPlus className="h-4 w-4" aria-hidden="true" />
          {submitting ? t("sending") : t("send")}
        </Button>
      </div>
      {inviteUrl && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border/70 bg-background p-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {inviteUrl}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="gap-2"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {t("copy")}
          </Button>
        </div>
      )}
    </div>
  );
}
