// Phase 5 Wave C HF1_0 — Detail page loading.tsx (Next.js streaming).
//
// Mirrors the 현황 tab layout (status timeline left column + 4-card
// right column) with skeleton placeholders. Renders only while the
// adjacent page.tsx server component is awaiting its async fetches
// (project + briefing_documents + creator profile + roles).
//
// Once page.tsx resolves, Next.js streams it in and unmounts this
// fallback. The Skeleton primitive's animate-pulse rhythm fades
// naturally on unmount (no explicit transition needed — the swap
// is paint-level instant from React's perspective).
//
// 100ms-flash mitigation: Next.js loading.tsx only renders when the
// page is actually awaiting; if everything resolves synchronously,
// the user never sees this. If the data round-trip is sub-100ms,
// browsers typically skip rendering this frame entirely (paint
// scheduling). If yagi browser smoke flags a flash, escalate to
// HF1_0 loop 2: client-side wrapper with useEffect minimum-display.
//
// Layout reference:
//   L1 — breadcrumb (skeleton line)
//   L2 — status timeline (vertical, narrow column)
//   L3 — full content card row: status_card variant
//   L4 — 5-tab strip (skeleton lines)
//   L5 — current tab (현황) skeleton: status_card + brief_summary +
//        attachment_summary + comment_thread

import { Skeleton } from "@/components/project-detail/_skeleton/skeleton";

export default function DetailLoading() {
  return (
    <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
      {/* L1 breadcrumb */}
      <Skeleton variant="line" className="w-72 mb-6" />

      {/* L2 status timeline placeholder (matches Wave C C_2 vertical stepper width) */}
      <div className="mb-8">
        <Skeleton variant="card" className="h-32 max-w-md" />
      </div>

      {/* L3 hero + info-rail row (transient — replaced by C_3 brief 요약 in 현황 tab once shipped) */}
      <div className="mb-10 flex flex-col md:flex-row gap-6">
        <Skeleton variant="card" className="flex-1 h-48" />
        <Skeleton variant="card" className="md:w-[360px] h-48" />
      </div>

      {/* L4 tab strip placeholder */}
      <div className="mb-6 flex gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="line" className="w-16 h-3" />
        ))}
      </div>

      {/* L5 — 현황 tab default content (status_card + 3 right-column cards) */}
      <div className="mb-10 grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="md:row-span-4">
          <Skeleton variant="card" className="h-[420px]" />
        </div>
        <Skeleton variant="status_card" />
        <Skeleton variant="brief_summary" />
        <Skeleton variant="attachment_summary" />
        <Skeleton variant="comment_thread" />
      </div>
    </div>
  );
}
