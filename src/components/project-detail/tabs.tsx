// Phase 5 Wave C C_1 — Detail page 5-tab structure.
//
// Tab order per SPEC §"Scope: 5 tab 구조":
//   현황 (status) — DEFAULT, full ship in C_2/C_3 (timeline + CTA + brief
//     summary + attachment summary + comments thread placeholder)
//   브리프 (brief) — read-only Stage 1/2/3 view, ships in C_4
//   보드 (board) — wraps existing brief-board-shell-client, no change to
//     the wrapped component (board-tab.tsx already imports it)
//   코멘트 (comments) — placeholder, lands in FU-Phase5-10
//   결과물 (deliverables) — placeholder, lands in FU-Phase5-11
//
// Phase 4.x's "progress" (status history) tab is removed. Its surface
// moves into the 현황 timeline (C_2) and recent activity feed (C_3 +
// FU-Phase5-10 thread).
//
// Routing convention preserved from Phase 4.x: ?tab= query param so
// URLs are shareable and back-button-aware.
//
// Visual: Pretendard medium for active, muted-foreground for inactive,
// border-b-2 underline on active, hairline divider on the strip itself.
// Disabled placeholder tabs (comments / deliverables) keep the same
// visual rhythm but use cursor-not-allowed + aria-disabled and DO NOT
// render an anchor — clicks are no-ops and produce no router push.

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
