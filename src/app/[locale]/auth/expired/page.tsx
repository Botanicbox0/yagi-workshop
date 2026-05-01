"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Phase 4.x Wave C.5b sub_04 — dedicated landing for expired-OTP /
// expired-link auth callbacks. The callback route detects the expiry
// and bounces here with `?email=<address>` (when the original signup
// email is recoverable) so the resend flow doesn't ask the user to
// retype it. The form falls back to a free email input otherwise.

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export default function AuthExpiredPage() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const presetEmail = params.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: presetEmail },
  });

  async function onResend(values: FormValues) {
    setResending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: values.email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success(t("expired_resend_success"));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          {t("expired_headline")}
        </h1>
        <p className="text-sm text-muted-foreground keep-all">
          {t("expired_subtitle")}
        </p>
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit(onResend)} className="space-y-4">
          <p className="text-xs text-muted-foreground keep-all">
            {t("expired_resend_hint")}
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">{t("expired_resend_email_label")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("email_placeholder")}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={resending}>
            {resending ? t("sending") : t("expired_resend_send")}
          </Button>
        </form>
      ) : (
        <div className="rounded-card bg-card-deep border-subtle border px-5 py-4 text-sm">
          <p className="ink-secondary keep-all">{t("expired_resend_success")}</p>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/signin" className="text-foreground hover:underline">
          {t("expired_back_to_signin")}
        </Link>
      </p>
    </div>
  );
}
