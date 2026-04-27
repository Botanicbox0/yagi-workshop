'use client';

// Phase 3.0 — State + role-aware action button row for the project detail page.
// Manages modal open/close state. All transitions go through project-actions.ts
// which calls transition_project_status RPC — never direct UPDATE.
// L-011: Achromatic buttons only.
// Primary: bg-foreground text-background. Secondary: bg-background text-foreground border-border/40.

import { useState, useTransition } from 'react';
import { ApprovalModal } from '@/components/projects/action-modals/approval-modal';
import { RevisionRequestModal } from '@/components/projects/action-modals/revision-request-modal';
import { CancelModal } from '@/components/projects/action-modals/cancel-modal';
import {
  startProjectAction,
  deliverProjectAction,
  archiveProjectAction,
} from '@/components/projects/project-actions';
import { toast } from 'sonner';

type ViewerRole = 'client' | 'admin';

type Props = {
  projectId: string;
  status: string;
  viewerRole: ViewerRole;
  locale: 'ko' | 'en';
};

const COPY = {
  ko: {
    btn_revise: '수정 요청',
    btn_cancel: '취소',
    btn_approve: '승인',
    btn_start: '진행 시작',
    btn_deliver: '납품 완료',
    btn_restart: '재시작',
    btn_archive: '아카이브',
    success_start: '진행 시작으로 전환되었습니다.',
    success_deliver: '납품 완료로 전환되었습니다.',
    success_archive: '아카이브되었습니다.',
    error_generic: '작업 처리 중 오류가 발생했습니다.',
  },
  en: {
    btn_revise: 'Request revision',
    btn_cancel: 'Cancel',
    btn_approve: 'Approve',
    btn_start: 'Start',
    btn_deliver: 'Mark delivered',
    btn_restart: 'Restart',
    btn_archive: 'Archive',
    success_start: 'Status changed to in progress.',
    success_deliver: 'Marked as delivered.',
    success_archive: 'Project archived.',
    error_generic: 'Something went wrong. Please try again.',
  },
} as const;

export function ProjectActionButtons({ projectId, status, viewerRole, locale }: Props) {
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const c = COPY[locale];

  function runAction(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(successMsg);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`${c.error_generic} (${msg})`);
      }
    });
  }

  const primary =
    'px-4 py-2 text-sm rounded-md bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity font-medium';
  const secondary =
    'px-4 py-2 text-sm rounded-md bg-background text-foreground border border-border/40 hover:bg-zinc-50 disabled:opacity-50 transition-colors';

  // ── Client action matrix ────────────────────────────────────────────────────
  if (viewerRole === 'client') {
    // status=in_progress → "수정 요청" + "취소"
    if (status === 'in_progress') {
      return (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRevisionOpen(true)}
              disabled={isPending}
              className={primary}
            >
              {c.btn_revise}
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={isPending}
              className={secondary}
            >
              {c.btn_cancel}
            </button>
          </div>
          <RevisionRequestModal
            projectId={projectId}
            open={revisionOpen}
            onClose={() => setRevisionOpen(false)}
            locale={locale}
          />
          <CancelModal
            projectId={projectId}
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            locale={locale}
          />
        </>
      );
    }

    // status=delivered → "승인" + "수정 요청" + "취소"
    if (status === 'delivered') {
      return (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setApprovalOpen(true)}
              disabled={isPending}
              className={primary}
            >
              {c.btn_approve}
            </button>
            <button
              type="button"
              onClick={() => setRevisionOpen(true)}
              disabled={isPending}
              className={secondary}
            >
              {c.btn_revise}
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={isPending}
              className={secondary}
            >
              {c.btn_cancel}
            </button>
          </div>
          <ApprovalModal
            projectId={projectId}
            open={approvalOpen}
            onClose={() => setApprovalOpen(false)}
            locale={locale}
          />
          <RevisionRequestModal
            projectId={projectId}
            open={revisionOpen}
            onClose={() => setRevisionOpen(false)}
            locale={locale}
          />
          <CancelModal
            projectId={projectId}
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            locale={locale}
          />
        </>
      );
    }

    // No actions for other client statuses
    return null;
  }

  // ── Admin action matrix ─────────────────────────────────────────────────────
  if (viewerRole === 'admin') {
    // status=in_review → "진행 시작" + "취소"
    if (status === 'in_review') {
      return (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => startProjectAction(projectId),
                  c.success_start
                )
              }
              disabled={isPending}
              className={primary}
            >
              {c.btn_start}
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={isPending}
              className={secondary}
            >
              {c.btn_cancel}
            </button>
          </div>
          <CancelModal
            projectId={projectId}
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            locale={locale}
          />
        </>
      );
    }

    // status=in_progress → "납품 완료" + "취소"
    if (status === 'in_progress') {
      return (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => deliverProjectAction(projectId),
                  c.success_deliver
                )
              }
              disabled={isPending}
              className={primary}
            >
              {c.btn_deliver}
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={isPending}
              className={secondary}
            >
              {c.btn_cancel}
            </button>
          </div>
          <CancelModal
            projectId={projectId}
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            locale={locale}
          />
        </>
      );
    }

    // status=in_revision → "재시작" + "취소"
    if (status === 'in_revision') {
      return (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => startProjectAction(projectId),
                  c.success_start
                )
              }
              disabled={isPending}
              className={primary}
            >
              {c.btn_restart}
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={isPending}
              className={secondary}
            >
              {c.btn_cancel}
            </button>
          </div>
          <CancelModal
            projectId={projectId}
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            locale={locale}
          />
        </>
      );
    }

    // status=approved → "아카이브"
    if (status === 'approved') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              runAction(
                () => archiveProjectAction(projectId),
                c.success_archive
              )
            }
            disabled={isPending}
            className={secondary}
          >
            {c.btn_archive}
          </button>
        </div>
      );
    }

    // No admin actions for other statuses (delivered, cancelled, archived)
    return null;
  }

  return null;
}
