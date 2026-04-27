"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { completeProfileAction } from "../actions";
import {
  HANDLE_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
  validateHandle,
} from "@/lib/handles/validate";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const schema = z.object({
  handle: z
    .string()
    .min(HANDLE_MIN_LENGTH)
    .max(HANDLE_MAX_LENGTH)
    .regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(80),
  bio: z.string().max(200).optional(),
  instagram: z.string().max(30).optional(),
});

type FormValues = z.infer<typeof schema>;

// Phase 2.8.3 G_B3_C — handle availability live-validation.
// Local validity (regex + length) is checked synchronously; remote
// availability via the existing public.is_handle_available RPC is
// debounced 300ms so the user does not hit the network on every key.
type HandleStatus =
  | { kind: "idle" }
  | { kind: "invalid" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" };

const DEBOUNCE_MS = 300;

export default function OnboardingCreatorPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = (params.locale === "en" ? "en" : "ko") as "ko" | "en";

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [handleStatus, setHandleStatus] = useState<HandleStatus>({
    kind: "idle",
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const handleLive = watch("handle") ?? "";

  // Debounced availability check. validateHandle covers regex+length
  // synchronously; only the remote uniqueness check needs the debounce.
  useEffect(() => {
    const trimmed = handleLive.trim().toLowerCase();
    if (trimmed.length === 0) {
      setHandleStatus({ kind: "idle" });
      return;
    }
    const localErr = validateHandle(trimmed);
    if (localErr !== null) {
      setHandleStatus({ kind: "invalid" });
      return;
    }
    setHandleStatus({ kind: "checking" });
    let cancelled = false;
    const id = setTimeout(async () => {
      if (cancelled) return;
      const supabase = createSupabaseBrowser();
      // Cast bypasses stale database.types.ts; shape matches actions.ts.
      const { data, error } = await (supabase.rpc as unknown as (
        fn: "is_handle_available",
        args: { candidate: string },
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>)(
        "is_handle_available",
        { candidate: trimmed },
      );
      if (cancelled) return;
      if (error) {
        // Network error → fall back to neutral idle so the form is still
        // submittable; submit-time check stays authoritative.
        setHandleStatus({ kind: "idle" });
        return;
      }
      setHandleStatus(data ? { kind: "available" } : { kind: "taken" });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [handleLive]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const res = await completeProfileAction({
      role: "creator",
      handle: values.handle,
      instagram_handle: values.instagram?.trim() || null,
      display_name: values.displayName,
      bio: values.bio ?? null,
      locale,
    });
    setSubmitting(false);

    if (!res.ok) {
      setServerError(res.error);
      const msg = errorToMessage(res.error, t);
      toast.error(msg);
      return;
    }
    router.push(`/${locale}${res.redirect}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          {t("profile_v2_creator_title")}
        </h1>
        <p className="text-sm text-muted-foreground keep-all">
          {t("profile_v2_creator_sub")}
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="handle">{t("handle_label")}</Label>
          <div className="relative">
            <Input
              id="handle"
              {...register("handle")}
              placeholder={t("handle_placeholder")}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="pr-9"
            />
            <HandleStatusIcon status={handleStatus} />
          </div>
          {/* Status line: live-validation badge + concise help text. */}
          <HandleStatusLine status={handleStatus} t={t} />
          <p className="text-xs text-muted-foreground">{t("handle_help_v2")}</p>
          {errors.handle && (
            <p className="text-xs text-destructive">{t("handle_err_INVALID_CHARS")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">{t("display_name_label")}</Label>
          <Input
            id="displayName"
            {...register("displayName")}
            placeholder={t("display_name_placeholder")}
          />
          <p className="text-xs text-muted-foreground">{t("display_name_help")}</p>
          {errors.displayName && (
            <p className="text-xs text-destructive">{errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram">{t("instagram_label")}</Label>
          <p className="text-xs text-muted-foreground keep-all">
            {t("instagram_why")}
          </p>
          <Input
            id="instagram"
            {...register("instagram")}
            placeholder={t("instagram_placeholder")}
            autoCapitalize="none"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">{t("instagram_help")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">{t("bio_label")}</Label>
          <Textarea
            id="bio"
            rows={3}
            placeholder={t("bio_placeholder_v2")}
            {...register("bio")}
          />
          {errors.bio && (
            <p className="text-xs text-destructive">{errors.bio.message}</p>
          )}
        </div>

        {serverError && (
          <p className="text-xs text-destructive">
            {errorToMessage(serverError, t)}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? t("saving") : t("create_profile_cta")}
        </Button>
      </form>
    </div>
  );
}

function HandleStatusIcon({ status }: { status: HandleStatus }) {
  if (status.kind === "checking") {
    return (
      <Loader2
        aria-hidden
        className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
      />
    );
  }
  if (status.kind === "available") {
    return (
      <Check
        aria-hidden
        className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600"
      />
    );
  }
  if (status.kind === "taken" || status.kind === "invalid") {
    return (
      <X
        aria-hidden
        className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive"
      />
    );
  }
  return null;
}

function HandleStatusLine({
  status,
  t,
}: {
  status: HandleStatus;
  t: ReturnType<typeof useTranslations>;
}) {
  if (status.kind === "idle") return null;
  const labelKey: Record<Exclude<HandleStatus["kind"], "idle">, string> = {
    checking: "handle_status_checking",
    available: "handle_status_available",
    taken: "handle_status_taken",
    invalid: "handle_status_invalid",
  };
  const tone =
    status.kind === "available"
      ? "text-emerald-600"
      : status.kind === "checking"
        ? "text-muted-foreground"
        : "text-destructive";
  return (
    <p className={cn("text-xs", tone)} aria-live="polite">
      {t(labelKey[status.kind] as "handle_status_available")}
    </p>
  );
}

function errorToMessage(
  code: string,
  t: (k: string) => string,
): string {
  const [scope, kind] = code.split(":");
  if (scope === "handle") return t(`handle_err_${kind}` as "handle_err_TAKEN");
  if (scope === "instagram")
    return t(`instagram_err_${kind}` as "instagram_err_EMPTY");
  return t("error_generic");
}
