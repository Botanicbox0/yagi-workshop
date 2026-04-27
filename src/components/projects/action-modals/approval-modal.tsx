'use client';

// Phase 3.0 — Approval modal. Triggered when client clicks "승인" on delivered project.
// L-011: Achromatic only. L-013: Soft layered shadow on modal card.
// Calls approveProjectAction server action on submit.

import { useState, useTransition } from 'react';
import { approveProjectAction } from '@/components/projects/project-actions';
import { toast } from 'sonner';

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  locale?: 'ko' | 'en';
};

const COPY = {
  ko: {
    title: '프로젝트 승인',
    commentLabel: '코멘트 (선택 사항)',
    commentPh: '승인 의견을 남겨주세요. (선택)',
    confirm: '승인하기',
    cancel: '취소',
    successToast: '프로젝트가 승인되었습니다.',
    errorToast: '승인 처리 중 오류가 발생했습니다.',
    maxLen: '최대 500자',
  },
  en: {
    title: 'Approve project',
    commentLabel: 'Comment (optional)',
    commentPh: 'Leave an approval note. (optional)',
    confirm: 'Approve',
    cancel: 'Cancel',
    successToast: 'Project approved.',
    errorToast: 'Something went wrong. Please try again.',
    maxLen: 'Max 500 characters',
  },
} as const;

export function ApprovalModal({ projectId, open, onClose, locale = 'ko' }: Props) {
  const [comment, setComment] = useState('');
  const [isPending, startTransition] = useTransition();
  const c = COPY[locale];

  if (!open) return null;

  function handleSubmit() {
    startTransition(async () => {
      try {
        await approveProjectAction(projectId, comment.trim() || null);
        toast.success(c.successToast);
        onClose();
        setComment('');
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : String(err);
        toast.error(`${c.errorToast} (${msg})`);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal
      aria-labelledby="approval-modal-title"
    >
      {/* Modal panel — soft layered shadow, no hard border */}
      <div
        className="relative w-full max-w-md mx-4 rounded-xl bg-background px-6 py-6"
        style={{
          boxShadow:
            '0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04),0 16px 40px rgba(0,0,0,0.12)',
        }}
      >
        <h2
          id="approval-modal-title"
          className="font-suit text-2xl font-bold tracking-tight text-foreground mb-4"
        >
          {c.title}
        </h2>

        <label
          htmlFor="approval-comment"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {c.commentLabel}
        </label>
        <textarea
          id="approval-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          placeholder={c.commentPh}
          rows={4}
          disabled={isPending}
          className="w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none disabled:opacity-50"
          aria-describedby="approval-comment-hint"
        />
        <p
          id="approval-comment-hint"
          className="mt-1 text-xs text-muted-foreground text-right"
        >
          {comment.length}/500 — {c.maxLen}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded-md bg-background text-foreground border border-border/40 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            {c.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded-md bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
          >
            {isPending ? '...' : c.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
