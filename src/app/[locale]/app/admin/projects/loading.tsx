export default function AdminProjectsLoading() {
  return (
    <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-8 space-y-3">
        <div className="h-3 w-16 rounded-full bg-surface-raised" />
        <div className="h-9 w-64 rounded-md bg-surface-raised" />
        <div className="h-4 w-full max-w-xl rounded-md bg-surface-raised" />
      </div>
      <div className="mb-6 flex gap-3 border-b border-border/70 pb-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-7 w-24 rounded-full bg-surface-raised"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-surface-raised">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-6 gap-4 border-b border-border px-4 py-4 last:border-b-0"
          >
            <div className="col-span-2 h-5 rounded-md bg-surface-card" />
            <div className="h-5 rounded-md bg-surface-card" />
            <div className="h-5 rounded-md bg-surface-card" />
            <div className="h-5 rounded-md bg-surface-card" />
            <div className="h-5 rounded-md bg-surface-card" />
          </div>
        ))}
      </div>
    </main>
  );
}
