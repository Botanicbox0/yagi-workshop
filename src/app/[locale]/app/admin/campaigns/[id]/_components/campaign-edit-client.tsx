"use client";

// Phase 7 Wave A.2 — Campaign edit/publish client component
//
// Receives pre-fetched campaign + categories from server page.
// All mutations go through server actions.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
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
  updateCampaignAction,
  publishCampaignAction,
  addCategoryAction,
  type ReferenceAsset,
  type CompensationModel,
} from "../../_actions/campaign-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CampaignData = {
  id: string;
  title: string;
  slug: string;
  status: string;
  description: string | null;
  brief: string | null;
  reference_assets: unknown;
  allow_r2_upload: boolean;
  allow_external_url: boolean;
  compensation_model: string | null;
  compensation_metadata: unknown;
  submission_open_at: string | null;
  submission_close_at: string | null;
};

type CategoryData = {
  id: string;
  name: string;
  description: string | null;
  format_spec: unknown;
  display_order: number;
};

type Translations = {
  title: string;
  draftLabel: string;
  publishedLabel: string;
  publishCta: string;
  formTitleLabel: string;
  formDescriptionLabel: string;
  formBriefLabel: string;
  formReferenceAssetsLabel: string;
  formCategoriesLabel: string;
  formFilePolicyLabel: string;
  formAllowR2Upload: string;
  formAllowExternalUrl: string;
  formCompensationModelLabel: string;
  formExposureOnly: string;
  formFixedFee: string;
  formRoyaltyShare: string;
  formSubmissionOpenAt: string;
  formSubmissionCloseAt: string;
  formSubmitSave: string;
  formAddAsset: string;
  formRemoveAsset: string;
  formAddCategory: string;
  formRemoveCategory: string;
  formCategoryNameLabel: string;
  formCategoryDescLabel: string;
  formCategoryFormatLabel: string;
  formFixedFeePerCreator: string;
  toastSaved: string;
  toastPublished: string;
  toastError: string;
};

