type Props = {
  openAt: string | null;
  closeAt: string | null;
  announceAt: string | null;
};

function formatKoreanDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateStr));
}

export function TimelineDisplay({ openAt, closeAt, announceAt }: Props) {
  const rows: { label: string; value: string }[] = [
    { label: "시작", value: formatKoreanDate(openAt) },
    { label: "마감", value: formatKoreanDate(closeAt) },
    { label: "발표", value: formatKoreanDate(announceAt) },
  ];

  return (
    <div className="rounded-lg border border-border divide-y divide-border">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground w-12">
            {label}
          </span>
          <span className="text-sm text-foreground text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}
