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

  // Fetch all projects with their related data
  const { data: projects, error } = await supabase
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
      ref_count:project_references(count)
    `
    )
    .in('status', ['in_review', 'in_progress', 'in_revision', 'delivered', 'approved'])
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[AdminProjectsPage] Supabase error:', error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Database query result typing
  const projectRows = (projects ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic status type from database
    status: p.status as any,
    submitted_at: p.submitted_at,
    created_at: p.created_at,
    client: p.client ? { id: p.client.id, name: p.client.name } : null,
    workspace: p.workspace ? { id: p.workspace.id, name: p.workspace.name } : null,
    ref_count: Array.isArray(p.ref_count) ? p.ref_count.length : 0,
  }));

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
