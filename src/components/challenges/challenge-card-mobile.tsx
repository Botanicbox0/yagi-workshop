import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { statusPillClass } from "@/lib/ui/status-pill";
import { statusLabel } from "@/lib/ui/status-labels";
import { computeUrgencyTier } from "@/lib/challenges/urgency";
import { slugGradient } from "@/lib/ui/placeholder-gradient";
import type { Database } from "@/lib/supabase/database.types";

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];

interface ChallengeCardMobileProps {
  challenge: ChallengeRow;
  section: "open" | "announced" | "archived";
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
    return `D-${hours}:${String(mins).padStart(2, "0")}`;
  }
  const diffMs = new Date(challenge.close_at).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return `D-${days}`;
}

export function ChallengeCardMobile({ challenge, section }: ChallengeCardMobileProps) {
  const pillClass = statusPillClass("challenge", challenge.state);
  const label = statusLabel("challenge", challenge.state);

  return (
    <div className="sm:hidden border-b border-border py-3 px-1 space-y-2">
      <div
        className="aspect-[16/9] w-full overflow-hidden rounded-md bg-muted mb-3 relative"
        style={challenge.hero_media_url ? undefined : { background: slugGradient(challenge.slug) }}
      >
        {challenge.hero_media_url ? (
          <Image
            src={challenge.hero_media_url}
            alt={challenge.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : null}
      </div>

      <Link
        href={`/challenges/${challenge.slug}`}
        className="block text-base font-medium hover:underline underline-offset-2 word-break-keep-all"
      >
        {challenge.title}
      </Link>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {section === "open" && (
          <span>
            <span className="text-muted-foreground">마감일</span>{" "}
            <span
              className={cn(
                computeUrgencyTier(challenge.close_at) !== "normal"
                  ? "font-medium text-foreground"
                  : ""
              )}
            >
              {deadlineDisplay(challenge)}
            </span>
          </span>
        )}
        {(section === "announced" || section === "archived") && challenge.announce_at && (
          <span>
            <span className="text-muted-foreground">발표일</span>{" "}
            {formatDate(challenge.announce_at)}
          </span>
        )}
        {section === "announced" && (
          <span className="text-muted-foreground">주인공 —명</span>
        )}
      </div>

      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
          pillClass
        )}
      >
        {label}
      </span>
    </div>
  );
}
