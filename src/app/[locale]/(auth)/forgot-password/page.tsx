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
import { Link } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    // Phase 4.x Wave C.5c sub_01 — PKCE: redirectTo is the FINAL
    // destination after verifyOtp succeeds at /auth/confirm. The
    // email link itself is hard-coded in the Supabase Dashboard
    // recovery template to /auth/confirm?type=recovery&...
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success(t("reset_link_sent"));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          {t("reset_password_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("reset_password_sub")}</p>
      </div>

      {sent ? (
        <div className="rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm">
          {t("reset_link_sent")}
        </div>
      ) : (
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
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? t("sending") : t("send_link")}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/signin" className="text-foreground hover:underline">
          {t("back_to_signin")}
        </Link>
      </p>
    </div>
  );
}
