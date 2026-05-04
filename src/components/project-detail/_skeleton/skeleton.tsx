// Phase 5 Wave C HF1_0 — Generic skeleton primitive for detail page.
//
// Single component, variant-driven. Matches the four 현황 tab cards
// (status / brief summary / attachment summary / comment thread) +
// generic "card" / "line" shapes for fallback uses.
//
// Design tokens (yagi-design-system v1.0):
//   - bg-muted/30 + border-border/30 for subtle filling
//   - rounded-3xl (24px) on card-shaped variants
//   - rounded-full (999) on dot/pill shapes
//   - animate-pulse for the loading rhythm
//   - transition-opacity for the fade-in handoff (page.tsx renders the
//     real content inside a sibling <div> with the same dimensions; the
//     loading.tsx → page.tsx swap is handled by Next.js streaming SSR,
//     so each skeleton only needs the calm pulse).
//
// Server component — no client interaction.

import { cn } from "@/lib/utils";

export type SkeletonVariant =
  | "status_card"
  | "brief_summary"
  | "attachment_summary"
  | "comment_thread"
  | "card"
  | "line";

type Props = {
  variant?: SkeletonVariant;
  className?: string;
};

export function Skeleton({ variant = "card", className }: Props) {
  if (variant === "line") {
    return (
      <div
        className={cn(
          "h-3 rounded-full bg-muted/30 animate-pulse",
          className,
        )}
      />
    );
  }

  if (variant === "status_card") {
    return (
      <section
        aria-busy="true"
        className={cn(
          "rounded-3xl border border-border/30 p-6 lg:p-8 bg-background",
          "flex flex-col gap-4 animate-pulse",
          className,
        )}
      >
        {/* status pill placeholder */}
        <div className="h-5 w-20 rounded-full bg-muted/30" />
        {/* heading line */}
        <div className="h-5 w-64 rounded-full bg-muted/30" />
        {/* body line */}
        <div className="h-3 w-80 rounded-full bg-muted/30" />
        {/* meta rows */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="h-3 w-72 rounded-full bg-muted/30" />
          <div className="h-3 w-72 rounded-full bg-muted/30" />
          <div className="h-3 w-60 rounded-full bg-muted/30" />
        </div>
        {/* dual CTA */}
        <div className="flex gap-2 mt-2">
          <div className="h-9 w-36 rounded-full bg-muted/30" />
          <div className="h-9 w-32 rounded-full bg-muted/30" />
        </div>
      </section>
    );
  }

  if (variant === "brief_summary") {
    return (
      <section
        aria-busy="true"
        className={cn(
          "rounded-3xl border border-border/30 p-6 lg:p-8 bg-background",
          "flex flex-col gap-3 animate-pulse",
          className,
        )}
      >
        {/* title line */}
        <div className="h-4 w-48 rounded-full bg-muted/30" />
        {/* chip row */}
        <div className="flex flex-wrap gap-1.5">
          <div className="h-5 w-20 rounded-full bg-muted/30" />
          <div className="h-5 w-16 rounded-full bg-muted/30" />
          <div className="h-5 w-24 rounded-full bg-muted/30" />
        </div>
        {/* description line */}
        <div className="h-3 w-full max-w-md rounded-full bg-muted/30 mt-1" />
        {/* CTA */}
        <div className="h-3 w-32 rounded-full bg-muted/30 mt-1" />
      </section>
    );
  }

  if (variant === "attachment_summary") {
    return (
      <section
        aria-busy="true"
        className={cn(
          "rounded-3xl border border-border/30 p-6 lg:p-8 bg-background",
          "flex flex-col gap-3 animate-pulse",
          className,
        )}
      >
        {/* heading + count */}
        <div className="h-3 w-24 rounded-full bg-muted/30" />
        <div className="h-3 w-48 rounded-full bg-muted/30" />
        {/* thumbnail strip */}
        <div className="flex gap-2 mt-1">
          <div className="h-16 w-[110px] rounded-lg bg-muted/30" />
          <div className="h-16 w-[110px] rounded-lg bg-muted/30" />
          <div className="h-16 w-[110px] rounded-lg bg-muted/30" />
        </div>
        {/* CTA */}
        <div className="h-3 w-32 rounded-full bg-muted/30 mt-1" />
      </section>
    );
  }

  if (variant === "comment_thread") {
    return (
      <section
        aria-busy="true"
        className={cn(
          "rounded-3xl border border-border/30 p-6 lg:p-8 bg-background",
          "flex flex-col gap-3 animate-pulse",
          className,
        )}
      >
        <div className="h-3 w-24 rounded-full bg-muted/30" />
        <div className="h-3 w-72 rounded-full bg-muted/30" />
      </section>
    );
  }

  // generic card
  return (
    <section
      aria-busy="true"
      className={cn(
        "rounded-3xl border border-border/30 p-6 bg-background animate-pulse",
        className,
      )}
    >
      <div className="h-4 w-32 rounded-full bg-muted/30" />
    </section>
  );
}
