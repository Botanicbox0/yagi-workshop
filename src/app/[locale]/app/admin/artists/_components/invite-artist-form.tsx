"use client";

// Phase 6 Wave A.3 — Invite Artist inline form
// Calls inviteArtistAction on submit; shows Sonner toast on result.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inviteArtistAction } from "../_actions/invite-artist";

const schema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  shortBio: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface InviteArtistFormProps {
  onSuccess?: () => void;
}

export function InviteArtistForm({ onSuccess }: InviteArtistFormProps) {
  const t = useTranslations("admin_artists");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", displayName: "", shortBio: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await inviteArtistAction(values);
    setSubmitting(false);

    if (result.ok) {
      toast.success(t("invite_success"));
      reset();
      onSuccess?.();
    } else {
      const msgMap: Record<string, string> = {
        validation: t("invite_error_validation"),
        unauthenticated: t("invite_error_unauthenticated"),
        forbidden: t("invite_error_forbidden"),
        invite_failed: t("invite_error_invite_failed"),
        db: t("invite_error_db"),
      };
      toast.error(msgMap[result.error] ?? result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="invite-email">{t("form_email")}</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="artist@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-name">{t("form_display_name")}</Label>
        <Input
          id="invite-name"
          placeholder={t("form_display_name_ph")}
          {...register("displayName")}
        />
        {errors.displayName && (
          <p className="text-xs text-destructive">{errors.displayName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-bio">
          {t("form_short_bio")}{" "}
          <span className="text-muted-foreground text-xs">({t("optional")})</span>
        </Label>
        <Textarea
          id="invite-bio"
          placeholder={t("form_short_bio_ph")}
          rows={3}
          {...register("shortBio")}
        />
        {errors.shortBio && (
          <p className="text-xs text-destructive">{errors.shortBio.message}</p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="rounded-full px-6">
        {submitting ? "..." : t("form_submit")}
      </Button>
    </form>
  );
}
