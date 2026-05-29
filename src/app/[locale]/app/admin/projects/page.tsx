import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Plus } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ProjectsQueue } from "@/components/admin/projects-queue";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProjectsPage({ params }: Props) {
  const { locale } = await params;
  const tAdmin = await getTranslations({ locale, namespace: "admin" });

  const supabase = await createSupabaseServer();

  // Fetch all projects with their related data.
  // Phase 3.1 task_07: extend SELECT to also pull project_boards.asset_index
  // for the asset-count indicator. Field is JSONB array; length used as count.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 project_boards not in generated types
  const sb = supabase as any;
  const { data: projects, error } = await sb
    .from('projects')
    .select(
      `
      id,
      title,
      status,
      project_type,
      submitted_at,
      created_at,
      created_by,
      client:profiles!projects_created_by_fkey(id, name),
      workspace:workspaces(id, name),
      ref_count:project_references(count),
      boards:project_boards(asset_index)
    `
    )
    .in("status", ["draft", "in_review", "in_progress", "in_revision", "delivered", "approved"])
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[AdminProjectsPage] Supabase error:", error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Database query result typing
  const projectRows = (projects ?? []).map((p: any) => {
    // Resolve asset count from project_boards.asset_index (preferred);
    // fall back to legacy project_references count if board is empty/missing.
    const boardRow = Array.isArray(p.boards) ? p.boards[0] : p.boards;
    const boardAssetCount =
      boardRow && Array.isArray(boardRow.asset_index)
        ? boardRow.asset_index.length
        : 0;
    const legacyRefCount = Array.isArray(p.ref_count) ? p.ref_count.length : 0;
    const ref_count = boardAssetCount > 0 ? boardAssetCount : legacyRefCount;
    return {
      id: p.id,
      title: p.title,
      project_type: p.project_type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic status type from database
      status: p.status as any,
      submitted_at: p.submitted_at,
      created_at: p.created_at,
      client: p.client ? { id: p.client.id, name: p.client.name } : null,
      workspace: p.workspace ? { id: p.workspace.id, name: p.workspace.name } : null,
      ref_count,
    };
  });

  return (
    <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-label text-brand">
            {tAdmin("label")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground keep-all sm:text-4xl">
            {tAdmin("projects.queue_title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
            {tAdmin("projects.queue_description")}
          </p>
        </div>
        <Link
          href="/app/admin/projects/curated/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-on transition-colors hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {tAdmin("projects.curated_new_cta")}
        </Link>
      </div>

      <ProjectsQueue projects={projectRows} initialTab="draft" />
    </main>
  );
}
