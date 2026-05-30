import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverLoading() {
  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <Skeleton className="h-4 w-32 bg-surface-card" />
        <Skeleton className="mt-5 h-12 w-full max-w-xl bg-surface-card" />
        <Skeleton className="mt-4 h-5 w-full max-w-2xl bg-surface-card" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-border/70 bg-surface-card"
          >
            <Skeleton className="aspect-video rounded-none bg-surface-card-deep" />
            <div className="space-y-4 p-5">
              <Skeleton className="h-5 w-24 bg-surface-card" />
              <Skeleton className="h-7 w-2/3 bg-surface-card" />
              <Skeleton className="h-12 w-full bg-surface-card" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
