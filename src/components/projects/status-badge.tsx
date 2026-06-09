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
        return 'bg-surface-card text-muted-foreground';
      case 'submitted':
        return 'border border-edge-subtle bg-transparent text-foreground/85';
      case 'in_review':
        return 'bg-brand-soft text-brand-ink';
      case 'in_progress':
        return 'bg-foreground text-background';
      case 'in_revision':
        return 'bg-warning text-warning-foreground';
      case 'delivered':
        return 'bg-info text-info-foreground';
      case 'approved':
        return 'bg-success text-success-foreground';
      case 'cancelled':
        return 'bg-muted text-muted-foreground line-through';
      case 'archived':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-surface-card text-muted-foreground';
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
