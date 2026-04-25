"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";

/**
 * Light-weight KO ↔ EN toggle. Uses next-intl's locale-aware Link with the
 * current pathname so the switch preserves the deep route. Hidden chrome:
 * one icon + 2-letter locale code, muted hover.
 */
export function LanguageSwitcher() {
  // next-intl's `usePathname()` returns the locale-stripped pathname, which
  // is what we want — the Link's `locale` prop re-prefixes it.
  const pathname = usePathname();
  const locale = useLocale();
  const next = locale === "ko" ? "en" : "ko";
  return (
    <Link
      // The pathname returned by next-intl is typed; cast to the wide route
      // shape so any deep route can be carried through the locale switch.
      href={pathname as "/"}
      locale={next}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1.5 py-1"
      aria-label={`Switch to ${next.toUpperCase()}`}
    >
      <Languages className="w-3.5 h-3.5" />
      <span className="tabular-nums">{next.toUpperCase()}</span>
    </Link>
  );
}
