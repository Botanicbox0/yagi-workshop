"use client";

import { useEffect, useState } from "react";
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

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

// Phase 4.x Wave C.5b sub_04 — Supabase Auth occasionally surfaces
// expiry/error states via the URL fragment (e.g. when the email-link
// callback bounces to the signin page directly with
// `#error_code=otp_expired&...`). Detect on mount and route to the
// dedicated expired surface; clear the fragment so the page state
// stops being driven by stale URL noise.
function readHashError(): { code: string; description: string } | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const code = params.get("error_code") ?? params.get("error") ?? "";
  const description = params.get("error_description") ?? "";
  if (!code && !description) return null;
  return { code, description };
}

function isOtpExpired(error: { code: string; description: string }): boolean {
  const blob = `${error.code} ${error.description}`.toLowerCase();
  return blob.includes("otp_expired") || blob.includes("expired");
}

export default function SignInPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const error = readHashError();
    if (!error) return;
    // Strip the fragment so a refresh doesn't re-trigger.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (isOtpExpired(error)) {
      router.push("/auth/expired" as const);
      return;
    }
    toast.error(error.description || error.code);
  }, [router]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/onboarding");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          {t("signin_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("signin_sub")}</p>
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
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? t("sending") : c("signin")}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>
          <Link href="/forgot-password" className="text-foreground hover:underline">
            {t("forgot_password")}
          </Link>
        </p>
        <p>
          {t("no_account")}{" "}
          <Link href="/signup" className="text-foreground hover:underline">
            {c("signup")}
          </Link>
        </p>
      </div>
    </div>
  );
}
