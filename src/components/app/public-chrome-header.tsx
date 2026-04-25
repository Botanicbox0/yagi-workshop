"use client";

import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./language-switcher";

/**
 * Floating top-right header for public surfaces (landing, /commission,
 * /challenges, /u/[handle], /journal). Hidden on /app/* because the app
 * shell renders its own header with the same control.
 *
 * Rendered from the root locale layout; uses `usePathname` to decide
 * visibility per-route on the client.
 */
export function PublicChromeHeader() {
  const pathname = usePathname();
  // pathname here includes the locale prefix (next/navigation, not
  // next-intl). Detect /app via segment match.
  const segments = pathname.split("/").filter(Boolean);
  const isAppShell = segments[1] === "app";
  if (isAppShell) return null;

  return (
    <div className="fixed top-3 right-3 md:top-4 md:right-4 z-40">
      <LanguageSwitcher />
    </div>
  );
}
