"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Phase 4.x Wave C.5b sub_07 — standalone "check your email" landing.
// The post-signup path renders an inline version of this content from
// inside (auth)/signup/page.tsx (after a successful signUp() that
// requires email confirmation). This /auth/verify route is the same
// surface accessible via a direct URL — used when the user closes
// the signup tab and later wants the recipient view back, or when
// a future email-flow lands them here directly with ?email=<addr>.

export default function AuthVerifyPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const params = useSearchParams();
  const presetEmail = params.get("email") ?? "";
  const [resending, setResending] = useState(false);

  async function onResend() {
    if (!presetEmail) {
      toast.error(t("email_placeholder"));
      return;
    }
    setResending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: presetEmail,
      // Phase 4.x Wave C.5c sub_01 — PKCE: emailRedirectTo is the FINAL
      // post-verify landing; email link itself is the dashboard's
      // /auth/confirm template URL.
      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("signup_email_sent"));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="font-semibold tracking-display-ko text-3xl tracking-tight keep-all">
          {t("check_your_email_title")}
        </h1>
        <p className="text-base ink-secondary leading-body keep-all">
          {t("check_your_email_sub")}
        </p>
      </div>

      {presetEmail && (
        <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
          <p className="ink-primary">
            <span className="ink-tertiary">{t("sent_to_label")}: </span>
            <span className="font-medium break-all">{presetEmail}</span>
          </p>
          <ul className="text-sm ink-secondary space-y-2 leading-body">
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">·</span>
              <span>{t("check_email_hint_inbox")}</span>
            </li>
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">·</span>
              <span>{t("check_email_hint_spam")}</span>
            </li>
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">·</span>
              <span>{t("check_email_hint_link")}</span>
            </li>
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {presetEmail && (
          <Button
            type="button"
            className="w-full bg-sage hover:brightness-105"
            size="lg"
            onClick={onResend}
            disabled={resending}
          >
            {resending ? t("sending") : t("resend_email")}
          </Button>
        )}
        <Button asChild type="button" variant="ghost" className="w-full" size="lg">
          <Link href="/signin">{c("signin")}</Link>
        </Button>
      </div>

      <p className="text-center text-sm ink-tertiary">
        {t("no_account")}{" "}
        <Link href="/signup" className="ink-primary hover:accent-sage transition-colors">
          {c("signup")}
        </Link>
      </p>
    </div>
  );
}
