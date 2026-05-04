// Phase 5 Wave C C_1 — 브리프 (brief) tab placeholder.
//
// Full read-only Stage 1 / Stage 2 / Stage 3 view + [브리프 완성하기 →]
// CTA when status='draft' lands in C_4 (parallel sub-task). For C_1 we
// ship the empty shell so the tab is reachable via ?tab=brief and the
// route doesn't regress when the real content is dropped in.

type Props = {
  labels: {
    title: string;
    description: string;
  };
};

export function BriefTab({ labels }: Props) {
  return (
    <section className="rounded-3xl border border-border/40 p-12 bg-background flex flex-col gap-3 items-center text-center min-h-[280px] justify-center">
      <h3 className="text-base font-medium tracking-tight keep-all">
        {labels.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed keep-all max-w-md">
        {labels.description}
      </p>
    </section>
  );
}
