// Phase 4.x task_05 — Dashboard count cards (3 cards: total / in-progress / delivered).
//
// Server component. Receives pre-counted values from page.tsx (count
// queries scoped to active workspace via workspace_members RLS).
//
// Design v1.0:
// - radius 24 + border-border/40 + zero shadow
// - Pretendard, achromatic; no sage accent on counts (numbers should
//   read as data, not status)
// - mobile (<sm): vertical stack via flex-col

type Props = {
  total: number;
  inProgress: number;
  delivered: number;
  labels: {
    total: string;
    inProgress: string;
    delivered: string;
  };
};

export function CountCards({ total, inProgress, delivered, labels }: Props) {
  const items: { label: string; value: number }[] = [
    { label: labels.total, value: total },
    { label: labels.inProgress, value: inProgress },
    { label: labels.delivered, value: delivered },
  ];
  return (
    <ul
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      role="list"
    >
      {items.map((it) => (
        <li
          key={it.label}
          className="rounded-3xl border border-border/40 px-6 py-7"
        >
          <p className="text-xs uppercase tracking-[0.10em] text-muted-foreground keep-all">
            {it.label}
          </p>
          <p
            className="mt-2 font-semibold text-foreground"
            style={{ fontSize: "32px", lineHeight: 1.1, letterSpacing: "-0.02em" }}
          >
            {it.value}
          </p>
        </li>
      ))}
    </ul>
  );
}
