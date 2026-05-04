"use client";

// Phase 5 Wave C HF1_0 — Detail page 5-tab structure.
//
// Now a client component (was server). The "use client" was added in
// HF1_0 so the tab Link can attach an onClick handler that scrolls
// to the top of the viewport on tab switch — except for the 보드
// (board) tab, where canvas viewport is preserved per HD7 / SPEC
// §"HF1.0".
//
// Tab order per SPEC §"Scope: 5 tab 구조":
//   현황 (status) — DEFAULT, full ship in C_2/C_3
//   브리프 (brief) — read-only Stage 1/2/3 view, ships in C_4
//   보드 (board) — wraps existing brief-board-shell-client
//   코멘트 (comments) — placeholder, FU-Phase5-10
//   결과물 (deliverables) — placeholder, FU-Phase5-11
//
// Routing: ?tab= query param. Next.js Link `scroll` prop is left at
// `false` because Next.js's path-change scroll heuristic treats
// query-param-only navigation inconsistently in App Router; we drive
// the scroll explicitly via onClick to guarantee deterministic UX.
// Disabled tabs (comments / deliverables) keep the same visual rhythm
// but use cursor-not-allowed + aria-disabled and DO NOT render an
// anchor — clicks are no-ops and produce no router push.

import Link from "next/link";

export type TabKey =
  | "status"
  | "brief"
  | "board"
  | "comments"
  | "deliverables";

type Props = {
  active: TabKey;
  labels: Record<TabKey, string>;
};

const TAB_ORDER: { key: TabKey; disabled: boolean }[] = [
  { key: "status", disabled: false },
  { key: "brief", disabled: false },
  { key: "board", disabled: false },
  { key: "comments", disabled: true },
  { key: "deliverables", disabled: true },
];

// Board tab preserves canvas viewport (no scroll) per HD7. All other
// tabs scroll to top on switch so users land at the section heading
// rather than mid-page (Wave C bug: tab content changes but viewport
// stays at the previous tab's scroll offset).
function maybeScrollToTop(targetKey: TabKey) {
  if (targetKey === "board") return;
  if (typeof window === "undefined") return;
  // requestAnimationFrame defers to after Next.js Link's navigation
  // commit so the new tab's content is mounted before we scroll.
  // smooth behavior matches the 400ms motion token in
  // yagi-design-system v1.0.
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

export function DetailTabs({ active, labels }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Project detail tabs"
      className="flex items-center gap-1 border-b border-border/40 overflow-x-auto"
    >
      {TAB_ORDER.map(({ key, disabled }) => {
        const isActive = active === key;
        const baseClass =
          "px-3 py-2 text-xs uppercase tracking-[0.12em] border-b-2 -mb-px shrink-0 keep-all";
        const stateClass = disabled
          ? "border-transparent text-muted-foreground/60 cursor-not-allowed"
          : isActive
            ? "border-foreground text-foreground font-medium"
            : "border-transparent text-muted-foreground hover:text-foreground";

        if (disabled) {
          return (
            <span
              key={key}
              role="tab"
              aria-selected={false}
              aria-disabled={true}
              className={`${baseClass} ${stateClass}`}
            >
              {labels[key]}
            </span>
          );
        }

        return (
          <Link
            key={key}
            href={`?tab=${key}`}
            scroll={false}
            onClick={() => maybeScrollToTop(key)}
            role="tab"
            aria-selected={isActive}
            className={`${baseClass} ${stateClass}`}
          >
            {labels[key]}
          </Link>
        );
      })}
    </div>
  );
}
