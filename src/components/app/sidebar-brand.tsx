"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";

// Phase 2.8.3 G_B3_B — sidebar brand header.
// Mounts above SidebarScopeSwitcher in src/components/app/sidebar.tsx.
// Renders the mark + wordmark side-by-side on the desktop sidebar
// (240px col); the mobile sheet is full-width so the wordmark fits
// there too. Asset paths are ASCII-canonical per kickoff §5 #9.
//
// Click target is /app/projects — the Sidebar is only rendered inside
// the authenticated /app shell, so the guest landing path is N/A here.

export function SidebarBrand() {
  return (
    <Link
      href="/app/projects"
      aria-label="YAGI Workshop"
      className="flex items-center gap-2.5 -mx-1 mb-3 rounded-md px-1 py-1 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    >
      <Image
        src="/brand/yagi-mark.png"
        alt=""
        width={28}
        height={28}
        priority
        className="rounded-sm"
      />
      <Image
        src="/brand/yagi-wordmark.png"
        alt="YAGI Workshop"
        width={108}
        height={20}
        priority
        className="h-5 w-auto"
      />
    </Link>
  );
}
