'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/projects/status-badge';
import { TestWorkspaceBadge } from '@/components/admin/test-data-toggle';
import {
  acceptProjectAction,
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
  project_type: string;
  status: ProjectStatus;
  submitted_at: string | null;
  created_at: string;
  dateLabel: string;
  client: { id: string; name: string } | null;
  workspace: { id: string; name: string; isTest?: boolean } | null;
  ref_count: number;
};

export type ProjectsQueueProps = {
  projects: ProjectQueueRow[];
  initialTab?: ProjectStatus;
};

type TabKey =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'in_progress'
  | 'in_revision'
  | 'delivered'
  | 'approved';

const TABS: Array<{ key: TabKey; status: ProjectStatus; label: string }> = [
  { key: 'submitted', status: 'submitted', label: 'submitted' },
  { key: 'draft', status: 'draft', label: 'draft' },
  { key: 'in_review', status: 'in_review', label: 'in_review' },
  { key: 'in_progress', status: 'in_progress', label: 'in_progress' },
  { key: 'in_revision', status: 'in_revision', label: 'in_revision' },
  { key: 'delivered', status: 'delivered', label: 'delivered' },
  { key: 'approved', status: 'approved', label: 'approved' },
];

export function ProjectsQueue({ projects, initialTab = 'submitted' }: ProjectsQueueProps) {
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
    action: 'accept' | 'start' | 'deliver' | 'archive' | 'cancel'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setLoadingId(projectId);
    try {
      if (action === 'accept') {
        await acceptProjectAction(projectId);
      } else if (action === 'start') {
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
    const actions: Array<{ label: string; action: 'accept' | 'start' | 'deliver' | 'archive' | 'cancel'; variant: 'primary' | 'secondary' }> = [];

    switch (project.status) {
      case 'submitted':
        actions.push({
          label: t('admin.projects.queue.action_accept'),
          action: 'accept',
          variant: 'primary',
        });
        break;
      case 'in_review':
        actions.push({
          label: t('admin.projects.queue.action_start'),
          action: 'start',
          variant: 'primary',
        });
        break;
      case 'in_progress':
        actions.push({
          label: t('admin.projects.queue.action_deliver'),
          action: 'deliver',
          variant: 'primary',
        });
        break;
      case 'in_revision':
        actions.push({
          label: t('admin.projects.queue.action_restart'),
          action: 'start',
          variant: 'primary',
        });
        break;
      case 'delivered':
        return (
          <span className="text-xs text-muted-foreground">
            {t('admin.projects.queue.waiting')}
          </span>
        );
      case 'approved':
        actions.push({
          label: t('admin.projects.queue.action_archive'),
          action: 'archive',
          variant: 'primary',
        });
        break;
      case 'draft':
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
                ? 'bg-brand text-brand-on hover:bg-brand/90'
                : 'bg-background text-foreground border border-border/70 hover:bg-accent'
            )}
          >
            {loadingId === project.id
              ? t('admin.projects.queue.processing')
              : label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-6 flex gap-3 overflow-x-auto border-b border-border/70">
        {TABS.map(({ key, status, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(status)}
            className={cn(
              'relative whitespace-nowrap pb-3 text-sm font-medium transition-colors',
              activeTab === status
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`admin.projects.queue.tabs.${label}` as Parameters<typeof t>[0])}
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-surface-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {getTabCount(status)}
            </span>
            {activeTab === status && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('admin.projects.queue.empty')}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}` as `/app/projects/${string}`}
              className="block divide-y divide-border/70 rounded-lg border border-border/70 bg-surface-raised p-4 transition-colors hover:border-brand/40"
            >
              <div className="flex items-start justify-between pb-3">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {t(
                        `admin.projects.queue.project_type.${project.project_type}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </span>
                    {project.workspace?.isTest && (
                      <TestWorkspaceBadge label={t('admin.test_badge')} />
                    )}
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">
                    {project.title}
                  </h3>
                  <p className="mb-0.5 text-sm text-muted-foreground">
                    {project.client?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {project.workspace?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <StatusBadge status={project.status} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {project.dateLabel}
                  </span>
                  <span>
                    {t('admin.projects.queue.references', {
                      count: project.ref_count,
                    })}
                  </span>
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
