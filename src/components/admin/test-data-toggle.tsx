import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function TestDataToggle({
  baseHref,
  includeTest,
  label,
  showLabel,
  hideLabel,
}: {
  baseHref: string;
  includeTest: boolean;
  label: string;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-label",
          includeTest
            ? "border-brand/50 bg-brand-soft text-brand"
            : "border-border/70 bg-surface-raised text-muted-foreground",
        )}
      >
        {label}
      </span>
      <Link
        href={includeTest ? baseHref : `${baseHref}?includeTest=1`}
        className="inline-flex h-8 items-center rounded-full border border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground"
      >
        {includeTest ? hideLabel : showLabel}
      </Link>
    </div>
  );
}

export function TestWorkspaceBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-brand/45 bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label text-brand">
      {label}
    </span>
  );
}
