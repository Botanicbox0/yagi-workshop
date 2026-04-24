"use client";

import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/routing";
import { HelpCircle } from "lucide-react";
import { resolveHelpRoute } from "@/lib/app/help-routes";

export function PageHelpLink() {
  const pathname = usePathname();
  const t = useTranslations("app.help");
  const entry = resolveHelpRoute(pathname);

  if (!entry) return null;

  const label = t(`routes.${entry.i18nKey}`);

  return (
    <Link
      href={`/journal/guide/${entry.slug}`}
      className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1.5 py-1"
      aria-label={label}
      title={label}
    >
      <HelpCircle className="w-3.5 h-3.5" />
      <span className="hidden md:inline">{t("label")}</span>
    </Link>
  );
}
