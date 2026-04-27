'use client';

// Phase 3.0 — Revision request modal.
// Triggered when client clicks "수정 요청" on in_progress or delivered project.
// Comment is REQUIRED, min 10 chars — enforced client-side AND server-side via RPC.
// L-011: Achromatic. L-013: Soft layered shadow.

import { useState, useTransition } from 'react';
import { requestRevisionAction } from '@/components/projects/project-actions';
import { toast } from 'sonner';

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  locale?: 'ko' | 'en';
};

const COPY = {
  ko: {
    title: '수정 요청',
    commentLabel: '수정 내용',
    commentPh: '어떤 부분을 수정해야 하는지 구체적으로 설명해주세요. (최소 10자)',
    confirm: '수정 요청하기',
    cancel: '취소',
    errorMinLen: '수정 내용을 최소 10자 이상 입력해주세요.',
    successToast: '수정 요청이 전달되었습니다.',
    errorToast: '요청 처리 중 오류가 발생했습니다.',
    serverErrorMinLen: '수정 내용을 최소 10자 이상 입력해주세요.',
  },
  en: {
    title: 'Request revision',
    commentLabel: 'Revision notes',
    commentPh: 'Describe what needs to be revised. (min 10 characters)',
    confirm: 'Request revision',
    cancel: 'Cancel',
    errorMinLen: 'Please describe the revision in at least 10 characters.',
    successToast: 'Revision requested.',
    errorToast: 'Something went wrong. Please try again.',
    serverErrorMinLen: 'Please describe the revision in at least 10 characters.',
  },
} as const;

export function RevisionRequestModal({ projectId, open, onClose, locale = 'ko' }: Props) {
  const [comment, setComment] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const c = COPY[locale];

  if (!open) return null;

  function handleSubmit() {
    const trimmed = comment.trim();
    // Client-side minimum length enforcement
    if (trimmed.length < 10) {
      setClientError(c.errorMinLen);
      return;
    }
    setClientError(null);

    startTransition(async () => {
      try {
        await requestRevisionAction(projectId, trimmed);
        toast.success(c.successToast);
        onClose();
        setComment('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('comment_required_min_10_chars')) {
          // Server-side validation echo (belt-and-suspenders)
          setClientError(c.serverErrorMinLen);
        } else {
          toast.error(`${c.errorToast} (${msg})`);
        }
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal
      aria-labelledby="revision-modal-title"
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-xl bg-background px-6 py-6"
        style={{
          boxShadow:
            '0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04),0 16px 40px rgba(0,0,0,0.12)',
        }}
      >
        <h2
          id="revision-modal-title"
          className="font-suit text-2xl font-bold tracking-tight text-foreground mb-4"
        >
          {c.title}
        </h2>

        <label
          htmlFor="revision-comment"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {c.commentLabel}
          <span className="ml-1 text-foreground" aria-label="required">
            *
          </span>
        </label>
        <textarea
          id="revision-comment"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (clientError && e.target.value.trim().length >= 10) {
              setClientError(null);
            }
          }}
          placeholder={c.commentPh}
          rows={4}
          disabled={isPending}
          aria-required="true"
          aria-describedby={clientError ? 'revision-comment-error' : undefined}
          aria-invalid={clientError ? 'true' : 'false'}
          className={[
            'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none disabled:opacity-50',
            clientError
              ? 'border-zinc-800 focus:ring-foreground/30'
              : 'border-border/40 focus:ring-foreground/20',
          ].join(' ')}
        />
        {clientError && (
          <p
            id="revision-comment-error"
            className="mt-1.5 text-xs text-zinc-900 font-medium"
            role="alert"
          >
            {clientError}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              setComment('');
              setClientError(null);
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
