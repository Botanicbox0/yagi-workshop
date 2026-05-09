"use client";

// Wave C v2 — Public campaign submission form.
//
// Baked-in fixes:
//   HIGH-1 — Cloudflare Turnstile widget; token sent to submit action
//   HIGH-2 — presigned PUT URL flow returns upload_token; resubmitted to action
//   MED-4  — magic_link_sent fallback in success view (sign-in CTA when email failed)
//   MED-8  — "or" separator wrapped in <hr> flank
//
// Flow:
//   1. (R2 path) presign + browser PUT to R2 (XHR with progress); receive
//      upload_token + object_key
//   2. Turnstile widget renders; user solves; client gets token
//   3. submit action: ratelimit + turnstile siteverify + R2 token verify +
//      key shape regex + R2 HEAD-check + content_mime persistence + account
//      resolve + magic-link send + INSERT
//   4. Success view branches on magic_link_sent

import { useState, useRef, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Script from "next/script";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitCampaignApplicationAction } from "./_actions/submit-application-action";
import { presignSubmissionUpload } from "./_actions/presign-submission-upload";

type CategoryOption = { id: string; name: string };

const ERROR_KEYS = new Set([
  "input_invalid",
  "work_required",
  "upload_token_required",
  "campaign_not_found",
  "campaign_not_open",
  "campaign_closed",
  "r2_upload_not_allowed",
  "external_url_not_allowed",
  "category_invalid",
  "invite_failed",
  "workspace_create_failed",
  "workspace_member_failed",
  "submission_insert_failed",
  "presign_failed",
  "content_type_not_allowed",
  "filename_invalid",
  "upload_failed",
  "rate_limited",
  "captcha_failed",
  "token_malformed",
  "token_bad_signature",
  "token_expired",
  "token_ip_mismatch",
  "token_campaign_mismatch",
  "key_mismatch",
  "object_not_found",
  "file_too_large",
  "head_check_failed",
]);

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string | HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        "error-callback"?: () => void;
        "expired-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
        size?: "normal" | "compact";
      }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function SubmitApplicationForm({
  campaignSlug,
  campaignTitle,
  categories,
  allowR2Upload,
  allowExternalUrl,
  locale,
}: {
  campaignSlug: string;
  campaignTitle: string;
  categories: CategoryOption[];
  allowR2Upload: boolean;
  allowExternalUrl: boolean;
  /** Wave C v2 K-06 LOOP-1 FINDING 1 fix: locale resolved server-side from
   *  Accept-Language since the submit route is locale-free. Used for the
   *  MED-4 sign-in fallback link path. */
  locale: "ko" | "en";
}) {
  const t = useTranslations("public_campaigns.submit");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [teamName, setTeamName] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [submitted, setSubmitted] = useState<{
    email: string;
    magicLinkSent: boolean;
  } | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Render Turnstile widget once script + container are ready.
  useEffect(() => {
    if (submitted) return;
    if (!turnstileSiteKey) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (!window.turnstile || !turnstileContainerRef.current) {
        if (attempts > 50) clearInterval(interval); // 5s ceiling
        return;
      }
      if (turnstileWidgetIdRef.current) {
        clearInterval(interval);
        return;
      }
      try {
        const id = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          theme: "light",
          callback: (token) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
        });
        turnstileWidgetIdRef.current = id;
        clearInterval(interval);
      } catch (err) {
        console.error("[turnstile] render exception:", err);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [submitted, turnstileSiteKey]);

  function fileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
  }
  function clearFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadToR2(
    file: File,
  ): Promise<
    | { ok: true; key: string; uploadToken: string }
    | { ok: false; error: string }
  > {
    // Sanitize filename for the regex `[\w.\-]+` constraint on the action.
    const safeName = file.name.replace(/\s+/g, "-").replace(/[^\w.\-]+/g, "_");
    const presign = await presignSubmissionUpload({
      campaign_slug: campaignSlug,
      filename: safeName,
      content_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });
    if (!presign.ok) return { ok: false, error: presign.error };

    setUploadProgress(0);

    const result: { ok: true } | { ok: false; error: string } = await new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presign.put_url, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };
      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true });
        else resolve({ ok: false, error: "upload_failed" });
      };
      xhr.onerror = () => {
        setUploadProgress(null);
        resolve({ ok: false, error: "upload_failed" });
      };
      xhr.send(file);
    });

    if (!result.ok) return result;
    return { ok: true, key: presign.object_key, uploadToken: presign.upload_token };
  }

  function toastError(code: string, retryAfter?: number) {
    if (code === "rate_limited" && retryAfter) {
      toast.error(t("error.rate_limited_with_retry", { seconds: retryAfter }));
      return;
    }
    const known = ERROR_KEYS.has(code);
    const key = (known
      ? `error.${code}`
      : "error.submit_failed") as Parameters<typeof t>[0];
    toast.error(t(key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!categoryId) {
      toast.error(t("error.category_required"));
      return;
    }
    if (!email.trim() || !name.trim() || !phone.trim() || !workTitle.trim()) {
      toast.error(t("error.required_fields"));
      return;
    }
    const hasFile = Boolean(selectedFile);
    const hasUrl = externalUrl.trim().length > 0;
    if (!hasFile && !hasUrl) {
      toast.error(t("error.work_required"));
      return;
    }
    if (!turnstileToken) {
      toast.error(t("error.captcha_required"));
      return;
    }

    startTransition(async () => {
      let r2Key: string | undefined;
      let uploadToken: string | undefined;
      if (hasFile && selectedFile) {
        const upload = await uploadToR2(selectedFile);
        if (!upload.ok) {
          toastError(upload.error);
          return;
        }
        r2Key = upload.key;
        uploadToken = upload.uploadToken;
      }

      const result = await submitCampaignApplicationAction({
        campaign_slug: campaignSlug,
        category_id: categoryId,
        applicant_email: email.trim(),
        applicant_name: name.trim(),
        applicant_phone: phone.trim(),
        team_name: teamName.trim() || undefined,
        work_title: workTitle.trim(),
        work_description: workDescription.trim() || undefined,
        content_r2_key: r2Key,
        upload_token: uploadToken,
        external_url: hasUrl ? externalUrl.trim() : undefined,
        turnstile_token: turnstileToken,
      });

      if (!result.ok) {
        toastError(result.error, result.retry_after_seconds);
        // Reset Turnstile after rejected attempt so user can retry without
        // full page reload.
        if (window.turnstile && turnstileWidgetIdRef.current) {
          try {
            window.turnstile.reset(turnstileWidgetIdRef.current);
          } catch {
            // ignore
          }
        }
        setTurnstileToken(null);
        return;
      }

      setSubmitted({
        email: email.trim(),
        magicLinkSent: result.magic_link_sent,
      });
      toast.success(t("toast_submitted"));
    });
  }

  // ──────────────────────────── Success view ────────────────────────────
  if (submitted) {
    // MED-4: branch on magic_link_sent. If Resend silently failed for an
    // existing user, surface a sign-in fallback CTA instead of lying about
    // the email being delivered.
    return (
      <div className="rounded-card border border-edge-subtle bg-card p-6 md:p-10 space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] accent-sage">
            {t("success_eyebrow")}
          </p>
          {/* HIGH-4: Pretendard 600 unified */}
          <h2 className="font-semibold tracking-display-ko text-2xl md:text-3xl keep-all">
            {t("success_title")}
          </h2>
        </div>

        {submitted.magicLinkSent ? (
          <p className="text-sm text-muted-foreground keep-all leading-relaxed">
            {t("success_email_sent", { email: submitted.email, campaign: campaignTitle })}
          </p>
        ) : (
          <div className="rounded-card border border-edge-subtle bg-muted/30 p-4 space-y-3">
            <p className="text-sm text-foreground keep-all leading-relaxed">
              {t("success_email_failed", { email: submitted.email })}
            </p>
            <Link
              href={`/${locale}/signin?email=${encodeURIComponent(submitted.email)}&next=/${locale}/app/my-submissions`}
              className="inline-flex items-center gap-1 text-sm accent-sage hover:underline underline-offset-2"
            >
              {t("success_login_fallback_cta")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        <div className="rounded-card border border-edge-subtle bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground keep-all leading-relaxed">
            {t("success_next_steps")}
          </p>
        </div>
      </div>
    );
  }

  // ──────────────────────────── Form view ────────────────────────────
  return (
    <>
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
        />
      )}
      <form
        onSubmit={handleSubmit}
        className="rounded-card border border-edge-subtle bg-card p-6 md:p-8 space-y-7"
      >
        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="cat">
            {t("category_label")} <span className="text-destructive">*</span>
          </Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="cat" className="rounded-button">
              <SelectValue placeholder={t("category_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Applicant */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              {t("email_label")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email_placeholder")}
              maxLength={254}
              required
              className="rounded-button"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("name_label")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("name_placeholder")}
              maxLength={120}
              required
              className="rounded-button"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">
              {t("phone_label")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phone_placeholder")}
              maxLength={40}
              required
              className="rounded-button"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team">{t("team_label")}</Label>
            <Input
              id="team"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t("team_placeholder")}
              maxLength={120}
              className="rounded-button"
            />
          </div>
        </div>

        {/* Work info */}
        <div className="space-y-2">
          <Label htmlFor="work_title">
            {t("work_title_label")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="work_title"
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            placeholder={t("work_title_placeholder")}
            maxLength={200}
            required
            className="rounded-button"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="work_desc">{t("work_description_label")}</Label>
          <Textarea
            id="work_desc"
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder={t("work_description_placeholder")}
            rows={3}
            maxLength={2000}
            className="rounded-button"
          />
        </div>

        {/* Work content — at least one of file / URL */}
        <div className="space-y-3 rounded-card border border-edge-subtle bg-muted/30 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("work_content_label")}{" "}
            <span className="text-destructive">*</span>
          </p>

          {allowR2Upload && (
            <div className="space-y-2">
              <Label htmlFor="file">{t("file_label")}</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept="image/*,video/*"
                onChange={fileSelected}
                className="rounded-button"
              />
              {selectedFile && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">
                    {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    {t("file_remove")}
                  </button>
                </div>
              )}
              {uploadProgress !== null && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {t("uploading")} {uploadProgress}%
                </div>
              )}
            </div>
          )}

          {allowR2Upload && allowExternalUrl && (
            // MED-8: hr-flank "or" separator (was floating text)
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <hr className="flex-1 border-edge-subtle" />
              <span>{t("or_separator")}</span>
              <hr className="flex-1 border-edge-subtle" />
            </div>
          )}

          {allowExternalUrl && (
            <div className="space-y-2">
              <Label htmlFor="url">{t("external_url_label")}</Label>
              <Input
                id="url"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder={t("external_url_placeholder")}
                maxLength={2048}
                className="rounded-button"
              />
              <p className="text-[11px] text-muted-foreground keep-all">
                {t("external_url_helper")}
              </p>
            </div>
          )}
        </div>

        {/* Turnstile widget */}
        {turnstileSiteKey && (
          <div className="space-y-2">
            <div ref={turnstileContainerRef} className="flex justify-center" />
            {!turnstileToken && (
              <p className="text-[11px] text-muted-foreground text-center">
                {t("captcha_intro")}
              </p>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            size="pill"
            disabled={isPending || !turnstileToken}
            className="bg-sage text-sage-ink hover:bg-sage/90 border-transparent"
          >
            {isPending ? t("submitting") : t("submit_cta")}
          </Button>
          <p className="text-[11px] text-muted-foreground keep-all leading-relaxed">
            {t("submit_legal")}
          </p>
        </div>
      </form>
    </>
  );
}
