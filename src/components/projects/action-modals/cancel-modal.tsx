'use client';

// Phase 3.0 — Cancel modal.
// Optional comment + explicit second-button confirmation.
// L-011: Achromatic. L-013: Soft layered shadow.

import { useState, useTransition } from 'react';
import { cancelProjectAction } from '@/components/projects/project-actions';
import { toast } from 'sonner';

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  locale?: 'ko' | 'en';
};

const COPY = {
  ko: {
    title: '프로젝트 취소',
    confirm_prompt: '정말 취소하시겠습니까?',
    confirm_body: '취소 후에는 되돌릴 수 없습니다.',
    commentLabel: '코멘트 (선택 사항)',
    commentPh: '취소 이유를 남겨주세요. (선택)',
    confirm: '취소하기',
    cancel: '닫기',
    successToast: '프로젝트가 취소되었습니다.',
    errorToast: '취소 처리 중 오류가 발생했습니다.',
  },
  en: {
    title: 'Cancel project',
    confirm_prompt: 'Are you sure you want to cancel?',
    confirm_body: 'This action cannot be undone.',
    commentLabel: 'Comment (optional)',
    commentPh: 'Reason for cancellation. (optional)',
    confirm: 'Cancel project',
    cancel: 'Go back',
    successToast: 'Project cancelled.',
    errorToast: 'Something went wrong. Please try again.',
  },
} as const;

export function CancelModal({ projectId, open, onClose, locale = 'ko' }: Props) {
  const [comment, setComment] = useState('');
  const [isPending, startTransition] = useTransition();
  const c = COPY[locale];

  if (!open) return null;

  function handleSubmit() {
    startTransition(async () => {
      try {
        await cancelProjectAction(projectId, comment.trim() || null);
        toast.success(c.successToast);
        onClose();
        setComment('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`${c.errorToast} (${msg})`);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal
      aria-labelledby="cancel-modal-title"
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-xl bg-background px-6 py-6"
        style={{
          boxShadow:
            '0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04),0 16px 40px rgba(0,0,0,0.12)',
        }}
      >
        <h2
          id="cancel-modal-title"
          className="font-suit text-2xl font-bold tracking-tight text-foreground mb-1"
        >
          {c.title}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {c.confirm_prompt} {c.confirm_body}
        </p>

        <label
          htmlFor="cancel-comment"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {c.commentLabel}
        </label>
        <textarea
          id="cancel-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          placeholder={c.commentPh}
          rows={3}
          disabled={isPending}
          className="w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none disabled:opacity-50"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              setComment('');
            }}
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
