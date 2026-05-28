export function AppSectionPlaceholder({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="min-h-[52vh] py-12">
      <div className="max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-brand">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl keep-all">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
          {description}
        </p>
      </div>
    </section>
  );
}
