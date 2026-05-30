"use client";

import Image from "next/image";
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
import { LoginShowcase } from "./login-showcase";

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
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    setHydrated(true);
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
    <div className="mx-auto grid min-h-[calc(100dvh-48px)] w-full max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)]">
      <div className="mx-auto w-full max-w-md space-y-9 lg:mx-0 lg:max-w-[560px]">
        <div className="space-y-8">
          <Link
            href="/"
            className="inline-flex items-center gap-3"
            aria-label="YAGI Workshop"
          >
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-surface">
              <Image
                src="/brand/yagi-symbol-mono-dark.png"
                alt=""
                fill
                sizes="36px"
                className="object-contain p-1.5"
                priority
              />
            </span>
            <Image
              src="/brand/yagi-wordmark-white.png"
              alt="YAGI"
              width={64}
              height={20}
              className="h-5 w-auto object-contain"
              priority
            />
          </Link>

          <div className="space-y-4">
            <p className="text-[11px] font-normal uppercase tracking-label text-muted-foreground">
              {t("signin_split_eyebrow")}
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-normal text-foreground keep-all sm:text-5xl lg:text-[42px]">
              <span className="block">{t("signin_split_head_main")}</span>
              <span className="block text-muted-foreground">
                {t("signin_split_head_soft")}
              </span>
            </h1>
            <p className="text-base leading-7 text-muted-foreground keep-all">
              {t("signin_split_sub")}
            </p>
          </div>
        </div>

        <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("email_placeholder")}
              autoComplete="email"
              className="h-11 bg-surface-card"
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
              className="h-11 bg-surface-card"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-full bg-brand text-brand-on hover:bg-brand/90"
            size="lg"
            disabled={!hydrated || submitting}
          >
            {submitting ? t("sending") : c("signin")}
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm text-muted-foreground">
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

      <LoginShowcase />
    </div>
  );
}
