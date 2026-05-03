"use client";

import { useEffect, useState } from "react";
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
//
// Phase 4.x Wave C.5c sub_02 — explicit error branches + 60s cooldown
// UI. Supabase's resend rate limit is 60s; without a visible countdown,
// users mash the button and get a confusing toast on the second click.

const COOLDOWN_SECONDS = 60;

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

function classifyResendError(message: string): "rate_limit" | "invalid_email" | "generic" {
  const lower = message.toLowerCase();
  if (
    lower.includes("once every") ||
    lower.includes("rate limit") ||
    lower.includes("for security purposes") ||
    lower.includes("too many requests") ||
    lower.includes("60 seconds")
  ) {
    return "rate_limit";
  }
  if (lower.includes("email") && (lower.includes("invalid") || lower.includes("format"))) {
    return "invalid_email";
  }
  return "generic";
}

export default function AuthExpiredPage() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const presetEmail = params.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: presetEmail },
  });

  // Tick once a second whenever a cooldown is active so the countdown
  // copy refreshes. Stops as soon as the cooldown clears.
  useEffect(() => {
    if (cooldownEndsAt === null) return;
    const interval = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= cooldownEndsAt) {
        setCooldownEndsAt(null);
        window.clearInterval(interval);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [cooldownEndsAt]);

  const cooldownRemaining =
    cooldownEndsAt !== null ? Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000)) : 0;
  const inCooldown = cooldownRemaining > 0;

  function startCooldown(): void {
    setCooldownEndsAt(Date.now() + COOLDOWN_SECONDS * 1000);
    setNow(Date.now());
  }

  async function onResend(values: FormValues) {
    if (resending || inCooldown) return;
    setResending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: values.email,
      // Phase 4.x Wave C.5c sub_01 — PKCE: emailRedirectTo is the FINAL
      // post-verify landing; the email link itself is the dashboard's
      // /auth/confirm template URL.
      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
    });
    setResending(false);

    if (error) {
      const kind = classifyResendError(error.message);
      // Rate limits should still arm the cooldown UI so the user has a
      // visible countdown instead of guessing.
      if (kind === "rate_limit") {
        startCooldown();
        toast.error(t("expired_resend_rate_limited"));
      } else if (kind === "invalid_email") {
        toast.error(t("expired_resend_invalid_email"));
      } else {
        toast.error(t("expired_resend_generic_error"));
      }
      return;
    }

    setSent(true);
    startCooldown();
    toast.success(t("expired_resend_success"));
  }

  const buttonLabel = (() => {
    if (resending) return t("sending");
    if (inCooldown) return t("expired_resend_cooldown", { seconds: cooldownRemaining });
    return t("expired_resend_send");
  })();

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

      {sent ? (
        <div className="space-y-4">
          <div className="rounded-card bg-card-deep border-subtle border px-5 py-4 text-sm">
            <p className="ink-secondary keep-all">{t("expired_resend_success")}</p>
          </div>
          <form onSubmit={handleSubmit(onResend)} className="space-y-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={resending || inCooldown}
              aria-disabled={resending || inCooldown}
            >
              {buttonLabel}
            </Button>
          </form>
        </div>
      ) : (
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
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={resending || inCooldown}
            aria-disabled={resending || inCooldown}
          >
            {buttonLabel}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/signin" className="text-foreground hover:underline">
          {t("expired_back_to_signin")}
        </Link>
      </p>
    </div>
  );
}
