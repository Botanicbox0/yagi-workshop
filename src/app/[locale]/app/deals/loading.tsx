import { Skeleton } from "@/components/ui/skeleton";

export default function DealsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <Skeleton className="h-4 w-24 bg-surface-card" />
        <Skeleton className="mt-5 h-12 w-full max-w-xl bg-surface-card" />
        <Skeleton className="mt-4 h-5 w-full max-w-2xl bg-surface-card" />
      </section>
      <section className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6"
          >
            <Skeleton className="h-6 w-36 bg-surface-card" />
            <Skeleton className="mt-4 h-7 w-64 bg-surface-card" />
            <Skeleton className="mt-4 h-6 w-80 bg-surface-card" />
          </div>
        ))}
      </section>
    </main>
  );
}
