"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeProfileAction } from "../actions";

const COMPANY_TYPES = [
  "label",
  "agency",
  "studio",
  "independent",
  "other",
] as const;

const schema = z.object({
  company_name: z.string().min(1).max(120),
  company_type: z.enum(COMPANY_TYPES),
  contact_name: z.string().min(1).max(60),
  contact_email: z.string().email().max(254),
  contact_phone: z.string().max(40).optional(),
  website_url: z
    .string()
    .max(500)
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      { message: "url:FORMAT" },
    ),
  instagram_handle: z.string().max(60).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingClientPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = (params.locale === "en" ? "en" : "ko") as "ko" | "en";

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_type: "label" },
  });

  const companyType = watch("company_type");

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const res = await completeProfileAction({
      role: "client",
      locale,
      company_name: values.company_name,
      company_type: values.company_type,
      contact_name: values.contact_name,
      contact_email: values.contact_email,
      contact_phone: values.contact_phone?.trim() || null,
      website_url: values.website_url?.trim() || null,
      instagram_handle: values.instagram_handle?.trim() || null,
    });
    setSubmitting(false);

    if (!res.ok) {
      setServerError(res.error);
      toast.error(t("error_generic"));
      return;
    }
    router.push(`/${locale}${res.redirect}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          <em>{t("profile_v2_client_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground keep-all">
          {t("profile_v2_client_sub")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="company_name">{t("client_company_name_label")}</Label>
          <Input
            id="company_name"
            {...register("company_name")}
            placeholder={t("client_company_name_ph")}
          />
          {errors.company_name && (
            <p className="text-xs text-destructive">
              {errors.company_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_type">{t("client_company_type_label")}</Label>
          <Select
            value={companyType}
            onValueChange={(v) =>
              setValue("company_type", v as FormValues["company_type"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger id="company_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPES.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {t(`client_company_type_opt_${opt}` as "client_company_type_opt_label")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contact section — grouped under a section header so the three
            related fields (name, email, phone) read as one mental unit. */}
        <fieldset className="space-y-4 rounded-lg border border-border/50 bg-muted/20 p-4">
          <legend className="px-2 text-sm font-medium text-foreground">
            {t("client_contact_section_label")}
          </legend>

          <div className="space-y-2">
            <Label htmlFor="contact_name">{t("client_contact_name_label")}</Label>
            <Input
              id="contact_name"
              {...register("contact_name")}
              placeholder={t("client_contact_name_ph")}
              autoComplete="name"
            />
            {errors.contact_name && (
              <p className="text-xs text-destructive">
                {errors.contact_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">
              {t("client_contact_email_label")}
            </Label>
            <Input
              id="contact_email"
              type="email"
              {...register("contact_email")}
              placeholder={t("client_contact_email_ph")}
              autoComplete="email"
            />
            {errors.contact_email && (
              <p className="text-xs text-destructive">
                {errors.contact_email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">
              {t("client_contact_phone_label")}{" "}
              <span className="text-xs text-muted-foreground">
                ({t("optional_label")})
              </span>
            </Label>
            <Input
              id="contact_phone"
              {...register("contact_phone")}
              placeholder={t("client_contact_phone_ph")}
              autoComplete="tel"
            />
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="website_url">
            {t("client_website_label")}{" "}
            <span className="text-xs text-muted-foreground">
              ({t("optional_label")})
            </span>
          </Label>
          <Input
            id="website_url"
            type="url"
            {...register("website_url")}
            placeholder="https://"
          />
          {errors.website_url && (
            <p className="text-xs text-destructive">
              {t("client_website_err_format")}
            </p>
          )}
        </div>

        {serverError && (
          <p className="text-xs text-destructive">{serverError}</p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? t("saving") : t("next_step")}
        </Button>
      </form>
    </div>
  );
}
