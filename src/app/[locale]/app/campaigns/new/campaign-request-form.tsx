"use client";

import { useEffect, useState, useTransition } from "react";
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
    | "desiredPrize"
    | "desiredRecruit"
    | "contactName"
    | "contactEmail"
    | "contactPhone"
    | "referenceNotes",
    string
  >
>;

export function CampaignRequestForm({
  variant = "brand",
}: {
  variant?: "brand" | "artist";
}) {
  const t = useTranslations("campaigns_app.new");
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setHydrated(true);
  }, []);

  function submit(formData: FormData) {
    setErrors({});
    const desiredPrizeRaw = String(formData.get("desiredPrize") ?? "").trim();
    const desiredRecruitRaw = String(formData.get("desiredRecruit") ?? "").trim();
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      brief: String(formData.get("brief") ?? ""),
      desiredPrize:
        desiredPrizeRaw.length > 0 ? Number(desiredPrizeRaw) : undefined,
      desiredRecruit:
        desiredRecruitRaw.length > 0 ? Number(desiredRecruitRaw) : undefined,
      contactName: String(formData.get("contactName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      referenceNotes: String(formData.get("referenceNotes") ?? ""),
    };

    const nextErrors: FieldErrors = {};
    if (payload.title.trim().length < 2) nextErrors.title = t("error_title");
    if (payload.brief.trim().length < 10) nextErrors.brief = t("error_brief");
    if (
      payload.desiredPrize !== undefined &&
      (!Number.isInteger(payload.desiredPrize) || payload.desiredPrize < 0)
    ) {
      nextErrors.desiredPrize = t("error_desired_prize");
    }
    if (
      payload.desiredRecruit !== undefined &&
      (!Number.isInteger(payload.desiredRecruit) || payload.desiredRecruit < 0)
    ) {
      nextErrors.desiredRecruit = t("error_desired_recruit");
    }
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
  const isArtist = variant === "artist";
  const copy = (key: string, artistKey: string) =>
    t(isArtist ? artistKey : key);

  return (
    <form action={submit} className="space-y-6" data-ready={hydrated}>
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
                placeholder={copy(
                  "field_title_placeholder",
                  "artist_field_title_placeholder",
                )}
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
                placeholder={copy(
                  "field_description_placeholder",
                  "artist_field_description_placeholder",
                )}
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
                placeholder={copy(
                  "field_brief_placeholder",
                  "artist_field_brief_placeholder",
                )}
                className="min-h-56 resize-y bg-surface-card"
                maxLength={5000}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                error={errors.desiredPrize}
                helper={t("field_desired_helper")}
                htmlFor="campaign-desired-prize"
                label={t("field_desired_prize")}
              >
                <Input
                  id="campaign-desired-prize"
                  name="desiredPrize"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder={t("field_desired_prize_placeholder")}
                  className="h-11 bg-surface-card"
                />
              </Field>
              <Field
                error={errors.desiredRecruit}
                helper={t("field_desired_helper")}
                htmlFor="campaign-desired-recruit"
                label={t("field_desired_recruit")}
              >
                <Input
                  id="campaign-desired-recruit"
                  name="desiredRecruit"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder={t("field_desired_recruit_placeholder")}
                  className="h-11 bg-surface-card"
                />
              </Field>
            </div>
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
                placeholder={copy(
                  "field_references_placeholder",
                  "artist_field_references_placeholder",
                )}
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
          disabled={!hydrated || isPending}
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
  helper,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  helper?: string;
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
      {helper && (
        <p className="text-xs leading-5 text-muted-foreground keep-all">
          {helper}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
