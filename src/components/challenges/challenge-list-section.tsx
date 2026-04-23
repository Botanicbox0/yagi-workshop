// TODO: "주인공 N명" count (announced section) sourced from showcase_challenge_winners.
// Per DP §B Q2-3 A, no extra DB round-trip per row is allowed. This column renders "—"
// until a batch count field is added to the getChallengesList query in a future follow-up.
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusPillClass } from "@/lib/ui/status-pill";
import { statusLabel } from "@/lib/ui/status-labels";
import { computeUrgencyTier } from "@/lib/challenges/urgency";
import { slugGradient } from "@/lib/ui/placeholder-gradient";
import { ChallengeCardMobile } from "./challenge-card-mobile";
import { ArchivedCardGrid } from "./archived-card-grid";
import type { Database } from "@/lib/supabase/database.types";

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];

interface ChallengeListSectionProps {
  section: "open" | "announced" | "archived";
  challenges: ChallengeRow[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function deadlineDisplay(challenge: ChallengeRow): string {
  if (!challenge.close_at) return "—";
  const tier = computeUrgencyTier(challenge.close_at);
  if (tier === "h1") return "D-DAY";
  if (tier === "h24") {
    const diffMs = new Date(challenge.close_at).getTime() - Date.now();
    const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const mins = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
    return `D-${hours}h ${String(mins).padStart(2, "0")}m`;
  }
  const diffMs = new Date(challenge.close_at).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return `D-${days}`;
}

export function ChallengeListSection({ section, challenges }: ChallengeListSectionProps) {
  if (challenges.length === 0) return null;

  if (section === "archived") {
    return <ArchivedCardGrid challenges={challenges} />;
  }

  return (
    <div>
      {/* Desktop/tablet table — hidden below sm */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 sm:w-28" aria-label="썸네일" />
              <TableHead>제목</TableHead>
              {section === "open" && (
                <TableHead className="w-32">마감일</TableHead>
              )}
              {section === "announced" && (
                <TableHead className="w-32">발표일</TableHead>
              )}
              {section === "announced" && (
                <TableHead className="w-28">주인공</TableHead>
              )}
              <TableHead className="w-28">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.map((challenge) => {
              const pillClass = statusPillClass("challenge", challenge.state);
              const label = statusLabel("challenge", challenge.state);
              const tier = section === "open" ? computeUrgencyTier(challenge.close_at) : "normal";

              return (
                <TableRow key={challenge.id}>
                  <TableCell className="w-20 sm:w-28">
                    <div
                      className="aspect-[16/9] w-16 sm:w-24 overflow-hidden rounded-md bg-muted relative"
                      style={challenge.hero_media_url ? undefined : { background: slugGradient(challenge.slug) }}
                    >
                      {challenge.hero_media_url ? (
                        <Image
                          src={challenge.hero_media_url}
                          alt={challenge.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 64px, 96px"
                        />
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/challenges/${challenge.slug}`}
                      className="font-medium hover:underline underline-offset-2 word-break-keep-all"
                    >
                      {challenge.title}
                    </Link>
                  </TableCell>

                  {section === "open" && (
                    <TableCell
                      className={cn(
                        "tabular-nums",
                        tier !== "normal" ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {deadlineDisplay(challenge)}
                    </TableCell>
                  )}

                  {section === "announced" && (
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDate(challenge.announce_at)}
                    </TableCell>
                  )}

                  {section === "announced" && (
                    <TableCell className="text-muted-foreground">
                      —
                    </TableCell>
                  )}

                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                        pillClass
                      )}
                    >
                      {label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards — hidden at sm+ */}
      <div className="sm:hidden divide-y divide-border">
        {challenges.map((challenge) => (
          <ChallengeCardMobile
            key={challenge.id}
            challenge={challenge}
            section={section}
          />
        ))}
      </div>
    </div>
  );
}
