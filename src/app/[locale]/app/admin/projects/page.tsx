import { getTranslations } from 'next-intl/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ProjectsQueue } from '@/components/admin/projects-queue';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProjectsPage({ params }: Props) {
  await params; // params required by Next.js route convention
  const tAdmin = await getTranslations('admin');

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
      submitted_at,
      created_at,
      created_by,
      client:profiles!projects_created_by_fkey(id, name),
      workspace:workspaces(id, name),
      ref_count:project_references(count),
      boards:project_boards(asset_index)
    `
    )
    .in('status', ['in_review', 'in_progress', 'in_revision', 'delivered', 'approved'])
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[AdminProjectsPage] Supabase error:', error);
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
    <div className="px-10 py-12 max-w-6xl">
      {/* Header with eyebrow */}
      <div className="mb-12">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2">
          {tAdmin('label')}
        </p>
        <h1 className="font-suit text-3xl font-bold tracking-tight">
          프로젝트 관리
        </h1>
      </div>

      {/* Queue component */}
      <ProjectsQueue projects={projectRows} initialTab="in_review" />
    </div>
  );
}
