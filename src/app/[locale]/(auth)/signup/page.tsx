"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Phase 2.8.1 G_B1-H (F-PUX-003): commission flow uses `?next=` to bring
// the user back to /app/commission/new after the email-confirm round-trip.
// We accept any same-origin path that starts with `/` and is not the auth
// confirm endpoint itself (avoids the trivial loop). Cross-origin URLs
// are rejected outright so a malicious caller can't bounce the user off
// the platform.
function sanitizeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null; // protocol-relative
  if (raw.startsWith("/auth/callback")) return null;
  if (raw.length > 500) return null;
  return raw;
}

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
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));
  const [submitting, setSubmitting] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function buildEmailRedirect(siteUrl: string): string {
    const base = `${siteUrl}/auth/callback`;
    return next ? `${base}?next=${encodeURIComponent(next)}` : base;
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error, data } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled in Supabase auth settings — auto-login path.
      // Honor `next` here too so the in-product redirect mirrors the
      // email-confirm path.
      router.push((next ?? "/onboarding") as "/onboarding");
    } else {
      // Email confirmation enabled — switch the page over to the sent-state view
      // instead of leaving the user on the form with only a toast.
      setSentToEmail(values.email);
    }
  }

  async function onResend() {
    if (!sentToEmail) return;
    setResending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentToEmail,
      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("signup_email_sent"));
  }

  // ---- Sent state — shown after successful signUp() when email confirmation
  // is required by the project. The user stays on this view and follows the
  // mailbox link. This replaces the "toast-only and the form stays put"
  // behavior that read as a dead-end.
  if (sentToEmail) {
    return (
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="font-display text-3xl tracking-tight">
            {t("check_your_email_title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("check_your_email_sub")}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm space-y-3">
          <p className="text-foreground">
            <span className="text-muted-foreground">{t("sent_to_label")}: </span>
            <span className="font-medium break-all">{sentToEmail}</span>
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>{t("check_email_hint_inbox")}</li>
            <li>{t("check_email_hint_spam")}</li>
            <li>{t("check_email_hint_link")}</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={onResend}
            disabled={resending}
          >
            {resending ? t("sending") : t("resend_email")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            size="lg"
            onClick={() => setSentToEmail(null)}
          >
            {t("use_different_email")}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t("have_account")}{" "}
          <Link href="/signin" className="text-foreground hover:underline">
            {c("signin")}
          </Link>
        </p>
      </div>
    );
  }

  // ---- Default state — signup form.
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          {t("signup_title")}
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
