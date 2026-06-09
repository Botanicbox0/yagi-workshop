'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
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
  workspace: {
    id: string;
    name: string;
    kind: 'brand' | 'artist' | 'creator' | string;
    isTest?: boolean;
  } | null;
  deliverable_count: number;
};

export type ProjectsQueueProps = {
  projects: ProjectQueueRow[];
  initialTab?: TabKey;
};

export type TabKey =
  | 'all'
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'in_progress'
  | 'in_revision'
  | 'delivered'
  | 'approved'
  | 'cancelled'
  | 'archived';

const TABS: Array<{ key: TabKey; status: ProjectStatus | null; label: string }> = [
  { key: 'all', status: null, label: 'all' },
  { key: 'submitted', status: 'submitted', label: 'submitted' },
  { key: 'in_review', status: 'in_review', label: 'in_review' },
  { key: 'in_progress', status: 'in_progress', label: 'in_progress' },
  { key: 'in_revision', status: 'in_revision', label: 'in_revision' },
  { key: 'delivered', status: 'delivered', label: 'delivered' },
  { key: 'approved', status: 'approved', label: 'approved' },
  { key: 'cancelled', status: 'cancelled', label: 'cancelled' },
  { key: 'draft', status: 'draft', label: 'draft' },
  { key: 'archived', status: 'archived', label: 'archived' },
];

const STATUS_PRIORITY: Record<ProjectStatus, number> = {
  submitted: 0,
  in_review: 1,
  in_progress: 2,
  in_revision: 3,
  delivered: 4,
  approved: 5,
  draft: 6,
  cancelled: 7,
  archived: 8,
};

type KindFilter = 'all' | 'brand' | 'artist' | 'creator';

const KIND_FILTERS: Array<{ key: KindFilter; labelKey: string }> = [
  { key: 'all', labelKey: 'admin.projects.queue.tabs.all' },
  { key: 'brand', labelKey: 'admin.projects.queue.workspace_kind.brand' },
  { key: 'artist', labelKey: 'admin.projects.queue.workspace_kind.artist' },
  { key: 'creator', labelKey: 'admin.projects.queue.workspace_kind.creator' },
];

export function ProjectsQueue({ projects, initialTab = 'all' }: ProjectsQueueProps) {
  const t = useTranslations();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [activeKind, setActiveKind] = useState<KindFilter>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const visibleProjects = useMemo(() => {
    return projects
      .filter(
        (p) =>
          (activeTab === 'all' || p.status === activeTab) &&
          (activeKind === 'all' || p.workspace?.kind === activeKind),
      )
      .sort((a, b) => {
        const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
        if (statusDiff !== 0) return statusDiff;
        const aTime = new Date(a.submitted_at || a.created_at).getTime();
        const bTime = new Date(b.submitted_at || b.created_at).getTime();
        return bTime - aTime;
      });
  }, [activeTab, activeKind, projects]);

  const getTabCount = (tabStatus: ProjectStatus | null): number => {
    const scoped = projects.filter(
      (p) => activeKind === 'all' || p.workspace?.kind === activeKind,
    );
    if (!tabStatus) return scoped.length;
    return scoped.filter((p) => p.status === tabStatus).length;
  };

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

  const openProject = useCallback((projectId: string) => {
    router.push(`/app/projects/${projectId}` as `/app/projects/${string}`);
  }, [router]);

  const handleRowKeyDown = useCallback((
    event: KeyboardEvent<HTMLTableRowElement>,
    projectId: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProject(projectId);
    }
  }, [openProject]);

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
      {/* Workspace-kind filter — 전체 / BRAND / ARTIST / CREATOR */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {KIND_FILTERS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveKind(key)}
            aria-pressed={activeKind === key}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-label transition-colors',
              activeKind === key
                ? 'border-brand bg-brand text-brand-on'
                : 'border-border/70 bg-surface-raised text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            {t(labelKey as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {/* Tab strip */}
      <div className="mb-6 flex gap-x-6 overflow-x-auto border-b border-border/70">
        {TABS.map(({ key, status, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'relative whitespace-nowrap pb-3 text-sm font-medium transition-colors',
              activeTab === key
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`admin.projects.queue.tabs.${label}` as Parameters<typeof t>[0])}
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-surface-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {getTabCount(status)}
            </span>
            {activeTab === key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div>
        {visibleProjects.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('admin.projects.queue.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface-raised">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-border bg-surface-card/70 text-xs uppercase tracking-label text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    {t('admin.projects.queue.col_project')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    {t('admin.projects.queue.col_workspace')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    {t('admin.projects.queue.col_status')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    {t('admin.projects.queue.col_requested_at')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    {t('admin.projects.queue.col_deliverables')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    {t('admin.projects.queue.col_actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleProjects.map((project) => (
                  <tr
                    key={project.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => openProject(project.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, project.id)}
                    className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                  >
                    <td className="px-4 py-4 align-middle">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
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
                        <span className="font-semibold text-foreground keep-all">
                          {project.title}
                        </span>
                        {project.client?.name && (
                          <span className="text-xs text-muted-foreground">
                            {project.client.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground keep-all">
                          {project.workspace?.name ?? '-'}
                        </span>
                        {project.workspace?.kind && (
                          <span className="w-fit rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
                            {t(
                              `admin.projects.queue.workspace_kind.${project.workspace.kind}` as Parameters<
                                typeof t
                              >[0],
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-4 align-middle text-xs tabular-nums text-muted-foreground">
                      {project.dateLabel}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-foreground">
                      {t('admin.projects.queue.deliverables', {
                        count: project.deliverable_count,
                      })}
                    </td>
                    <td
                      className="px-4 py-4 align-middle"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {getActionButtons(project)}
                        <Link
                          href={`/app/projects/${project.id}` as `/app/projects/${string}`}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-semibold text-foreground transition-colors hover:border-brand/50 hover:text-brand"
                        >
                          {t('admin.projects.queue.action_open')}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
