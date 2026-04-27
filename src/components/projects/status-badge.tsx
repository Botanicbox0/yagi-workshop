import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export type Status =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'in_progress'
  | 'in_revision'
  | 'delivered'
  | 'approved'
  | 'cancelled'
  | 'archived';

export interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations();

  const getStatusStyles = (s: Status): string => {
    switch (s) {
      case 'draft':
        return 'bg-zinc-100 text-zinc-600';
      case 'submitted':
        return 'bg-zinc-100 text-zinc-700';
      case 'in_review':
        return 'bg-zinc-200 text-zinc-800';
      case 'in_progress':
        return 'bg-zinc-900 text-white';
      case 'in_revision':
        return 'bg-zinc-200 text-zinc-700 border border-dashed border-zinc-400';
      case 'delivered':
        return 'bg-zinc-800 text-white';
      case 'approved':
        return 'bg-foreground text-background ring-2 ring-foreground';
      case 'cancelled':
        return 'bg-zinc-50 text-zinc-400 line-through';
      case 'archived':
        return 'bg-zinc-50 text-zinc-400';
      default:
        return 'bg-zinc-100 text-zinc-600';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium tracking-tight',
        getStatusStyles(status)
      )}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic i18n key */}
      {t(`projects.status_${status}` as any)}
    </span>
  );
}
