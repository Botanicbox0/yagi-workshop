import { headers } from "next/headers";
import type { Metadata } from "next";
import { loadDeliverableShareData } from "@/lib/share/deliverable-share-data";
import { DeliverableShareRoom } from "@/components/share/deliverable-share-room";

type Props = { params: Promise<{ token: string }> };

function detectLocale(headersList: Headers): "ko" | "en" {
  const accept = headersList.get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("ko") ? "ko" : "en";
}

const COPY = {
  ko: {
    missingTitle: "공유가 종료되었어요",
    missingSub: "링크가 꺼졌거나 더 이상 검토할 수 없는 프로젝트입니다.",
    eyebrow: "DELIVERABLE REVIEW",
    subtitle: "로그인 없이 릴리즈된 결과물만 확인하고 코멘트 또는 승인 결정을 남길 수 있습니다.",
    targetDelivery: "희망 납기",
    unset: "미정",
    round: "Round {round} / {included}",
    roundOverage: "포함 수정 라운드를 넘었습니다. 추가 범위는 YAGI와 확인해주세요.",
    status: {
      submitted: "검토 대기",
      changes_requested: "수정 요청",
      approved: "승인됨",
    },
    turn: {
      client_review: "클라 검토 대기 · Round {round}",
      yagi_revision: "YAGI 수정 중 · Round {round}",
      approved: "승인 완료",
    },
    note: "버전 노트",
    noNote: "기록된 노트가 없습니다.",
    comments: "코멘트",
    commentEmpty: "아직 공유된 코멘트가 없습니다.",
    commentTitle: "코멘트 남기기",
    reviewTitle: "승인 / 수정 요청",
    name: "이름",
    email: "이메일",
    body: "내용을 입력해주세요.",
    commentSubmit: "코멘트 보내기",
    approve: "승인",
    requestChanges: "수정 요청",
    submitting: "전송 중...",
    successComment: "코멘트를 보냈습니다. 새로고침하면 반영됩니다.",
    successReview: "검토 결정을 보냈습니다.",
    errorGeneric: "전송에 실패했습니다. 잠시 후 다시 시도해주세요.",
    errorRequired: "이름, 이메일, 내용을 모두 입력해주세요.",
    download: "다운로드",
    open: "열기",
    asset: "에셋 {index}",
    timecode: "타임코드",
    video: {
      play: "재생",
      pause: "일시정지",
      currentTime: "현재 시간",
      commentAtCurrentPrefix: "",
      commentAtCurrentSuffix: " 지점에 코멘트",
      timecode: "타임코드",
    },
  },
  en: {
    missingTitle: "This share is no longer available",
    missingSub: "The link is disabled, expired, or the project can no longer be reviewed.",
    eyebrow: "DELIVERABLE REVIEW",
    subtitle: "Review released deliverables without logging in, then leave comments or an approval decision.",
    targetDelivery: "Target delivery",
    unset: "Unset",
    round: "Round {round} / {included}",
    roundOverage: "This is beyond the included revision rounds. Confirm additional scope with YAGI.",
    status: {
      submitted: "Pending review",
      changes_requested: "Changes requested",
      approved: "Approved",
    },
    turn: {
      client_review: "Client review pending · Round {round}",
      yagi_revision: "YAGI revising · Round {round}",
      approved: "Approved",
    },
    note: "Version note",
    noNote: "No note recorded.",
    comments: "Comments",
    commentEmpty: "No shared comments yet.",
    commentTitle: "Leave a comment",
    reviewTitle: "Approve / request changes",
    name: "Name",
    email: "Email",
    body: "Write your note.",
    commentSubmit: "Send comment",
    approve: "Approve",
    requestChanges: "Request changes",
    submitting: "Sending...",
    successComment: "Comment sent. Refresh to see it here.",
    successReview: "Review decision sent.",
    errorGeneric: "Could not send. Please try again.",
    errorRequired: "Enter your name, email, and note.",
    download: "Download",
    open: "Open",
    asset: "Asset {index}",
    timecode: "Timecode",
    video: {
      play: "Play",
      pause: "Pause",
      currentTime: "Current time",
      commentAtCurrentPrefix: "Comment at ",
      commentAtCurrentSuffix: "",
      timecode: "Timecode",
    },
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await loadDeliverableShareData(token);
  return {
    title: data ? `${data.project.title} · Deliverable Review` : "Deliverable Review",
    robots: { index: false, follow: false },
  };
}

function NoLongerShared({
  locale,
}: {
  locale: "ko" | "en";
}) {
  const c = COPY[locale];
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="max-w-md rounded-lg border border-border bg-surface-raised p-6 text-center">
        <p className="text-lg font-semibold">{c.missingTitle}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
          {c.missingSub}
        </p>
        <p className="mt-5 text-xs uppercase tracking-label text-muted-foreground">
          yagiworkshop.xyz
        </p>
      </div>
    </main>
  );
}

export default async function DeliverableSharePage({ params }: Props) {
  const { token } = await params;
  const locale = detectLocale(await headers());
  const data = await loadDeliverableShareData(token);
  if (!data) return <NoLongerShared locale={locale} />;

  return <DeliverableShareRoom data={data} locale={locale} labels={COPY[locale]} />;
}
