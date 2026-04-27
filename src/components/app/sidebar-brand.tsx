"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";

// Phase 2.9 G_B9_B — sidebar brand header uses the combined logo
// (mark + wordmark + tagline). Replaces the Phase 2.8.5 mark+wordmark
// pair render. Auth/onboarding layouts continue to use the standalone
// `yagi-wordmark.png` (wired in Phase 2.8.4) — those stay intact.
//
// Combined logo is 1600×358 intrinsic. Display height 36px (~161 wide
// on the 240px sidebar column) keeps the entire mark+wordmark+tagline
// readable without crowding the workspace label below.
//
// Click target is /app/projects — the Sidebar is only rendered inside
// the authenticated /app shell, so the guest landing path is N/A here.

export function SidebarBrand() {
  return (
    <Link
      href="/app/projects"
      aria-label="YAGI Workshop"
      className="block -mx-1 rounded-md px-1 py-1 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    >
      <Image
        src="/brand/yagi-logo-combined.png"
        alt="YAGI Workshop"
        width={161}
        height={36}
        priority
        className="h-9 w-auto"
      />
    </Link>
  );
}
