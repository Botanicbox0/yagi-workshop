"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { createDealAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEAL_USAGE_TYPES, type DealUsageType } from "@/lib/deals/constants";
import { cn } from "@/lib/utils";

type Props = {
  personaId: string;
};

export function DealProposalForm({ personaId }: Props) {
  const t = useTranslations("discover.proposal");
  const tUsage = useTranslations("deal_usage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [usageTypes, setUsageTypes] = useState<DealUsageType[]>([]);
  const [brief, setBrief] = useState("");
  const [proposedBudget, setProposedBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canSubmit = usageTypes.length > 0 && !isPending;

  const formattedBudget = useMemo(() => {
    const value = Number(proposedBudget);
    if (!proposedBudget || Number.isNaN(value)) return null;
    return new Intl.NumberFormat("ko-KR").format(value);
  }, [proposedBudget]);

  function toggleUsage(type: DealUsageType) {
    setError(null);
    setUsageTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  function submit(formData: FormData) {
    setError(null);
    if (usageTypes.length === 0) {
      setError(t("error_usage"));
      return;
    }

    const rawBudget = String(formData.get("proposedBudget") ?? "").trim();
    const numericBudget = rawBudget.length > 0 ? Number(rawBudget) : null;
    if (numericBudget !== null && (!Number.isFinite(numericBudget) || numericBudget < 0)) {
      setError(t("error_budget"));
      return;
    }

    startTransition(async () => {
      const result = await createDealAction({
        personaId,
        usageTypes,
        brief: String(formData.get("brief") ?? ""),
        proposedBudget: numericBudget,
      });

      if (!result.ok) {
        setError(t(`server_error.${result.error}`));
        return;
      }

      toast.success(t("success"));
      router.push("/app/deals");
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
          {t("usage_label")}
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEAL_USAGE_TYPES.map((type) => {
            const checked = usageTypes.includes(type);
            return (
              <label
                key={type}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors",
                  checked
                    ? "border-brand bg-brand-soft text-foreground"
                    : "border-border/70 bg-surface-card text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleUsage(type)}
                  aria-label={tUsage(type)}
                />
                <span className="keep-all">{tUsage(type)}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="deal-brief"
          className="text-xs font-semibold uppercase tracking-label text-muted-foreground"
        >
          {t("brief_label")}
        </Label>
        <Textarea
          id="deal-brief"
          name="brief"
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder={t("brief_placeholder")}
          maxLength={1000}
          className="min-h-36 resize-y bg-surface-card"
        />
        <p className="text-right text-xs text-muted-foreground">
          {brief.length}/1000
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="deal-budget"
          className="text-xs font-semibold uppercase tracking-label text-muted-foreground"
        >
          {t("budget_label")}
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₩
          </span>
          <Input
            id="deal-budget"
            name="proposedBudget"
            inputMode="numeric"
            min={0}
            step={10000}
            value={proposedBudget}
            onChange={(event) => setProposedBudget(event.target.value)}
            placeholder={t("budget_placeholder")}
            className="h-11 bg-surface-card pl-8"
          />
        </div>
        {formattedBudget && (
          <p className="text-xs text-muted-foreground">₩{formattedBudget}</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive keep-all">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        className="h-12 w-full rounded-full bg-brand text-brand-on hover:bg-brand/90"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
