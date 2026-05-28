"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { createCampaignRequest } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FieldErrors = Partial<
  Record<
    | "title"
    | "description"
    | "brief"
    | "contactName"
    | "contactEmail"
    | "contactPhone"
    | "referenceNotes",
    string
  >
>;

export function CampaignRequestForm() {
  const t = useTranslations("campaigns_app.new");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(formData: FormData) {
    setErrors({});
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      brief: String(formData.get("brief") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      referenceNotes: String(formData.get("referenceNotes") ?? ""),
    };

    const nextErrors: FieldErrors = {};
    if (payload.title.trim().length < 2) nextErrors.title = t("error_title");
    if (payload.brief.trim().length < 10) nextErrors.brief = t("error_brief");
    if (payload.contactName.trim().length < 1) {
      nextErrors.contactName = t("error_contact_name");
    }
    if (!payload.contactEmail.includes("@")) {
      nextErrors.contactEmail = t("error_contact_email");
    }
    if (payload.contactPhone.trim().length < 6) {
      nextErrors.contactPhone = t("error_contact_phone");
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    startTransition(async () => {
      const result = await createCampaignRequest(payload);
      if (!result.ok) {
        toast.error(t(`server_error.${result.error}`));
        return;
      }
      toast.success(t("success"));
      router.push("/app/campaigns");
    });
  }

  return (
    <form action={submit} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
          <div className="space-y-5">
            <Field
              error={errors.title}
              htmlFor="campaign-title"
              label={t("field_title")}
            >
              <Input
                id="campaign-title"
                name="title"
                placeholder={t("field_title_placeholder")}
                className="h-11 bg-surface-card"
                maxLength={120}
              />
            </Field>
            <Field
              error={errors.description}
              htmlFor="campaign-description"
              label={t("field_description")}
            >
              <Textarea
                id="campaign-description"
                name="description"
                placeholder={t("field_description_placeholder")}
                className="min-h-24 resize-none bg-surface-card"
                maxLength={600}
              />
            </Field>
            <Field
              error={errors.brief}
              htmlFor="campaign-brief"
              label={t("field_brief")}
            >
              <Textarea
                id="campaign-brief"
                name="brief"
                placeholder={t("field_brief_placeholder")}
                className="min-h-56 resize-y bg-surface-card"
                maxLength={5000}
              />
            </Field>
          </div>
        </div>

        <aside className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
          <div className="space-y-5">
            <Field
              error={errors.contactName}
              htmlFor="campaign-contact-name"
              label={t("field_contact_name")}
            >
              <Input
                id="campaign-contact-name"
                name="contactName"
                placeholder={t("field_contact_name_placeholder")}
                className="h-11 bg-surface-card"
                maxLength={80}
              />
            </Field>
            <Field
              error={errors.contactEmail}
              htmlFor="campaign-contact-email"
              label={t("field_contact_email")}
            >
              <Input
                id="campaign-contact-email"
                name="contactEmail"
                type="email"
                placeholder={t("field_contact_email_placeholder")}
                className="h-11 bg-surface-card"
                maxLength={254}
              />
            </Field>
            <Field
              error={errors.contactPhone}
              htmlFor="campaign-contact-phone"
              label={t("field_contact_phone")}
            >
              <Input
                id="campaign-contact-phone"
                name="contactPhone"
                placeholder={t("field_contact_phone_placeholder")}
                className="h-11 bg-surface-card"
                maxLength={40}
              />
            </Field>
            <Field
              error={errors.referenceNotes}
              htmlFor="campaign-reference-notes"
              label={t("field_references")}
            >
              <Textarea
                id="campaign-reference-notes"
                name="referenceNotes"
                placeholder={t("field_references_placeholder")}
                className="min-h-32 resize-none bg-surface-card"
                maxLength={2000}
              />
            </Field>
          </div>
        </aside>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full text-muted-foreground"
          onClick={() => router.push("/app/campaigns")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("back")}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-brand px-6 text-brand-on hover:bg-brand/90"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-label text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
