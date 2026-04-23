"use client";

import { useEffect, useState } from "react";
import { computeUrgencyTier } from "@/lib/challenges/urgency";
import { cn } from "@/lib/utils";

type Props = {
  closeAt: string;
  variant?: "banner" | "row" | "compact";
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CountdownTimer({ closeAt, variant = "banner" }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(closeAt).getTime();
  const diff = Math.max(0, target - now);

  const tier = computeUrgencyTier(closeAt);
  const toneClass = tier === "h1" ? "text-destructive" : "text-foreground";

  if (diff === 0) {
    return (
      <time dateTime={closeAt} className={cn("tabular-nums", toneClass)}>
        마감됨
      </time>
    );
  }

  const totalSeconds = Math.floor(diff / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const h = totalHours % 24;
  const d = Math.floor(totalHours / 24);

  if (variant === "banner") {
    return (
      <time
        dateTime={closeAt}
        className={cn("text-sm font-medium tabular-nums", toneClass)}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        <span>{d}</span>일{" "}
        <span>{pad(h)}</span>시간{" "}
        <span>{pad(m)}</span>분{" "}
        <span>{pad(s)}</span>초 남았어요
      </time>
    );
  }

  if (variant === "row") {
    return (
      <time
        dateTime={closeAt}
        className={cn("text-sm tabular-nums", toneClass)}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {d}d {pad(h)}:{pad(m)}:{pad(s)}
      </time>
    );
  }

  // compact
  return (
    <time
      dateTime={closeAt}
      className={cn("text-xs tabular-nums", toneClass)}
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      {pad(h)}:{pad(m)}:{pad(s)}
    </time>
  );
}
