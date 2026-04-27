'use client';

// Phase 3.0 — Vertical status timeline with Supabase realtime subscription.
// Reads project_status_history ordered by transitioned_at ASC.
// L-011: Achromatic only — dots bg-foreground, connectors border-zinc-200.
// L-013: Comment cards use soft layered shadow, not hard 1px border.
// L-020: Realtime requires ALTER PUBLICATION + GRANT — done by task_01 migration.

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type HistoryRow = {
  id: string;
  project_id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  actor_role: string;
  comment: string | null;
  transitioned_at: string;
  actor_display_name?: string;
};

type Props = {
  projectId: string;
  initialRows: HistoryRow[];
};

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatAbsolute(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusTimeline({ projectId, initialRows }: Props) {
  const t = useTranslations('projects');
  const [rows, setRows] = useState<HistoryRow[]>(initialRows);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let cancelled = false;

    // Re-fetch fresh data on mount (initial rows come from SSR snapshot)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- project_status_history not yet in generated types
    const sb = supabase as any;
    void (async () => {
      const { data } = await sb
        .from('project_status_history')
        .select(
          'id, project_id, from_status, to_status, actor_id, actor_role, comment, transitioned_at'
        )
        .eq('project_id', projectId)
        .order('transitioned_at', { ascending: true })
        .limit(100);
      if (!cancelled && data) {
        setRows(data as HistoryRow[]);
      }
    })();

    // Realtime subscription — INSERT only (history is append-only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- realtime doesn't need strict table types
    const channel = (supabase as any)
      .channel(`psh:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_status_history',
          filter: `project_id=eq.${projectId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newRow = payload.new as HistoryRow;
          setRows((prev) =>
            prev.some((r) => r.id === newRow.id) ? prev : [...prev, newRow]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

  if (rows.length === 0) {
    return (
      <div className="py-8 text-sm text-muted-foreground">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {t('timeline_empty' as any)}
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-6">
        {t('timeline_label' as Parameters<typeof t>[0])}
      </p>
      <ol className="space-y-0">
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          return (
            <li key={row.id} className="relative flex gap-4">
              {/* Connector line */}
              {!isLast && (
                <span
                  className="absolute left-[7px] top-5 bottom-0 border-l border-zinc-200"
                  aria-hidden
                />
              )}

              {/* Dot */}
              <span
                className="relative mt-1 flex-shrink-0 h-3.5 w-3.5 rounded-full bg-foreground ring-2 ring-background"
                aria-hidden
              />

              {/* Content */}
              <div className="pb-8 min-w-0 flex-1">
                {/* Status label + timestamp */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {t(`status_${row.to_status}` as any)}
                  </span>
                  <span
                    className="text-xs text-muted-foreground whitespace-nowrap cursor-default"
                    title={formatAbsolute(row.transitioned_at)}
                  >
                    {formatRelative(row.transitioned_at)}
                  </span>
                </div>

                {/* Actor */}
                {(row.actor_display_name || row.actor_role) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.actor_display_name
                      ? row.actor_display_name
                      : row.actor_role === 'system'
                      ? 'System'
                      : row.actor_role === 'yagi_admin'
                      ? 'YAGI Admin'
                      : row.actor_role === 'workspace_admin'
                      ? 'Workspace Admin'
                      : 'Client'}
                  </p>
                )}

                {/* Optional comment card — soft layered shadow per L-013 */}
                {row.comment && (
                  <div
                    className="mt-2 rounded-lg px-3 py-2.5 text-xs text-zinc-700 leading-relaxed"
                    style={{
                      boxShadow:
                        '0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    {row.comment}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
