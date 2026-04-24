import type { ChallengeState } from "@/lib/challenges/types";
import type { UrgencyTier } from "@/lib/challenges/urgency";
import { CountdownTimer } from "@/components/challenges/countdown-timer";

type Props = {
  state: ChallengeState;
  closeAt: string | null;
  announceAt: string | null;
  urgencyTier: UrgencyTier;
};

function formatDaysHours(closeAt: string): string {
  const diff = new Date(closeAt).getTime() - Date.now();
  const totalHours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return days > 0 ? `${days}일 ${hours}시간` : `${hours}시간`;
}

function formatHoursMinutes(closeAt: string): string {
  const diff = new Date(closeAt).getTime() - Date.now();
  const totalMinutes = Math.max(0, Math.floor(diff / (1000 * 60)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

function formatAnnounceAt(announceAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(announceAt));
}

export function StatusBanner({ state, closeAt, announceAt, urgencyTier }: Props) {
  if (state === "archived") {
    return (
      <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        지난 챌린지
      </div>
    );
  }

  if (state === "closed_judging") {
    const announceStr = announceAt ? formatAnnounceAt(announceAt) : "미정";
    return (
      <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
        심사 진행 중 · 결과 발표 예정: {announceStr}
      </div>
    );
  }

  if (state === "closed_announced") {
    return (
      <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
        결과 발표 완료 — <span className="font-medium">이번 챌린지의 주인공을 확인하세요</span>
      </div>
    );
  }

  if (state === "open") {
    if (urgencyTier === "h1") {
      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-1">
          <div>⚠️ 곧 마감입니다 — 지금 작품을 올려보세요</div>
          {closeAt && <CountdownTimer closeAt={closeAt} variant="banner" />}
        </div>
      );
    }

    if (urgencyTier === "h24") {
      return (
        <div className="rounded-lg border border-warning bg-warning/10 px-4 py-3 text-sm text-warning-foreground space-y-1">
          <div>⏰ 마감까지 {closeAt ? formatHoursMinutes(closeAt) : ""} 남았어요</div>
          {closeAt && <CountdownTimer closeAt={closeAt} variant="banner" />}
        </div>
      );
    }

    // normal
    return (
      <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground space-y-1">
        <div>지금 참여 가능 · 마감까지 {closeAt ? formatDaysHours(closeAt) : ""}</div>
        {closeAt && <CountdownTimer closeAt={closeAt} variant="banner" />}
      </div>
    );
  }

  return null;
}
