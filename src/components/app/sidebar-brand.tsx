"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";

// Phase 2.8.3 G_B3_B / Phase 2.8.5 — sidebar brand header.
// Mark (intrinsic 512×396, 1.29:1) renders at h=24px → ~31px wide.
// Wordmark (intrinsic 720×169, 4.26:1) renders at h=16px → ~68px wide,
// preserving its native aspect via h/w-auto rather than the previous
// hard-coded 108×20 box that distorted slightly. Total brand block
// height ≤ 24px so the workspace label below has room to sit.
//
// Click target is /app/projects — the Sidebar is only rendered inside
// the authenticated /app shell, so the guest landing path is N/A here.

export function SidebarBrand() {
  return (
    <Link
      href="/app/projects"
      aria-label="YAGI Workshop"
      className="flex items-center gap-2.5 -mx-1 rounded-md px-1 py-1 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    >
      <Image
        src="/brand/yagi-mark.png"
        alt=""
        width={31}
        height={24}
        priority
        className="h-6 w-auto"
      />
      <Image
        src="/brand/yagi-wordmark.png"
        alt="YAGI Workshop"
        width={68}
        height={16}
        priority
        className="h-4 w-auto"
      />
    </Link>
  );
}
