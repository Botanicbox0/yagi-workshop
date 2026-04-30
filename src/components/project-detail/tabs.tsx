// Phase 4.x task_04 — Detail page tabs (4 tabs: 보드 / 진행 / 코멘트 / 결과물).
//
// 보드 + 진행 are active in Phase 4. 코멘트 + 결과물 are disabled
// placeholders for Phase 5+. Disabled tabs:
//   - render the same way visually (no jarring strikethrough) but with
//     muted color + cursor-not-allowed
//   - aria-disabled="true"
//   - clicking does nothing (no link, no router push)
//   - the corresponding tab content panel is just <PlaceholderTab /> --
//     enforced at page.tsx level. No server data is fetched.
//
// We use ?tab= query param so the URL is shareable + back-button-aware
// (matches the existing detail page Phase 3 convention). Server reads
// the param in page.tsx and selects the panel.
//
// Design v1.0:
// - Pretendard, font-medium for active, regular muted-foreground for
//   inactive
// - underline indicator on active (border-b-2 foreground)
// - hairline divider between tab strip and content (border-b border-border/40)
// - mobile: horizontal scroll-x on overflow

import Link from "next/link";

export type TabKey = "board" | "progress" | "comment" | "deliverable";

type Props = {
  active: TabKey;
  labels: {
    board: string;
    progress: string;
    comment: string;
    deliverable: string;
  };
};

const TAB_ORDER: { key: TabKey; disabled: boolean }[] = [
  { key: "board", disabled: false },
  { key: "progress", disabled: false },
  { key: "comment", disabled: true },
  { key: "deliverable", disabled: true },
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
