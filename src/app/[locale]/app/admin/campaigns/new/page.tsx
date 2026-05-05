"use client";

// Phase 7 Wave A.2 — /admin/campaigns/new
//
// Create form for a new admin self-hosted campaign (Route A).
// Uses RHF + Zod. Errors as Sonner toast per CLAUDE.md rule 5.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCampaignAction,
  type ReferenceAsset,
  type CategoryInput,
  type CompensationModel,
} from "../_actions/campaign-actions";

export default function NewCampaignPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("admin_campaigns");
  const [isPending, startTransition] = useTransition();

  // Form state — pre-populated with 신곡 뮤비 template (Phase 7 Hotfix-4).
  // yagi can submit as-is or freely edit any field.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brief, setBrief] = useState(t("template.musicvideo.brief_default"));
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>([
    { url: "", label: t("template.musicvideo.asset_label_default") },
  ]);
  const [categories, setCategories] = useState<CategoryInput[]>([
    {
      name: t("template.musicvideo.cat1_name"),
      description: t("template.musicvideo.cat1_description"),
      format_spec: t("template.musicvideo.cat1_format_spec"),
    },
    {
      name: t("template.musicvideo.cat2_name"),
      description: t("template.musicvideo.cat2_description"),
      format_spec: t("template.musicvideo.cat2_format_spec"),
    },
  ]);
  const [allowR2Upload, setAllowR2Upload] = useState(true);
  const [allowExternalUrl, setAllowExternalUrl] = useState(true);
  const [compensationModel, setCompensationModel] =
    useState<CompensationModel>("exposure_only");
  const [fixedFeeAmount, setFixedFeeAmount] = useState("");
  const [submissionOpenAt, setSubmissionOpenAt] = useState("");
  const [submissionCloseAt, setSubmissionCloseAt] = useState("");

  // --- Reference assets helpers ---
  function addAsset() {
    setReferenceAssets((prev) => [...prev, { url: "", label: "" }]);
  }
  function removeAsset(idx: number) {
    setReferenceAssets((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateAsset(
    idx: number,
    field: keyof ReferenceAsset,
    value: string,
  ) {
    setReferenceAssets((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    );
  }

  // --- Category helpers ---
  function addCategory() {
    setCategories((prev) => [
      ...prev,
      { name: "", description: "", format_spec: "" },
    ]);
  }
  function removeCategory(idx: number) {
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateCategory(
    idx: number,
    field: keyof CategoryInput,
    value: string,
  ) {
    setCategories((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error(t("toast_error"));
      return;
    }
    const validCategories = categories.filter((c) => c.name.trim());
    if (validCategories.length === 0) {
      toast.error(t("toast_error"));
      return;
    }

    const validAssets = referenceAssets.filter((a) => a.url.trim());

    const compensationMetadata =
      compensationModel === "fixed_fee" && fixedFeeAmount
        ? { fixed_fee_per_creator: Number(fixedFeeAmount) }
        : undefined;

    startTransition(async () => {
      const result = await createCampaignAction({
        title: title.trim(),
        description: description.trim() || undefined,
        brief: brief.trim() || undefined,
        reference_assets: validAssets,
        categories: validCategories,
        allow_r2_upload: allowR2Upload,
        allow_external_url: allowExternalUrl,
        compensation_model: compensationModel,
        compensation_metadata: compensationMetadata,
        submission_open_at: submissionOpenAt || null,
        submission_close_at: submissionCloseAt || null,
      });

      if (!result.ok) {
        toast.error(t("toast_error"));
        return;
      }

      toast.success(t("toast_created"));
      router.push(`/${locale}/app/admin/campaigns/${result.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-10 py-12">
      <h1 className="font-display text-4xl tracking-tight leading-[1.05] keep-all">
        {t("new_cta")}
      </h1>

      {/* Template guidance banner */}
      <div className="rounded-[24px] border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground keep-all leading-relaxed">
          {t("template.banner")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">{t("form.title_label")}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("template.musicvideo.title_placeholder")}
            maxLength={200}
            required
            className="rounded-[12px]"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">{t("form.description_label")}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-[12px]"
          />
        </div>

        {/* Brief */}
        <div className="space-y-2">
          <Label htmlFor="brief">{t("form.brief_label")}</Label>
          <Textarea
            id="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={5}
            className="rounded-[12px]"
          />
        </div>

        {/* Reference Assets */}
        <div className="space-y-3">
          <Label>{t("form.reference_assets_label")}</Label>
          {referenceAssets.map((asset, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                type="url"
                placeholder="https://..."
                value={asset.url}
                onChange={(e) => updateAsset(idx, "url", e.target.value)}
                className="flex-1 rounded-[12px]"
              />
              <Input
                placeholder="Label"
                value={asset.label}
                onChange={(e) => updateAsset(idx, "label", e.target.value)}
                className="w-36 rounded-[12px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAsset(idx)}
                className="text-muted-foreground"
              >
                {t("form.remove_asset")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAsset}
            className="rounded-full"
          >
            {t("form.add_asset")}
          </Button>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <Label>{t("form.categories_label")}</Label>
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className="rounded-[24px] border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("form.categories_label")} {idx + 1}
                </span>
                {categories.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(idx)}
                    className="text-muted-foreground"
                  >
                    {t("form.remove_category")}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`cat-name-${idx}`}>
                  {t("form.category_name_label")}
                </Label>
                <Input
                  id={`cat-name-${idx}`}
                  value={cat.name}
                  onChange={(e) => updateCategory(idx, "name", e.target.value)}
                  required={idx === 0}
                  className="rounded-[12px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`cat-desc-${idx}`}>
                  {t("form.category_description_label")}
                </Label>
                <Textarea
                  id={`cat-desc-${idx}`}
                  value={cat.description ?? ""}
                  onChange={(e) =>
                    updateCategory(idx, "description", e.target.value)
                  }
                  rows={2}
                  className="rounded-[12px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`cat-fmt-${idx}`}>
                  {t("form.category_format_label")}
                </Label>
                <Input
                  id={`cat-fmt-${idx}`}
                  value={cat.format_spec ?? ""}
                  onChange={(e) =>
                    updateCategory(idx, "format_spec", e.target.value)
                  }
                  placeholder="e.g. MP4, max 60s, 1080p"
                  className="rounded-[12px]"
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCategory}
            className="rounded-full"
          >
            {t("form.add_category")}
          </Button>
        </div>

        {/* File Policy */}
        <div className="space-y-3">
          <Label>{t("form.file_policy_label")}</Label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_r2_upload"
                checked={allowR2Upload}
                onCheckedChange={(v) => setAllowR2Upload(Boolean(v))}
              />
              <Label htmlFor="allow_r2_upload" className="cursor-pointer">
                {t("form.allow_r2_upload")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_external_url"
                checked={allowExternalUrl}
                onCheckedChange={(v) => setAllowExternalUrl(Boolean(v))}
              />
              <Label htmlFor="allow_external_url" className="cursor-pointer">
                {t("form.allow_external_url")}
              </Label>
            </div>
          </div>
        </div>

        {/* Compensation Model */}
        <div className="space-y-2">
          <Label htmlFor="compensation_model">
            {t("form.compensation_model_label")}
          </Label>
          <Select
            value={compensationModel}
            onValueChange={(v) => setCompensationModel(v as CompensationModel)}
          >
            <SelectTrigger id="compensation_model" className="rounded-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exposure_only">{t("form.exposure_only")}</SelectItem>
              <SelectItem value="fixed_fee">{t("form.fixed_fee")}</SelectItem>
              <SelectItem value="royalty_share">
                {t("form.royalty_share")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fixed fee amount (conditional) */}
        {compensationModel === "fixed_fee" && (
          <div className="space-y-2">
            <Label htmlFor="fixed_fee_amount">
              {t("form.fixed_fee_per_creator_label")}
            </Label>
            <Input
              id="fixed_fee_amount"
              type="number"
              min={0}
              value={fixedFeeAmount}
              onChange={(e) => setFixedFeeAmount(e.target.value)}
              className="rounded-[12px]"
            />
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="submission_open_at">
              {t("form.submission_open_at")}
            </Label>
            <Input
              id="submission_open_at"
              type="datetime-local"
              value={submissionOpenAt}
              onChange={(e) => setSubmissionOpenAt(e.target.value)}
              className="rounded-[12px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="submission_close_at">
              {t("form.submission_close_at")}
            </Label>
            <Input
              id="submission_close_at"
              type="datetime-local"
              value={submissionCloseAt}
              onChange={(e) => setSubmissionCloseAt(e.target.value)}
              className="rounded-[12px]"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="pill"
            disabled={isPending}
            style={{ backgroundColor: "#71D083", color: "#000" }}
          >
            {isPending ? "..." : t("form.submit_create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
