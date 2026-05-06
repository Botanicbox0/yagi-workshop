import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { statusPillClass } from "@/lib/ui/status-pill";
import { statusLabel } from "@/lib/ui/status-labels";
import { slugGradient } from "@/lib/ui/placeholder-gradient";
import type { Database } from "@/lib/supabase/database.types";

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];

interface ArchivedCardGridProps {
  challenges: ChallengeRow[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function ArchivedCardGrid({ challenges }: ArchivedCardGridProps) {
  const items = challenges.slice(0, 12);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((c) => {
        const pillClass = statusPillClass("challenge", c.state);
        const label = statusLabel("challenge", c.state);

        return (
          <Link
            key={c.id}
            href={`/challenges/${c.slug}`}
            className="group block overflow-hidden rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <div
              className="aspect-[16/9] bg-muted relative"
              style={c.hero_media_url ? undefined : { background: slugGradient(c.slug) }}
            >
              {c.hero_media_url ? (
                <Image
                  src={c.hero_media_url}
                  alt={c.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : null}
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-semibold tracking-display-ko text-base font-semibold word-break-keep-all">
                {c.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDate(c.announce_at)}</span>
                <span>·</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                    pillClass
                  )}
                >
                  {label}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
