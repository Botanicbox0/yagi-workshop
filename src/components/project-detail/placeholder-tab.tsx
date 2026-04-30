// Phase 4.x task_04 — Placeholder tab for the disabled 코멘트 / 결과물 tabs.
//
// Renders a calm, achromatic placeholder. Critical: this component must
// NOT fetch any project data. The disabled tabs sit on `tabs.tsx` and
// route to this component as a safety net — even if a router accident
// brings a viewer here, the tab content is purely static text.
//
// Design v1.0 compliance:
// - Pretendard via inherited font stack
// - achromatic + sage accent unused (placeholder is neutral)
// - radius 24 on the surrounding card
// - zero shadow

type Props = {
  title: string;
  description: string;
};

export function PlaceholderTab({ title, description }: Props) {
  return (
    <div
      className="border border-border/40 rounded-3xl p-12 md:p-16 text-center"
      role="region"
      aria-label={title}
    >
      <h3 className="text-base font-medium text-foreground keep-all">
        {title}
      </h3>
      <p className="mt-3 text-sm text-muted-foreground keep-all max-w-md mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}
