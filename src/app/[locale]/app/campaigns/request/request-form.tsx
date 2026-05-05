"use client";

// Phase 7 Wave B.1 — Sponsor request form (client component).
//
// Form state: title, brief, contact_phone (required); reference_assets,
// schedule_intent, sponsorship_intent, compensation_intent, notes (optional).
// On submit: requestCampaignAction → server action returns { ok, id } or
// { ok: false, error: <key> }. Inline error keys map to i18n.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { requestCampaignAction } from "../_actions/request-campaign-action";

type ReferenceAssetDraft = { url: string; label: string };

type SponsorshipIntent = "self" | "co_sponsor" | "yagi_assist";
type CompensationIntent = "exposure_only" | "fixed_fee";

// Server-action error codes that have matching i18n keys under campaign_request.error.
// Anything else falls back to error.submit_failed so we never render a raw code.
const ERROR_KEYS = new Set([
  "phone_required",
  "phone_too_short",
  "phone_too_long",
  "title_required",
  "brief_required",
  "fixed_fee_required",
  "fixed_fee_amount_required",
  "input_invalid",
  "unauthorized",
  "not_a_member",
  "workspace_not_sponsor_eligible",
  "insert_failed",
  "submit_failed",
]);

export function RequestCampaignForm({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const t = useTranslations("campaign_request");
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAssetDraft[]>([]);
  const [scheduleIntent, setScheduleIntent] = useState("");
  const [sponsorshipIntent, setSponsorshipIntent] =
    useState<SponsorshipIntent | "unset">("unset");
  const [compensationIntent, setCompensationIntent] =
    useState<CompensationIntent | "unset">("unset");
  const [fixedFeeAmount, setFixedFeeAmount] = useState("");
  const [notes, setNotes] = useState("");

  function addAsset() {
    setReferenceAssets((prev) => [...prev, { url: "", label: "" }]);
  }
  function removeAsset(idx: number) {
    setReferenceAssets((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateAsset(
    idx: number,
    field: keyof ReferenceAssetDraft,
    value: string,
  ) {
    setReferenceAssets((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const phone = contactPhone.trim();
    if (phone.length < 7) {
      toast.error(t("error.phone_required"));
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error(t("error.title_required"));
      return;
    }
    const trimmedBrief = brief.trim();
    if (!trimmedBrief) {
      toast.error(t("error.brief_required"));
      return;
    }

    if (compensationIntent === "fixed_fee") {
      const amount = Number(fixedFeeAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error(t("error.fixed_fee_required"));
        return;
      }
    }

    // Drop empty asset rows so the server zod schema doesn't reject them.
    const cleanAssets = referenceAssets
      .map((a) => ({ url: a.url.trim(), label: a.label.trim() }))
      .filter((a) => a.url.length > 0 && a.label.length > 0);

    startTransition(async () => {
      const result = await requestCampaignAction({
        workspace_id: workspaceId,
        title: trimmedTitle,
        brief: trimmedBrief,
        contact_phone: phone,
        reference_assets: cleanAssets.length > 0 ? cleanAssets : undefined,
        schedule_intent: scheduleIntent.trim() || undefined,
        sponsorship_intent:
          sponsorshipIntent === "unset" ? undefined : sponsorshipIntent,
        compensation_intent:
          compensationIntent === "unset" ? undefined : compensationIntent,
        compensation_fixed_fee_per_creator:
          compensationIntent === "fixed_fee"
            ? Number(fixedFeeAmount)
            : undefined,
        notes: notes.trim() || undefined,
      });

      if (!result.ok) {
        const known = ERROR_KEYS.has(result.error);
        const key = (known
          ? `error.${result.error}`
          : "error.submit_failed") as Parameters<typeof t>[0];
        toast.error(t(key));
        return;
      }

      toast.success(t("toast_submitted"));
      // Reset form so subsequent submits don't accidentally re-send the same
      // payload, then refresh the page to show the new entry in the own list.
      setTitle("");
      setBrief("");
      setContactPhone("");
      setReferenceAssets([]);
      setScheduleIntent("");
      setSponsorshipIntent("unset");
      setCompensationIntent("unset");
      setFixedFeeAmount("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-border bg-card p-6 md:p-8 space-y-7"
    >
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="req_title">
          {t("form.title_label")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="req_title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("form.title_placeholder")}
          maxLength={200}
          required
          className="rounded-[12px]"
        />
      </div>

      {/* Brief */}
      <div className="space-y-2">
        <Label htmlFor="req_brief">
          {t("form.brief_label")} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="req_brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={t("form.brief_placeholder")}
          rows={6}
          maxLength={5000}
          required
          className="rounded-[12px]"
        />
      </div>

      {/* Contact phone — REQUIRED (Q6 lock) */}
      <div className="space-y-2">
        <Label htmlFor="req_phone">
          {t("form.contact_phone_label")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="req_phone"
          type="tel"
          inputMode="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder={t("form.contact_phone_placeholder")}
          maxLength={40}
          required
          className="rounded-[12px]"
        />
        <p className="text-xs text-muted-foreground keep-all">
          {t("form.contact_phone_helper")}
        </p>
      </div>

      {/* Reference assets */}
      <div className="space-y-3">
        <Label>{t("form.reference_assets_label")}</Label>
        {referenceAssets.length > 0 && (
          <div className="space-y-3">
            {referenceAssets.map((asset, idx) => (
              // K-06 LOOP-1 F1 fix: stack URL + label vertically on mobile so
              // the URL field doesn't collapse to ~120px on a 360px viewport.
              // sm: breakpoint restores the inline 3-column layout.
              <div
                key={idx}
                className="flex flex-col sm:flex-row gap-2"
              >
                <Input
                  type="url"
                  placeholder="https://..."
                  value={asset.url}
                  onChange={(e) => updateAsset(idx, "url", e.target.value)}
                  className="flex-1 min-w-0 rounded-[12px]"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder={t("form.reference_label_placeholder")}
                    value={asset.label}
                    onChange={(e) => updateAsset(idx, "label", e.target.value)}
                    maxLength={200}
                    className="flex-1 sm:w-40 sm:flex-none rounded-[12px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAsset(idx)}
                    className="text-muted-foreground shrink-0"
                  >
                    {t("form.remove_asset")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAsset}
          className="rounded-full"
        >
          {t("form.add_asset")}
        </Button>
        <p className="text-xs text-muted-foreground keep-all">
          {t("form.reference_assets_helper")}
        </p>
      </div>

      {/* Schedule intent */}
      <div className="space-y-2">
        <Label htmlFor="req_schedule">{t("form.schedule_intent_label")}</Label>
        <Textarea
          id="req_schedule"
          value={scheduleIntent}
          onChange={(e) => setScheduleIntent(e.target.value)}
          placeholder={t("form.schedule_intent_placeholder")}
          rows={2}
          maxLength={2000}
          className="rounded-[12px]"
        />
      </div>

      {/* Sponsorship intent */}
      <div className="space-y-2">
        <Label htmlFor="req_sponsorship">
          {t("form.sponsorship_intent_label")}
        </Label>
        <Select
          value={sponsorshipIntent}
          onValueChange={(v) =>
            setSponsorshipIntent(v as SponsorshipIntent | "unset")
          }
        >
          <SelectTrigger id="req_sponsorship" className="rounded-[12px]">
            <SelectValue placeholder={t("form.sponsorship_intent_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self">{t("form.sponsorship_self")}</SelectItem>
            <SelectItem value="co_sponsor">
              {t("form.sponsorship_co_sponsor")}
            </SelectItem>
            <SelectItem value="yagi_assist">
              {t("form.sponsorship_yagi_assist")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compensation intent */}
      <div className="space-y-2">
        <Label htmlFor="req_compensation">
          {t("form.compensation_intent_label")}
        </Label>
        <Select
          value={compensationIntent}
          onValueChange={(v) =>
            setCompensationIntent(v as CompensationIntent | "unset")
          }
        >
          <SelectTrigger id="req_compensation" className="rounded-[12px]">
            <SelectValue placeholder={t("form.compensation_intent_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exposure_only">
              {t("form.compensation_exposure_only")}
            </SelectItem>
            <SelectItem value="fixed_fee">
              {t("form.compensation_fixed_fee")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {compensationIntent === "fixed_fee" && (
        <div className="space-y-2">
          <Label htmlFor="req_fixed_fee">
            {t("form.fixed_fee_amount_label")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="req_fixed_fee"
            type="number"
            inputMode="numeric"
            min={0}
            value={fixedFeeAmount}
            onChange={(e) => setFixedFeeAmount(e.target.value)}
            className="rounded-[12px]"
          />
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="req_notes">{t("form.notes_label")}</Label>
        <Textarea
          id="req_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("form.notes_placeholder")}
          rows={3}
          maxLength={2000}
          className="rounded-[12px]"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          size="pill"
          disabled={isPending}
          style={{ backgroundColor: "#71D083", color: "#000" }}
        >
          {isPending ? "..." : t("form.submit_cta")}
        </Button>
      </div>
    </form>
  );
}
