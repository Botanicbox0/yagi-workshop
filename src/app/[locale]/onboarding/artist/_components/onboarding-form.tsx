"use client";

// Phase 6 Wave A.3 — Artist 1-step onboarding form
// Instagram handle input + "시작하기 →" submit button.
// On success, router.push to /[locale]/app/projects.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeArtistOnboardingAction } from "../_actions/complete-onboarding";

const schema = z.object({
  instagramHandle: z.string().min(1).max(31),
});

type FormValues = z.infer<typeof schema>;

interface OnboardingFormProps {
  locale: string;
  email: string;
  displayName: string;
}

export function OnboardingForm({ locale, email, displayName }: OnboardingFormProps) {
  const t = useTranslations("onboarding_artist");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { instagramHandle: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await completeArtistOnboardingAction({
      instagramHandle: values.instagramHandle,
    });
    setSubmitting(false);

    if (result.ok) {
      router.push(`/${locale}/app/projects`);
    } else {
      if (result.error === "forbidden") {
        // Already completed — push to app directly
        router.push(`/${locale}/app/projects`);
        return;
      }
      toast.error(result.message ?? result.error);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-semibold tracking-display-ko text-3xl tracking-tight keep-all">
          {t("greeting", { name: displayName })}
        </h1>
        <p className="text-sm text-muted-foreground keep-all">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Read-only email */}
        <div className="space-y-1.5">
          <Label>{t("email_label")}</Label>
          <Input
            value={email}
            readOnly
            disabled
            className="bg-muted/50 cursor-not-allowed"
          />
        </div>

        {/* Instagram handle */}
        <div className="space-y-1.5">
          <Label htmlFor="instagram-handle">{t("instagram_label")}</Label>
          <Input
            id="instagram-handle"
            placeholder="@your_handle"
            {...register("instagramHandle")}
          />
          {errors.instagramHandle && (
            <p className="text-xs text-destructive">
              {errors.instagramHandle.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full"
          disabled={submitting}
        >
          {submitting ? "..." : t("submit_cta")}
        </Button>
      </form>
    </div>
  );
}
