"use client";

// Phase 7 Wave C.1 + C.2 — Public campaign submission form.
//
// Form fields:
//   - Category select (required)
//   - Applicant info: email, name, phone (all required), team_name (optional)
//   - Work title (required) + description (optional)
//   - Work content: file upload (R2) OR external URL (at least one required,
//     gated by campaign.allow_r2_upload / allow_external_url)
//
// On submit:
//   1. (R2 path) presign + browser PUT to R2 (no upload through our server).
//   2. submitCampaignApplicationAction: account resolve / create + workspace
//      auto-create + magic-link send + INSERT campaign_submissions.
//   3. Success view with a clear "check your email" message.

import { useState, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
]);

export function SubmitApplicationForm({
  campaignSlug,
  campaignTitle,
  categories,
  allowR2Upload,
  allowExternalUrl,
}: {
  campaignSlug: string;
  campaignTitle: string;
  categories: CategoryOption[];
  allowR2Upload: boolean;
  allowExternalUrl: boolean;
}) {
  const t = useTranslations("public_campaigns.submit");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.id ?? "",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [teamName, setTeamName] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Success view state
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  function fileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
  }

  function clearFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadToR2(file: File): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
    const presign = await presignSubmissionUpload({
      campaign_slug: campaignSlug,
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });
    if (!presign.ok) return { ok: false, error: presign.error };

    setUploadProgress(0);

    // Use XHR so we can surface upload progress.
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
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ok: true });
        } else {
          resolve({ ok: false, error: "upload_failed" });
        }
      };
      xhr.onerror = () => {
        setUploadProgress(null);
        resolve({ ok: false, error: "upload_failed" });
      };
      xhr.send(file);
    });

    if (!result.ok) return result;
    return { ok: true, key: presign.object_key };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation (server enforces too)
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

    startTransition(async () => {
      let r2Key: string | undefined;
      if (hasFile && selectedFile) {
        const upload = await uploadToR2(selectedFile);
        if (!upload.ok) {
          toastError(upload.error);
          return;
        }
        r2Key = upload.key;
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
        external_url: hasUrl ? externalUrl.trim() : undefined,
      });

      if (!result.ok) {
        toastError(result.error);
        return;
      }

      setSubmittedEmail(email.trim());
      toast.success(t("toast_submitted"));
    });
  }

  function toastError(code: string) {
    const known = ERROR_KEYS.has(code);
    const key = (known
      ? `error.${code}`
      : "error.submit_failed") as Parameters<typeof t>[0];
    toast.error(t(key));
  }

  // Success view
  if (submittedEmail) {
    return (
      <div className="rounded-[24px] border border-border bg-card p-6 md:p-10 space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-sage">
            {t("success_eyebrow")}
          </p>
          <h2
            className="font-semibold text-2xl md:text-3xl keep-all"
            style={{ lineHeight: "1.18", letterSpacing: "-0.01em" }}
          >
            {t("success_title")}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground keep-all leading-relaxed">
          {t("success_body", { email: submittedEmail, campaign: campaignTitle })}
        </p>
        <div className="rounded-[24px] border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground keep-all leading-relaxed">
            {t("success_next_steps")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-border bg-card p-6 md:p-8 space-y-7"
    >
      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="cat">
          {t("category_label")} <span className="text-destructive">*</span>
        </Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="cat" className="rounded-[12px]">
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

      {/* Applicant identity */}
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
            className="rounded-[12px]"
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
            className="rounded-[12px]"
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
            className="rounded-[12px]"
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
            className="rounded-[12px]"
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
          className="rounded-[12px]"
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
          className="rounded-[12px]"
        />
      </div>

      {/* Work content — at least one of file / URL */}
      <div className="space-y-3 rounded-[24px] border border-border bg-muted/30 p-4">
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
              accept="image/*,video/*,application/pdf"
              onChange={fileSelected}
              className="rounded-[12px]"
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
          <div className="text-center text-xs text-muted-foreground">
            {t("or_separator")}
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
              className="rounded-[12px]"
            />
            <p className="text-[11px] text-muted-foreground keep-all">
              {t("external_url_helper")}
            </p>
          </div>
        )}

        {!allowR2Upload && !allowExternalUrl && (
          <p className="text-xs text-destructive keep-all">
            {t("error.no_path_available")}
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          size="pill"
          disabled={isPending}
          className="bg-sage text-sage-ink hover:opacity-90"
        >
          {isPending ? t("submitting") : t("submit_cta")}
        </Button>
        <p className="text-[11px] text-muted-foreground keep-all leading-relaxed">
          {t("submit_legal")}
        </p>
      </div>
    </form>
  );
}
