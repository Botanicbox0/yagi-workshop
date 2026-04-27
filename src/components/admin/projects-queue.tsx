'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/projects/status-badge';
import {
  startProjectAction,
  deliverProjectAction,
  archiveProjectAction,
  cancelProjectAction
} from '@/components/projects/project-actions';
import { useRouter } from 'next/navigation';

export type ProjectStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'in_progress'
  | 'in_revision'
  | 'delivered'
  | 'approved'
  | 'cancelled'
  | 'archived';

export type ProjectQueueRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  submitted_at: string | null;
  created_at: string;
  client: { id: string; name: string } | null;
  workspace: { id: string; name: string } | null;
  ref_count: number;
};

export type ProjectsQueueProps = {
  projects: ProjectQueueRow[];
  initialTab?: ProjectStatus;
};

type TabKey = 'newly_submitted' | 'in_review' | 'in_progress' | 'in_revision' | 'delivered' | 'approved';

const TABS: Array<{ key: TabKey; status: ProjectStatus; label: string }> = [
  { key: 'newly_submitted', status: 'in_review', label: '신규 접수' },
  { key: 'in_review', status: 'in_review', label: '검토 중' },
  { key: 'in_progress', status: 'in_progress', label: '진행 중' },
  { key: 'in_revision', status: 'in_revision', label: '수정 중' },
  { key: 'delivered', status: 'delivered', label: '납품됨' },
  { key: 'approved', status: 'approved', label: '승인 완료' },
];

export function ProjectsQueue({ projects, initialTab = 'in_review' }: ProjectsQueueProps) {
  const t = useTranslations();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProjectStatus>(initialTab);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getFilteredProjects = (tabStatus: ProjectStatus): ProjectQueueRow[] => {
    return projects
      .filter(p => p.status === tabStatus)
      .sort((a, b) => {
        const aTime = new Date(a.submitted_at || a.created_at).getTime();
        const bTime = new Date(b.submitted_at || b.created_at).getTime();
        return bTime - aTime;
      });
  };

  const getTabCount = (tabStatus: ProjectStatus): number => {
    return projects.filter(p => p.status === tabStatus).length;
  };

  const filteredProjects = getFilteredProjects(activeTab);

  const handleActionClick = useCallback(async (
    e: React.MouseEvent<HTMLButtonElement>,
    projectId: string,
    action: 'start' | 'deliver' | 'archive' | 'cancel'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setLoadingId(projectId);
    try {
      if (action === 'start') {
        await startProjectAction(projectId);
      } else if (action === 'deliver') {
        await deliverProjectAction(projectId);
      } else if (action === 'archive') {
        await archiveProjectAction(projectId);
      } else if (action === 'cancel') {
        await cancelProjectAction(projectId, null);
      }
      router.refresh();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
    } finally {
      setLoadingId(null);
    }
  }, [router]);

  const getActionButtons = (project: ProjectQueueRow) => {
    const actions: Array<{ label: string; action: 'start' | 'deliver' | 'archive' | 'cancel'; variant: 'primary' | 'secondary' }> = [];

    switch (project.status) {
      case 'in_review':
        actions.push({ label: '진행 시작', action: 'start', variant: 'primary' });
        break;
      case 'in_progress':
        actions.push({ label: '납품 완료', action: 'deliver', variant: 'primary' });
        break;
      case 'in_revision':
        actions.push({ label: '재시작', action: 'start', variant: 'primary' });
        break;
      case 'delivered':
        return <span className="text-xs text-zinc-400">대기 중</span>;
      case 'approved':
        actions.push({ label: '아카이브', action: 'archive', variant: 'primary' });
        break;
      case 'draft':
      case 'submitted':
      case 'cancelled':
      case 'archived':
        return null;
    }

    return (
      <div className="flex items-center gap-2">
        {actions.map(({ label, action, variant }) => (
          <button
            key={action}
            onClick={(e) => handleActionClick(e, project.id, action)}
            disabled={loadingId === project.id}
            className={cn(
              'text-xs font-medium px-3 py-1 rounded-md transition-colors',
              variant === 'primary'
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-background text-foreground border border-border/40 hover:bg-zinc-50'
            )}
          >
            {loadingId === project.id ? '처리 중...' : label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Tab strip */}
      <div className="flex gap-6 border-b border-border mb-6">
        {TABS.map(({ key, status, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(status)}
            className={cn(
              'pb-3 text-sm font-medium transition-colors relative',
              activeTab === status
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
            <span className="ml-2 inline-flex items-center justify-center bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5 text-xs font-semibold">
              {getTabCount(status)}
            </span>
            {activeTab === status && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('projects.admin.queue.empty')}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}` as `/app/projects/${string}`}
              className="block p-4 rounded-lg border border-border/40 hover:bg-zinc-50 transition-colors divide-y divide-border/40"
            >
              <div className="flex items-start justify-between pb-3">
                <div className="flex-1">
                  <h3 className="font-suit font-semibold text-sm text-foreground mb-1">
                    {project.title}
                  </h3>
                  <p className="text-sm text-zinc-600 mb-0.5">{project.client?.name}</p>
                  <p className="text-xs text-zinc-500">{project.workspace?.name}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <StatusBadge status={project.status} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {new Intl.DateTimeFormat('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(project.submitted_at || project.created_at))}
                  </span>
                  <span>참고: {project.ref_count}</span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  {getActionButtons(project)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
