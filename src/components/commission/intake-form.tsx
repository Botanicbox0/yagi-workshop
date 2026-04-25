"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  commissionIntakeFormSchema,
  type CommissionIntakeFormInput,
} from "@/lib/commission/schemas";
import { submitCommissionIntakeAction } from "@/lib/commission/actions";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = [
  "music_video",
  "commercial",
  "teaser",
  "lyric_video",
  "performance",
  "social",
  "other",
] as const;

const BUDGETS = [
  "under_5m",
  "5m_15m",
  "15m_30m",
  "30m_50m",
  "50m_100m",
  "100m_plus",
  "negotiable",
] as const;

export function CommissionIntakeForm({ locale }: { locale: "ko" | "en" }) {
  const t = useTranslations("commission");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [refUrls, setRefUrls] = useState<string[]>([""]);

  type FV = CommissionIntakeFormInput;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FV>({
    // The schema has transforms (date string → date|null) that make zod's
    // input vs output types diverge. We cast to the input-shaped Resolver
    // because RHF treats T as input shape; submit gets parsed output via
    // the action's own safeParse.
    resolver: zodResolver(commissionIntakeFormSchema) as unknown as Resolver<FV>,
    defaultValues: {
      category: "music_video",
      budget_range: "negotiable",
      reference_urls: [],
      reference_uploads: [],
    },
  });

  const category = watch("category");
  const budgetRange = watch("budget_range");

  async function onSubmit(values: FV) {
    setSubmitting(true);
    const cleanedUrls = refUrls.map((u) => u.trim()).filter(Boolean);
    const res = await submitCommissionIntakeAction({
      ...values,
      reference_urls: cleanedUrls,
      reference_uploads: [],
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(t("submit_error"));
      return;
    }
    toast.success(t("submit_success"));
    router.push(`/${locale}/app/commission/${res.id}`);
  }

  function setRefUrlAt(idx: number, value: string) {
    setRefUrls((prev) => prev.map((u, i) => (i === idx ? value : u)));
  }

  function addRefUrl() {
    if (refUrls.length >= 3) return;
    setRefUrls((prev) => [...prev, ""]);
  }

  function removeRefUrl(idx: number) {
    setRefUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl tracking-tight keep-all">
          <em>{t("new_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground keep-all">
          {t("new_sub")}
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">{t("field_title")}</Label>
          <Input
            id="title"
            {...register("title")}
            placeholder={t("field_title_ph")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">{t("field_category")}</Label>
            <Select
              value={category}
              onValueChange={(v) =>
                setValue("category", v as CommissionIntakeFormInput["category"], {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`category_${opt}` as "category_music_video")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_range">{t("field_budget")}</Label>
            <Select
              value={budgetRange}
              onValueChange={(v) =>
                setValue(
                  "budget_range",
                  v as CommissionIntakeFormInput["budget_range"],
                  { shouldDirty: true },
                )
              }
            >
              <SelectTrigger id="budget_range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUDGETS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`budget_${opt}` as "budget_under_5m")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline_preference">
            {t("field_deadline")}{" "}
            <span className="text-xs text-muted-foreground">
              ({t("optional")})
            </span>
          </Label>
          <Input
            id="deadline_preference"
            type="date"
            {...register("deadline_preference")}
          />
        </div>

        <div className="space-y-2">
          <Label>
            {t("field_references")}{" "}
            <span className="text-xs text-muted-foreground">
              ({t("references_help")})
            </span>
          </Label>
          <div className="space-y-2">
            {refUrls.map((url, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  type="url"
                  value={url}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={(e) => setRefUrlAt(idx, e.target.value)}
                />
                {refUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRefUrl(idx)}
                    aria-label={t("references_remove")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {refUrls.length < 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addRefUrl}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("references_add")}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brief_md">{t("field_brief")}</Label>
          <Textarea
            id="brief_md"
            rows={10}
            placeholder={t("field_brief_ph")}
            {...register("brief_md")}
          />
          <p className="text-xs text-muted-foreground">
            {t("field_brief_help")}
          </p>
          {errors.brief_md && (
            <p className="text-xs text-destructive">
              {errors.brief_md.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="timestamp_notes">
            {t("field_timestamps")}{" "}
            <span className="text-xs text-muted-foreground">
              ({t("optional")})
            </span>
          </Label>
          <Textarea
            id="timestamp_notes"
            rows={6}
            placeholder={t("field_timestamps_ph")}
            {...register("timestamp_notes")}
          />
          <p className="text-xs text-muted-foreground">
            {t("field_timestamps_help")}
          </p>
        </div>

        <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-end gap-3 pt-4">
          <p className="text-xs text-muted-foreground md:mr-auto">
            {t("submit_disclaimer")}
          </p>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? t("submitting") : t("submit_cta")}
          </Button>
        </div>
      </form>
    </div>
  );
}
