"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspaceAction } from "@/lib/onboarding/actions";

// Phase 4.x Wave C.5b sub_03 — auto-derive a slug-safe URL from the
// workspace name. Pure Roman names produce a kebab-case slug; non-ASCII
// names (Korean etc.) collapse to empty, which is the trigger for the
// `workspace_slug_korean_warning` nudge below.
const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

const schema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/, "3-50 lowercase, hyphens"),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingWorkspacePage() {
  const t = useTranslations("onboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;

  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", slug: "" } });

  const nameValue = watch("name");
  const slugValue = watch("slug");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setValue("slug", slugFromName(nameValue));
    }
  }, [nameValue, slugTouched, setValue]);

  // Non-ASCII name (Korean etc.) collapses to an empty slug. Surface a
  // one-line nudge so the user knows to type one manually instead of
  // staring at an empty field.
  const showKoreanWarning =
    !slugTouched &&
    nameValue.trim().length > 0 &&
    slugFromName(nameValue).length === 0;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await createWorkspaceAction({ name: values.name, slug: values.slug });
    setSubmitting(false);
    if (res.error || !res.workspaceId) {
      toast.error(res.error ?? "workspace_failed");
      return;
    }
    router.push(`/${locale}/onboarding/brand?ws=${res.workspaceId}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">{t("workspace_title")}</h1>
        <p className="text-sm text-muted-foreground keep-all">{t("workspace_sub")}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">{t("workspace_name")}</Label>
          <Input id="name" {...register("name")} placeholder={t("workspace_name_ph")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">{t("workspace_slug")}</Label>
          <Input
            id="slug"
            value={slugValue}
            placeholder={t("workspace_slug_ph")}
            onChange={(e) => {
              setSlugTouched(true);
              setValue("slug", e.target.value);
            }}
          />
          <p className="text-xs text-muted-foreground">
            {t("workspace_slug_help")}
            <span className="text-foreground">{slugValue}</span>
          </p>
          {showKoreanWarning && (
            <p className="text-xs accent-sage keep-all">
              {t("workspace_slug_korean_warning")}
            </p>
          )}
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "..." : c("continue")}
        </Button>
      </form>
    </div>
  );
}
