"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "password_mismatch",
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error, data } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      router.push("/onboarding");
    } else {
      toast.success(t("signup_email_sent"));
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("signup_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground">{t("signup_sub")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("email_placeholder")}
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("password_label")}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t("password_ph")}
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
          <Input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            {...register("passwordConfirm")}
          />
          {errors.passwordConfirm && (
            <p className="text-xs text-destructive">
              {errors.passwordConfirm.message === "password_mismatch"
                ? t("password_mismatch")
                : errors.passwordConfirm.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? t("sending") : c("signup")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("have_account")}{" "}
        <Link href="/signin" className="text-foreground hover:underline">
          {c("signin")}
        </Link>
      </p>
    </div>
  );
}
