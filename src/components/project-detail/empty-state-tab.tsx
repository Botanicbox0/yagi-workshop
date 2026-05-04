// Phase 5 Wave C C_5 — EmptyStateTab: replaces PlaceholderTab for the
// 코멘트 and 결과물 tabs. Rendered as a styled coming-soon card with a
// sage-muted Lucide icon, heading, and sub-text.
//
// Design compliance (yagi-design-system v1.0):
//   - White bg, zero shadow
//   - rounded-3xl (24px) border border-border/40
//   - Sage icon: #71D083 at low opacity (muted foreground — not a fill)
//   - No warm tones, no extra accent colors
//   - keep-all on Korean text

import { type LucideIcon } from "lucide-react";

type Props = {
  heading: string;
  subtext: string;
  Icon?: LucideIcon;
};

export function EmptyStateTab({ heading, subtext, Icon }: Props) {
  return (
    <div
      className="border border-border/40 rounded-3xl p-12 min-h-[280px] flex flex-col items-center justify-center text-center"
      role="region"
      aria-label={heading}
    >
      {Icon && (
        <Icon
          className="mb-5 text-muted-foreground/40"
          size={32}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      )}
      <h3 className="text-base font-medium text-foreground keep-all">
        {heading}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground keep-all max-w-sm leading-relaxed">
        {subtext}
      </p>
    </div>
  );
}
