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
  // Phase 5 Wave A sub_3c Option A: brand helper copy (placeholder + Twin)
  const b = useTranslations("onboarding.brand");
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
        <h1 className="font-semibold tracking-display-ko text-3xl tracking-tight keep-all">{t("brand_title")}</h1>
        <p className="text-sm text-muted-foreground keep-all">{t("brand_sub")}</p>
      </div>
      {/* Phase 5 Wave A sub_3c Option A: brand logo placeholder — sage subtle empty state */}
      <div className="rounded-2xl border border-dashed border-[#71D083]/40 bg-[#71D083]/5 px-5 py-4">
        <p className="text-sm text-[#71D083] keep-all">{b("helper.placeholder")}</p>
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
          {/* Phase 5 Wave A sub_3c Option A: Twin-only carve-out helper sentence */}
          <p className="text-xs text-muted-foreground text-center keep-all mt-1">{b("helper.twin")}</p>
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
