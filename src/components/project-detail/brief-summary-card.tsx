// =============================================================================
// Phase 5 Wave C C_3 — Brief 요약 카드 (현황 tab middle).
//
// 3-line preview per SPEC §"Brief 요약 카드":
//   - Project name (heading)
//   - deliverable_types (chips)
//   - description first 80 chars (truncate, multibyte-safe)
//   - "전체 브리프 보기 →" link → ?tab=brief (same-page tab switch)
//
// Server component — no client interaction.

import Link from "next/link";

type Props = {
  projectId: string;
  locale: string;
  title: string;
  deliverableTypes: string[];
  description: string | null;
  labels: {
    deliverable_types: string;
    description: string;
    view_all: string;
    cta_brief: string;
    deliverable_options: Record<string, string>;
  };
};

// Multibyte-safe truncate using Intl.Segmenter when available, falling
// back to Array.from for grapheme-aware iteration.
function truncate80(text: string): string {
  if (!text) return "";
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(text));
    if (segments.length <= 80) return text;
    return segments.slice(0, 80).map((s) => s.segment).join("") + "…";
  }
  const chars = Array.from(text);
  if (chars.length <= 80) return text;
  return chars.slice(0, 80).join("") + "…";
}

export function BriefSummaryCard({
  projectId: _projectId,
  locale: _locale,
  title,
  deliverableTypes,
  description,
  labels,
}: Props) {
  void _projectId;
  void _locale;
  return (
    <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-4">
      <h3 className="text-base font-semibold tracking-tight keep-all">
        {title}
      </h3>

      {deliverableTypes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
            {labels.deliverable_types}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {deliverableTypes.map((kind) => (
              <span
                key={kind}
                className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground/80 keep-all"
              >
                {labels.deliverable_options[kind] ?? kind}
              </span>
            ))}
          </div>
        </div>
      )}

      {description && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
            {labels.description}
          </span>
          <p className="text-sm text-foreground/80 leading-relaxed keep-all">
            {truncate80(description)}
          </p>
        </div>
      )}

      <div className="pt-1">
        <Link
          href="?tab=brief"
          scroll={false}
          className="text-xs font-medium text-foreground/70 underline-offset-4 hover:underline transition-colors keep-all"
        >
          {labels.cta_brief}
        </Link>
      </div>
    </section>
  );
}
