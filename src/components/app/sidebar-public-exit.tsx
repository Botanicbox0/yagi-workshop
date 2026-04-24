"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowUpLeft } from "lucide-react";

export function SidebarPublicExit() {
  const t = useTranslations("app");
  return (
    <Link
      href="/"
      className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      <ArrowUpLeft className="w-3 h-3" />
      <span>{t("publicExit")}</span>
    </Link>
  );
}
