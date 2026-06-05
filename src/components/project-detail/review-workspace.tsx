import {
  GalleryVerticalEnd,
  MessageSquareText,
  MonitorPlay,
  PanelLeft,
  ShieldCheck,
} from "lucide-react";

type ReviewWorkspaceProps = {
  projectTitle: string;
  isStudioContext: boolean;
};

export function ReviewWorkspace({
  projectTitle,
  isStudioContext,
}: ReviewWorkspaceProps) {
  const copy = {
    eyebrow: "Review workspace",
    title: "Unified media review",
    subtitle:
      "Phase A shell: versions, media canvas, and comments will be wired in the next phases.",
    context: isStudioContext ? "Studio context" : "Client context",
    general: "General",
    generalSub: "Project-level thread",
    versions: "Versions",
    versionsSub: "Version rail source: project_deliverables",
    canvas: "Media canvas",
    canvasSub: "Video, image, and PDF viewers mount here.",
    comments: "Comments",
    commentsSub: "Anchored and general threads share this panel.",
    internal: "Internal",
    client: "Client",
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
      <header className="flex flex-col gap-4 border-b border-border/70 bg-surface-card px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {copy.eyebrow}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              {copy.title}
            </h2>
            <span className="max-w-full truncate text-sm text-muted-foreground">
              {projectTitle}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden />
            {copy.context}
          </span>
          {isStudioContext ? (
            <span className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-on">
              {copy.internal}
            </span>
          ) : (
            <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
              {copy.client}
            </span>
          )}
        </div>
      </header>

      <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_360px]">
        <aside className="border-b border-border/70 bg-surface-card lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <PanelLeft className="h-4 w-4" aria-hidden />
            Navigation
          </div>
          <div className="space-y-3 p-3">
            <button
              type="button"
              className="w-full rounded-lg border border-brand/40 bg-brand/10 px-3 py-3 text-left"
            >
              <span className="block text-sm font-semibold text-foreground">
                {copy.general}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {copy.generalSub}
              </span>
            </button>
            <div className="rounded-lg border border-border bg-background px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <GalleryVerticalEnd className="h-4 w-4 text-muted-foreground" aria-hidden />
                {copy.versions}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.versionsSub}
              </p>
            </div>
          </div>
        </aside>

        <main className="flex min-h-[420px] flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MonitorPlay className="h-4 w-4 text-muted-foreground" aria-hidden />
              {copy.canvas}
            </div>
            <div className="h-2 w-24 rounded-full bg-border" aria-hidden />
          </div>
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex aspect-video w-full max-w-4xl items-center justify-center rounded-lg border border-border bg-surface-card">
              <div className="max-w-sm text-center">
                <p className="text-base font-semibold text-foreground">
                  {copy.canvas}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {copy.canvasSub}
                </p>
              </div>
            </div>
          </div>
        </main>

        <aside className="border-t border-border/70 bg-surface-card lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <MessageSquareText className="h-4 w-4" aria-hidden />
            {copy.comments}
          </div>
          <div className="p-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">
                {copy.comments}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {copy.commentsSub}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
