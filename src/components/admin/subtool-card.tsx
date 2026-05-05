// Phase 7 Hotfix-4 — Admin dashboard sub-tools grid card.
// Each card links to a yagi_admin sub-tool; design system v1.0 (radius 24,
// no shadow, sage on hover via accent layer).

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function SubtoolCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-border bg-card p-5 transition-colors hover:bg-accent/50 hover:border-foreground/20"
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground mt-0.5 shrink-0 transition-colors" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1 keep-all">{title}</h3>
          <p className="text-xs text-muted-foreground keep-all leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