type Props = {
  campaign: CampaignData;
  categories: CategoryData[];
  t: Translations;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAssets(raw: unknown): ReferenceAsset[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is ReferenceAsset =>
      typeof a === "object" && a !== null && "url" in a,
  );
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // datetime-local expects "YYYY-MM-DDTHH:mm"
  return iso.slice(0, 16);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignEditClient({ campaign, categories, t }: Props) {
  const router = useRouter();
  const [isSavePending, startSaveTransition] = useTransition();
  const [isPublishPending, startPublishTransition] = useTransition();
  const [isAddCatPending, startAddCatTransition] = useTransition();

  // Form state — initialised from server data
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [brief, setBrief] = useState(campaign.brief ?? "");
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>(
    parseAssets(campaign.reference_assets).length > 0
      ? parseAssets(campaign.reference_assets)
      : [{ url: "", label: "" }],
  );
  const [allowR2Upload, setAllowR2Upload] = useState(campaign.allow_r2_upload);
  const [allowExternalUrl, setAllowExternalUrl] = useState(
    campaign.allow_external_url,
  );
  const [compensationModel, setCompensationModel] = useState<CompensationModel>(
    (campaign.compensation_model as CompensationModel) ?? "exposure_only",
  );
  const [fixedFeeAmount, setFixedFeeAmount] = useState(() => {
    if (
      campaign.compensation_model === "fixed_fee" &&
      campaign.compensation_metadata &&
      typeof campaign.compensation_metadata === "object" &&
      "fixed_fee_per_creator" in (campaign.compensation_metadata as object)
    ) {
      return String(
        (campaign.compensation_metadata as { fixed_fee_per_creator: number })
          .fixed_fee_per_creator,
      );
    }
    return "";
  });
  const [submissionOpenAt, setSubmissionOpenAt] = useState(
    toDatetimeLocal(campaign.submission_open_at),
  );
  const [submissionCloseAt, setSubmissionCloseAt] = useState(
    toDatetimeLocal(campaign.submission_close_at),
  );

  // New category form state (inline add)
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatFormat, setNewCatFormat] = useState("");
  const [showAddCatForm, setShowAddCatForm] = useState(false);

  // --- Reference asset helpers ---
  function addAsset() {
    setReferenceAssets((prev) => [...prev, { url: "", label: "" }]);
  }
  function removeAsset(idx: number) {
    setReferenceAssets((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateAsset(idx: number, field: keyof ReferenceAsset, value: string) {
    setReferenceAssets((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    );
  }

  // --- Save ---
  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const validAssets = referenceAssets.filter((a) => a.url.trim());
    const compensationMetadata =
      compensationModel === "fixed_fee" && fixedFeeAmount
        ? { fixed_fee_per_creator: Number(fixedFeeAmount) }
        : null;

    startSaveTransition(async () => {
      const result = await updateCampaignAction(campaign.id, {
        title: title.trim(),
        description: description.trim() || null,
        brief: brief.trim() || null,
        reference_assets: validAssets,
        allow_r2_upload: allowR2Upload,
        allow_external_url: allowExternalUrl,
        compensation_model: compensationModel,
        compensation_metadata: compensationMetadata,
        submission_open_at: submissionOpenAt || null,
        submission_close_at: submissionCloseAt || null,
      });

      if (!result.ok) {
        toast.error(t.toastError);
        return;
      }
      toast.success(t.toastSaved);
    });
  }

  // --- Publish ---
  function handlePublish() {
    startPublishTransition(async () => {
      const result = await publishCampaignAction(campaign.id, {
        submission_open_at: submissionOpenAt || undefined,
      });

      if (!result.ok) {
        toast.error(t.toastError);
        return;
      }
      toast.success(t.toastPublished);
      router.refresh();
    });
  }

  // --- Add category ---
  function handleAddCategory() {
    if (!newCatName.trim()) return;
    startAddCatTransition(async () => {
      const result = await addCategoryAction(campaign.id, {
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
        format_spec: newCatFormat.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(t.toastError);
        return;
      }
      toast.success(t.toastSaved);
      setNewCatName("");
      setNewCatDesc("");
      setNewCatFormat("");
      setShowAddCatForm(false);
      router.refresh();
    });
  }

  const isDraft = campaign.status === "draft";

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-10 py-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/app/admin/campaigns"
              className="text-sm text-muted-foreground hover:underline underline-offset-2"
            >
              {t.title}
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
          </div>
          <h1 className="font-display text-3xl tracking-tight leading-[1.05] keep-all">
            {campaign.title}
          </h1>
          <div className="flex items-center gap-2">
            {isDraft ? (
              <span className="text-xs text-muted-foreground">
                {t.draftLabel}
              </span>
            ) : (
              <span className="text-xs text-[#71D083]">{t.publishedLabel}</span>
            )}
            <span className="text-xs text-muted-foreground font-mono">
              /{campaign.slug}
            </span>
          </div>
        </div>

        {isDraft && (
          <Button
            type="button"
            size="pill"
            disabled={isPublishPending}
            onClick={handlePublish}
            style={{ backgroundColor: "#71D083", color: "#000" }}
          >
            {isPublishPending ? "..." : t.publishCta}
          </Button>
        )}
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">{t.formTitleLabel}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className="rounded-[12px]"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">{t.formDescriptionLabel}</Label>
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
          <Label htmlFor="brief">{t.formBriefLabel}</Label>
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
          <Label>{t.formReferenceAssetsLabel}</Label>
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
                {t.formRemoveAsset}
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
            {t.formAddAsset}
          </Button>
        </div>

        {/* File Policy */}
        <div className="space-y-3">
          <Label>{t.formFilePolicyLabel}</Label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_r2_upload"
                checked={allowR2Upload}
                onCheckedChange={(v) => setAllowR2Upload(Boolean(v))}
              />
              <Label htmlFor="allow_r2_upload" className="cursor-pointer">
                {t.formAllowR2Upload}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_external_url"
                checked={allowExternalUrl}
                onCheckedChange={(v) => setAllowExternalUrl(Boolean(v))}
              />
              <Label htmlFor="allow_external_url" className="cursor-pointer">
                {t.formAllowExternalUrl}
              </Label>
            </div>
          </div>
        </div>

        {/* Compensation Model */}
        <div className="space-y-2">
          <Label htmlFor="compensation_model">
            {t.formCompensationModelLabel}
          </Label>
          <Select
            value={compensationModel}
            onValueChange={(v) =>
              setCompensationModel(v as CompensationModel)
            }
          >
            <SelectTrigger
              id="compensation_model"
              className="rounded-[12px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exposure_only">
                {t.formExposureOnly}
              </SelectItem>
              <SelectItem value="fixed_fee">{t.formFixedFee}</SelectItem>
              <SelectItem value="royalty_share">
                {t.formRoyaltyShare}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fixed fee amount (conditional) */}
        {compensationModel === "fixed_fee" && (
          <div className="space-y-2">
            <Label htmlFor="fixed_fee_amount">
              {t.formFixedFeePerCreator}
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
              {t.formSubmissionOpenAt}
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
              {t.formSubmissionCloseAt}
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

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="pill"
            disabled={isSavePending}
          >
            {isSavePending ? "..." : t.formSubmitSave}
          </Button>
        </div>
      </form>

      {/* Categories section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.formCategoriesLabel}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddCatForm((v) => !v)}
            className="rounded-full"
          >
            {t.formAddCategory}
          </Button>
        </div>

        {/* Existing categories */}
        {categories.length > 0 ? (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-[24px] border border-border p-4"
              >
                <p className="font-medium keep-all">{cat.name}</p>
                {cat.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {cat.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Inline add category form */}
        {showAddCatForm && (
          <div className="rounded-[24px] border border-[#71D083]/40 p-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new_cat_name">{t.formCategoryNameLabel}</Label>
              <Input
                id="new_cat_name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="rounded-[12px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_cat_desc">{t.formCategoryDescLabel}</Label>
              <Textarea
                id="new_cat_desc"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                rows={2}
                className="rounded-[12px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_cat_format">
                {t.formCategoryFormatLabel}
              </Label>
              <Input
                id="new_cat_format"
                value={newCatFormat}
                onChange={(e) => setNewCatFormat(e.target.value)}
                placeholder="e.g. MP4, max 60s, 1080p"
                className="rounded-[12px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddCatForm(false)}
              >
                {t.formRemoveCategory}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isAddCatPending || !newCatName.trim()}
                onClick={handleAddCategory}
                className="rounded-[12px]"
                style={{ backgroundColor: "#71D083", color: "#000" }}
              >
                {isAddCatPending ? "..." : t.formAddCategory}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
