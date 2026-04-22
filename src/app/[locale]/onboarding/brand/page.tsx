"use client";

import { useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrandAction } from "@/lib/onboarding/actions";

const slugFromName = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

const schema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$/),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingBrandPage() {
  const t = useTranslations("onboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const workspaceId = search.get("ws");

  const [showForm, setShowForm] = useState(false);
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

  async function onSubmit(values: FormValues) {
    if (!workspaceId) {
      toast.error("missing_workspace");
      return;
    }
    setSubmitting(true);
    const res = await createBrandAction({ workspaceId, name: values.name, slug: values.slug });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.push(`/${locale}/onboarding/invite?ws=${workspaceId}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all"><em>{t("brand_title")}</em></h1>
        <p className="text-sm text-muted-foreground keep-all">{t("brand_sub")}</p>
      </div>
      {!showForm ? (
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={() => setShowForm(true)}>
            {t("brand_name")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push(`/${locale}/onboarding/invite?ws=${workspaceId ?? ""}`)}
          >
            {c("skip")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">{t("brand_name")}</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder={t("brand_name_ph")}
              onBlur={() => setValue("slug", slugFromName(nameValue))}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t("workspace_slug")}</Label>
            <Input id="slug" value={slugValue} onChange={(e) => setValue("slug", e.target.value)} />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "..." : c("continue")}
          </Button>
        </form>
      )}
    </div>
  );
}
