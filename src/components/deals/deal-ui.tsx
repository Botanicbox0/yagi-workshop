import { cn } from "@/lib/utils";
import { getDealStatusTone } from "@/lib/deals/constants";

export function DealStatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const tone = getDealStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded px-2 text-[11px] font-medium uppercase tracking-label",
        tone === "pending" && "bg-gold-soft text-gold",
        tone === "neutral" && "bg-surface-card text-muted-foreground",
        tone === "done" && "bg-emerald-500/15 text-emerald-300",
        tone === "negative" && "bg-brand-soft text-brand",
      )}
    >
      {label}
    </span>
  );
}

export function UsageChips({
  usageTypes,
  labels,
}: {
  usageTypes: string[];
  labels: Record<string, string>;
}) {
  if (usageTypes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {usageTypes.map((type) => (
        <span
          key={type}
          className="inline-flex h-6 items-center rounded border border-border/70 bg-surface-card px-2 text-xs text-muted-foreground"
        >
          {labels[type] ?? type}
        </span>
      ))}
    </div>
  );
}

export function formatMoney(
  amount: number | null | undefined,
  locale: string,
  currency = "KRW",
) {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(amount);
}

export function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
