// Status label + description registry — Korean copy for G3+G4 surfaces.
//
// Separated from status-pill.ts (which handles className via tone) because:
// (a) i18n-ready: this file scales to multi-locale, status-pill stays static
// (b) consumer ergonomics: page code wants both className AND label often
// (c) G3 Decision Package §F.1/§F.2 split intent preserved: "status pill"
//     is visual; "labels" is semantic — different concerns
//
// Convention:
//   Use `statusPillClass(kind, status)` from status-pill.ts for className.
//   Use `statusLabel(kind, status)` from this file for display text.
//   Optional: `statusDescription(kind, status)` for helper/tooltip text.

import type { StatusKind } from "./status-pill";

type StatusLabelMap = {
  [K in StatusKind]: Record<string, { label: string; description?: string }>;
};

const LABELS_KO: StatusLabelMap = {
  // Phase 1.x kinds (preserved from existing usage; do NOT change without audit)
  project: {
    draft:         { label: "초안" },
    submitted:     { label: "제출됨" },
    in_discovery:  { label: "탐색 중" },
    in_production: { label: "제작 중" },
    in_revision:   { label: "수정 중" },
    delivered:     { label: "전달됨" },
    approved:      { label: "승인됨" },
    archived:      { label: "보관됨" },
  },
  invoice: {
    draft:  { label: "초안" },
    issued: { label: "발행됨" },
    paid:   { label: "결제완료" },
    void:   { label: "취소됨" },
  },
  meeting: {
    scheduled: { label: "예정" },
    completed: { label: "완료" },
    cancelled: { label: "취소" },
  },
  showcase: {
    draft:     { label: "초안" },
    published: { label: "공개" },
    archived:  { label: "보관" },
  },

  // Phase 2.5 challenge — G3 Decision Package §F.1
  challenge: {
    draft:            { label: "준비 중" },
    open:             { label: "진행 중" },
    closed_judging:   { label: "심사 중" },
    closed_announced: { label: "결과 발표" },
    archived:         { label: "지난 챌린지" },
  },

  // Phase 2.5 challenge_submissions — G3 Decision Package §F.2
  // description is creator-facing helper copy; shown as sub-text on pill
  // or tooltip. "rejected" softened to "확인 필요" per G3 DP (operational
  // truth in DB, psychological truth at UI surface).
  submission: {
    created:    { label: "올렸어요" },
    processing: { label: "확인 중", description: "영상/이미지 처리 중이에요" },
    ready:      { label: "공개됨", description: "갤러리에 공개되었어요" },
    rejected:   { label: "확인 필요", description: "관리자가 검토 중이에요. 곧 안내드릴게요." },
  },

  // Wave C v2 campaign_submissions — creator's view of own work. Labels
  // are also defined under `my_submissions.status.*` in messages/ko.json
  // for use with next-intl `useTranslations`; this registry mirrors them
  // for code paths that consume the centralized label helper directly.
  campaign_submission: {
    submitted:                 { label: "검토 대기" },
    approved_for_distribution: { label: "유포 승인", description: "유포 채널을 등록해주세요" },
    declined:                  { label: "비채택" },
    revision_requested:        { label: "수정 요청", description: "검수 메모를 확인 후 다시 제출해주세요" },
    distributed:               { label: "유포 완료" },
    withdrawn:                 { label: "철회" },
  },
};

/**
 * Return display label for a status. Defaults to ko locale.
 * Unknown combinations return the raw status string.
 */
export function statusLabel(kind: StatusKind, status: string): string {
  return LABELS_KO[kind]?.[status]?.label ?? status;
}

/**
 * Return helper/description text for a status, if defined.
 */
export function statusDescription(kind: StatusKind, status: string): string | undefined {
  return LABELS_KO[kind]?.[status]?.description;
}
