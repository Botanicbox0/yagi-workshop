"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProfileAction } from "@/lib/onboarding/actions";

const schema = z.object({
  handle: z.string().regex(/^[a-z0-9_-]{3,30}$/, "3–30 lowercase letters, numbers, - _"),
  displayName: z.string().min(1).max(80),
  bio: z.string().max(280).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingProfilePage() {
  const t = useTranslations("onboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ locale: string }>();
  const locale = (params.locale === "en" ? "en" : "ko") as "ko" | "en";
  const rawRole = search.get("role");
  const role: "client" | "creator" = rawRole === "creator" ? "creator" : "client";

  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await createProfileAction({
      handle: values.handle,
      displayName: values.displayName,
      bio: values.bio ?? "",
      locale,
      role,
    });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (role === "creator") {
      router.push(`/${locale}/app`);
    } else {
      router.push(`/${locale}/onboarding/workspace`);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all"><em>{t("profile_title")}</em></h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="handle">{t("handle")}</Label>
          <Input id="handle" {...register("handle")} placeholder="your-handle" autoComplete="username" />
          <p className="text-xs text-muted-foreground">{t("handle_help")}</p>
          {errors.handle && <p className="text-xs text-destructive">{errors.handle.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">{t("display_name")}</Label>
          <Input id="displayName" {...register("displayName")} />
          {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">{t("bio")}</Label>
          <Textarea id="bio" rows={3} placeholder={t("bio_placeholder")} {...register("bio")} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? t("done") : c("continue")}
        </Button>
      </form>
    </div>
  );
}
