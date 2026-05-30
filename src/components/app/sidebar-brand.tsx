"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";

// Phase 4.x Wave C.5c sub_04 — sidebar brand header restored to the
// classic icon + wordmark horizontal layout (Linear / Notion / Slack
// shape). Replaces the Phase 2.9 G_B9_B combined-logo render.
//
// Intrinsic asset dimensions:
//   icon  (yagi-symbol-mono-dark.png) 233x232 (square mark)
//   text  (yagi-wordmark-white.png) 708x228 (~3.105:1)
//
// Display: icon 28×28, text height 18 (width ≈ 56 = 18 × 708/228),
// gap 10 (gap-2.5), items-center. Whole row stays a Link to
// /app/projects so the sidebar header is also the "go home"
// affordance the previous version provided.

export function SidebarBrand() {
  return (
    <Link
      href="/app/projects"
      aria-label="YAGI Workshop"
      className="flex items-center gap-2.5 -mx-1 rounded-md px-1 py-1 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    >
      <Image
        src="/brand/yagi-symbol-mono-dark.png"
        alt=""
        width={28}
        height={28}
        priority
        className="h-7 w-7 flex-shrink-0 object-contain"
      />
      <Image
        src="/brand/yagi-wordmark-white.png"
        alt="YAGI WORKSHOP"
        width={56}
        height={18}
        priority
        className="h-[18px] w-auto object-contain"
      />
    </Link>
  );
}
