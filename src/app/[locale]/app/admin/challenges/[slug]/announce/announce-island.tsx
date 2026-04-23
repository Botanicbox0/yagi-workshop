"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusPillClass } from "@/lib/ui/status-pill";
import { statusLabel } from "@/lib/ui/status-labels";
import { announceWinnersAction } from "./actions";
import { transitionChallengeStateAction } from "@/app/[locale]/app/admin/challenges/actions";
import type { Database } from "@/lib/supabase/database.types";

type SubmissionRow = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type WinnerRow = Database["public"]["Tables"]["showcase_challenge_winners"]["Row"];
type JudgmentRow = Database["public"]["Tables"]["challenge_judgments"]["Row"];
type VoteCount = { submission_id: string; count: number };
type ChallengeState = "draft" | "open" | "closed_judging" | "closed_announced" | "archived";

type Props = {
  challengeId: string;
  challengeSlug: string;
  challengeState: ChallengeState;
  submissions: SubmissionRow[];
  existingWinners: WinnerRow[];
  judgments: JudgmentRow[];
  voteCounts: VoteCount[];
  judgingMode: "admin_only" | "public_vote" | "hybrid";
};

const RANK_OPTIONS = [
  { value: "none", label: "수상 없음" },
  { value: "1", label: "1위" },
  { value: "2", label: "2위" },
  { value: "3", label: "3위" },
  { value: "4", label: "4위" },
  { value: "5", label: "5위" },
];

export function AnnounceIsland({
  challengeId,
  challengeSlug,
  challengeState,
  submissions,
  existingWinners,
  judgments,
  voteCounts,
  judgingMode,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const winnerBySubId = new Map(existingWinners.map((w) => [w.submission_id, w]));
  const judgmentBySubId = new Map(judgments.map((j) => [j.submission_id, j]));
  const voteCountBySubId = new Map(voteCounts.map((v) => [v.submission_id, v.count]));

  const [rankSelections, setRankSelections] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      for (const sub of submissions) {
        const winner = winnerBySubId.get(sub.id);
        initial[sub.id] = winner ? String(winner.rank) : "none";
      }
      return initial;
    },
  );

  const isAnnounced = challengeState === "closed_announced";

  function handleRankChange(submissionId: string, value: string) {
    setRankSelections((prev) => {
      // If assigning a non-none rank, clear that rank from any other submission
      if (value !== "none") {
        const updated: Record<string, string> = {};
        for (const [id, rank] of Object.entries(prev)) {
          updated[id] = rank === value && id !== submissionId ? "none" : rank;
        }
        updated[submissionId] = value;
        return updated;
      }
      return { ...prev, [submissionId]: value };
    });
  }

  function handleAnnounce() {
    const winners = Object.entries(rankSelections)
      .filter(([, rank]) => rank !== "none")
      .map(([submissionId, rank]) => ({ submissionId, rank: parseInt(rank, 10) }));

    if (winners.length === 0) {
      toast.error("수상자를 한 명 이상 선택해주세요.");
      return;
    }

    startTransition(async () => {
      const result = await announceWinnersAction(challengeId, winners);
      if (result.ok) {
        toast.success("결과가 발표되었어요.");
        router.refresh();
      } else {
        const msg: Record<string, string> = {
          unauthorized: "로그인이 필요해요.",
          forbidden: "권한이 없어요.",
          invalid_state: "심사 중 상태의 챌린지만 결과 발표할 수 있어요.",
          rank_collision: "같은 순위를 중복 선택했어요.",
          no_winners: "수상자를 선택해주세요.",
          submission_not_in_challenge: "이 챌린지에 속하지 않는 작품이 포함되었어요.",
          winner_insert_failed: "수상자 저장에 실패했어요. 다시 시도해주세요.",
          transition_failed: "상태 전환에 실패했어요. 다시 시도해주세요.",
        };
        toast.error(msg[result.error] ?? "오류가 발생했어요. 다시 시도해주세요.");
      }
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const result = await transitionChallengeStateAction(challengeSlug, "open");
      if (result.ok) {
        toast.success("챌린지가 다시 진행 중 상태로 변경되었어요.");
        router.push(`/app/admin/challenges/${challengeSlug}/judge`);
      } else {
        toast.error("상태 변경에 실패했어요.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {isAnnounced && (
        <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          이미 결과가 발표된 챌린지입니다. 수상자 현황을 확인할 수 있어요.
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          작품이 없어요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">작품 ID</th>
                <th className="px-4 py-3 text-left font-medium">상태</th>
                {(judgingMode === "public_vote" || judgingMode === "hybrid") && (
                  <th className="px-4 py-3 text-left font-medium">응원 수</th>
                )}
                {judgingMode !== "public_vote" && (
                  <th className="px-4 py-3 text-left font-medium">심사 점수</th>
                )}
                <th className="px-4 py-3 text-left font-medium">순위</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((sub) => {
                const judgment = judgmentBySubId.get(sub.id);
                const votes = voteCountBySubId.get(sub.id) ?? 0;
                const currentRank = rankSelections[sub.id] ?? "none";

                return (
                  <tr key={sub.id} className="bg-card hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {sub.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          statusPillClass("submission", sub.status),
                        ].join(" ")}
                      >
                        {statusLabel("submission", sub.status)}
                      </span>
                    </td>
                    {(judgingMode === "public_vote" || judgingMode === "hybrid") && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {votes > 0 ? `${votes}표` : "—"}
                      </td>
                    )}
                    {judgingMode !== "public_vote" && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {judgment?.score != null ? `${judgment.score}점` : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {isAnnounced ? (
                        currentRank !== "none" ? (
                          <span className="inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                            {currentRank}위
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : (
                        <Select
                          value={currentRank}
                          onValueChange={(v) => handleRankChange(sub.id, v)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-8 w-32 focus-visible:ring-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RANK_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isAnnounced && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="pill"
            onClick={handleAnnounce}
            disabled={isPending || submissions.length === 0}
            className="focus-visible:ring-2"
          >
            {isPending ? "발표 중…" : "결과 발표"}
          </Button>
          <Button
            size="pill"
            variant="outline"
            onClick={handleReopen}
            disabled={isPending}
            className="focus-visible:ring-2"
          >
            다시 심사로
          </Button>
        </div>
      )}
    </div>
  );
}
