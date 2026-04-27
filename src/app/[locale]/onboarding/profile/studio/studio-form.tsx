"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeProfileAction } from "../actions";
import {
  HANDLE_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
} from "@/lib/handles/validate";

const MEMBER_COUNTS = ["1-5", "6-10", "11+"] as const;

const schema = z.object({
  handle: z
    .string()
    .min(HANDLE_MIN_LENGTH)
    .max(HANDLE_MAX_LENGTH)
    .regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(80),
  studioName: z.string().min(1).max(80),
  contactEmail: z.string().email(),
  memberCount: z.enum(MEMBER_COUNTS),
  instagram: z.string().max(30).optional(),
  skipInstagram: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function StudioForm({
  defaultContactEmail,
}: {
  defaultContactEmail: string;
}) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = (params.locale === "en" ? "en" : "ko") as "ko" | "en";

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactEmail: defaultContactEmail,
      memberCount: "1-5",
      skipInstagram: false,
    },
  });

  const skipIg = watch("skipInstagram") ?? false;
  const handleLive = watch("handle") ?? "";
  const memberCount = watch("memberCount");
  const urlPreview = useMemo(
    () => `${t("handle_url_prefix")}${handleLive || "..."}`,
    [handleLive, t]
  );

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const res = await completeProfileAction({
      role: "studio",
      handle: values.handle,
      instagram_handle: values.skipInstagram
        ? null
        : values.instagram?.trim() || null,
      display_name: values.displayName,
      studio_name: values.studioName,
      contact_email: values.contactEmail,
      member_count: values.memberCount,
      locale,
    });
    setSubmitting(false);

    if (!res.ok) {
      setServerError(res.error);
      const msg = errorToMessage(res.error, t);
      toast.error(msg);
      return;
    }
    router.push(`/${locale}${res.redirect}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          {t("profile_v2_studio_title")}
        </h1>
        <p
          className="text-sm text-muted-foreground keep-all"
          dangerouslySetInnerHTML={{ __html: t("profile_v2_sub") }}
        />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="handle">{t("handle_label")}</Label>
          <Input
            id="handle"
            {...register("handle")}
            placeholder={t("handle_placeholder")}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">{urlPreview}</p>
          <p className="text-xs text-muted-foreground">{t("handle_help_v2")}</p>
          {errors.handle && (
            <p className="text-xs text-destructive">
              {t("handle_err_INVALID_CHARS")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="studioName">{t("studio_name_label")}</Label>
          <Input
            id="studioName"
            {...register("studioName")}
            placeholder={t("studio_name_placeholder")}
          />
          {errors.studioName && (
            <p className="text-xs text-destructive">{errors.studioName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">{t("display_name_label")}</Label>
          <Input
            id="displayName"
            {...register("displayName")}
            placeholder={t("display_name_placeholder")}
          />
          <p className="text-xs text-muted-foreground">
            {t("display_name_help")}
          </p>
          {errors.displayName && (
            <p className="text-xs text-destructive">{errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">{t("contact_email_label")}</Label>
          <Input
            id="contactEmail"
            type="email"
            {...register("contactEmail")}
            placeholder={t("contact_email_placeholder")}
          />
          {errors.contactEmail && (
            <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="memberCount">{t("member_count_label")}</Label>
          <Select
            value={memberCount}
            onValueChange={(v) =>
              setValue("memberCount", v as (typeof MEMBER_COUNTS)[number], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger id="memberCount">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-5">{t("member_count_1_5")}</SelectItem>
              <SelectItem value="6-10">{t("member_count_6_10")}</SelectItem>
              <SelectItem value="11+">{t("member_count_11_plus")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram">{t("instagram_label")}</Label>
          <Input
            id="instagram"
            {...register("instagram")}
            placeholder={t("instagram_placeholder")}
            autoCapitalize="none"
            spellCheck={false}
            disabled={skipIg}
          />
          <p className="text-xs text-muted-foreground">{t("instagram_help")}</p>
          <label className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Checkbox
              id="skipInstagram"
              checked={skipIg}
              onCheckedChange={(c) =>
                setValue("skipInstagram", c === true, { shouldDirty: true })
              }
            />
            <span>{t("instagram_skip")}</span>
          </label>
        </div>

        {serverError && (
          <p className="text-xs text-destructive">
            {errorToMessage(serverError, t)}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? t("saving") : t("continue")}
        </Button>
      </form>
    </div>
  );
}

function errorToMessage(
  code: string,
  t: (k: string) => string
): string {
  const [scope, kind] = code.split(":");
  if (scope === "handle") return t(`handle_err_${kind}` as "handle_err_TAKEN");
  if (scope === "instagram")
    return t(`instagram_err_${kind}` as "instagram_err_EMPTY");
  return t("error_generic");
}
