import Image from "next/image";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TwinCardTone } from "@/lib/landing/showcase";

type TwinCardProps = {
  name: string;
  personaType?: string | null;
  coverUrl?: string | null;
  label?: string;
  tone?: TwinCardTone;
  tilt?: number;
  priceLabel?: string;
  className?: string;
  priority?: boolean;
};

const toneClass: Record<TwinCardTone, string> = {
  fashion: "border-gold/35",
  beauty: "border-border/80",
  music: "border-border/80",
  product: "border-border/80",
};

export function TwinCard({
  name,
  personaType,
  coverUrl,
  label,
  tone = "music",
  tilt = 0,
  priceLabel,
  className,
  priority = false,
}: TwinCardProps) {
  const displayName = name.trim() || "Digital Twin";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <article
      className={cn(
        "group relative isolate overflow-hidden rounded-lg border bg-surface-card shadow-[0_24px_80px_rgba(0,0,0,0.28)] transition duration-flora ease-flora hover:-translate-y-1",
        toneClass[tone],
        className,
      )}
      style={{
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      <div className="relative aspect-[3/4] min-h-[260px] bg-surface-card-deep">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 85vw, 320px"
            className="object-cover transition duration-flora ease-flora group-hover:scale-[1.02]"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border/70 bg-surface">
              {initial ? (
                <span className="text-3xl font-bold text-foreground">{initial}</span>
              ) : (
                <UserRound className="h-8 w-8" aria-hidden="true" />
              )}
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {label && (
              <span className="inline-flex h-6 items-center rounded bg-gold-soft px-2 text-[11px] font-medium uppercase tracking-label text-gold">
                {label}
              </span>
            )}
            {personaType && (
              <span className="inline-flex h-6 items-center rounded border border-border/70 bg-surface-card px-2 text-[11px] font-medium uppercase tracking-label text-muted-foreground">
                {personaType}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold leading-tight text-foreground keep-all">
              {displayName}
            </h3>
            {priceLabel && (
              <p className="mt-2 text-sm font-semibold text-foreground">
                {priceLabel}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
