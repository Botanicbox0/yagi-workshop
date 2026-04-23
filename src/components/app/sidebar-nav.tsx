"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  FolderKanban,
  CalendarDays,
  Clapperboard,
  FileText,
  Frame,
  Store,
  Receipt,
  Settings,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { WorkspaceRole } from "@/lib/app/context";

type Item = {
  key: string;
  href: string;
  icon: typeof FolderKanban;
  disabled?: boolean;
  roles: WorkspaceRole[];
};

const items: Item[] = [
  { key: "projects", href: "/app/projects", icon: FolderKanban, roles: ["workspace_admin", "workspace_member"] },
  { key: "meetings", href: "/app/meetings", icon: CalendarDays, roles: ["workspace_admin", "workspace_member"] },
  // preprod is YAGI-internal; sidebar gates on yagi_admin only — workspace_members of
  // yagi-internal can still navigate directly to /app/preprod (page enforces its own check)
  { key: "preprod", href: "/app/preprod", icon: Frame, roles: ["yagi_admin"] },
  { key: "invoices", href: "/app/invoices", icon: FileText, roles: ["yagi_admin", "workspace_admin"] },
  { key: "storyboards", href: "/app/storyboards", icon: Clapperboard, disabled: true, roles: ["workspace_admin", "workspace_member"] },
  { key: "brands", href: "/app/brands", icon: Store, disabled: true, roles: ["workspace_admin"] },
  { key: "billing", href: "/app/billing", icon: Receipt, disabled: true, roles: ["workspace_admin"] },
  { key: "settings", href: "/app/settings", icon: Settings, roles: ["workspace_admin", "workspace_member"] },
];

const adminItems: Item[] = [
  { key: "admin", href: "/app/admin", icon: ShieldCheck, roles: ["yagi_admin"] },
  { key: "admin_invoices", href: "/app/admin/invoices", icon: Receipt, roles: ["yagi_admin"] },
];

export function SidebarNav({
  roles,
  isYagiInternalMember,
}: {
  roles: WorkspaceRole[];
  isYagiInternalMember: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const visible = items.filter((item) => item.roles.some((r) => roles.includes(r)));
  const teamItem: Item | null = isYagiInternalMember
    ? { key: "team", href: "/app/team", icon: MessageSquare, roles: [] }
    : null;
  const admin = roles.includes("yagi_admin") ? adminItems : [];

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex flex-col gap-0.5 px-2">
        {visible.map((item) => (
          <NavLink
            key={item.key}
            item={item}
            label={t(item.key)}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
        {teamItem && (
          <NavLink
            key={teamItem.key}
            item={teamItem}
            label={t(teamItem.key)}
            active={
              pathname === teamItem.href ||
              pathname.startsWith(teamItem.href + "/")
            }
          />
        )}
        {admin.length > 0 && (
          <>
            <div className="h-px bg-border mx-2 my-2" />
            {admin.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                label={t(item.key)}
                active={pathname === item.href || pathname.startsWith(item.href + "/")}
              />
            ))}
          </>
        )}
      </nav>
    </TooltipProvider>
  );
}

function NavLink({
  item,
  label,
  active,
}: {
  item: Item;
  label: string;
  active: boolean;
}) {
  const Icon = item.icon;
  const base = cn(
    "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
    active ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground",
    item.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
  );

  const content = (
    <>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </>
  );

  if (item.disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={base}>{content}</span>
        </TooltipTrigger>
        <TooltipContent side="right">Coming soon</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} className={base}>
      {content}
    </Link>
  );
}
