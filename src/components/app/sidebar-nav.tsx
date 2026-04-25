"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import {
  FolderKanban,
  CalendarDays,
  Clapperboard,
  Frame,
  Store,
  Receipt,
  Settings,
  ShieldCheck,
  MessageSquare,
  Bell,
  Trophy,
  Presentation,
  Briefcase,
  Mailbox,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarGroupLabel } from "./sidebar-group-label";
import type { ProfileRole, WorkspaceRole } from "@/lib/app/context";

type NavItem = {
  key: string;
  href?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  /** Visible if user has any of these workspace roles. Combined with `profileRoles`
   *  via OR — passing either gate makes the item visible. If both are unset, item
   *  is visible to everyone. */
  roles?: WorkspaceRole[];
  /** Visible if user's `profile.role` matches one of these. See ADR-009 for why
   *  profile-role and workspace-role are split. */
  profileRoles?: ProfileRole[];
  children?: NavItem[];
};

type NavGroup = {
  key: "work" | "communication" | "billing" | "system";
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    key: "work",
    items: [
      {
        // disabled until G2 ships /app/commission. Schema gate is live (G1)
        // but the route + intake form land at G2; a clickable link to a 404
        // would be a UX regression. Codex K-05 Finding 3 (MED-B).
        key: "commission",
        href: "/app/commission",
        icon: Briefcase,
        profileRoles: ["client"],
        disabled: true,
      },
      {
        key: "projects",
        href: "/app/projects",
        icon: FolderKanban,
        roles: ["workspace_admin", "workspace_member"],
      },
      { key: "preprod", href: "/app/preprod", icon: Frame, roles: ["yagi_admin"] },
      {
        key: "showcases",
        href: "/app/showcases",
        icon: Presentation,
        roles: ["workspace_admin", "workspace_member"],
      },
      {
        key: "challenges",
        icon: Trophy,
        roles: ["yagi_admin"],
        children: [
          { key: "challenges_all", href: "/app/admin/challenges" },
          { key: "challenges_new", href: "/app/admin/challenges/new" },
          { key: "challenges_open", href: "/app/admin/challenges?state=open" },
        ],
      },
      {
        key: "storyboards",
        href: "/app/storyboards",
        icon: Clapperboard,
        disabled: true,
        roles: ["workspace_admin", "workspace_member"],
      },
      {
        key: "brands",
        href: "/app/brands",
        icon: Store,
        disabled: true,
        roles: ["workspace_admin"],
      },
    ],
  },
  {
    key: "communication",
    items: [
      {
        key: "meetings",
        href: "/app/meetings",
        icon: CalendarDays,
        roles: ["workspace_admin", "workspace_member"],
      },
      { key: "notifications", href: "/app/notifications", icon: Bell },
      // `team` is injected at render time when the user is a yagi-internal member.
    ],
  },
  {
    key: "billing",
    items: [
      {
        key: "billing_group",
        icon: Receipt,
        children: [
          {
            key: "invoices",
            href: "/app/invoices",
            roles: ["yagi_admin", "workspace_admin"],
          },
          { key: "admin_invoices", href: "/app/admin/invoices", roles: ["yagi_admin"] },
        ],
      },
    ],
  },
  {
    key: "system",
    items: [
      { key: "settings", href: "/app/settings", icon: Settings },
      { key: "admin", href: "/app/admin", icon: ShieldCheck, roles: ["yagi_admin"] },
      {
        // disabled until G3 ships /app/admin/commissions. Sidebar entry now,
        // route in G3 (admin queue + response form). Codex K-05 Finding 3.
        key: "admin_commissions",
        href: "/app/admin/commissions",
        icon: Mailbox,
        roles: ["yagi_admin"],
        disabled: true,
      },
    ],
  },
];

function isRoleVisible(
  item: NavItem,
  roles: WorkspaceRole[],
  profileRole: ProfileRole | null,
): boolean {
  const wsGated = item.roles && item.roles.length > 0;
  const profileGated = item.profileRoles && item.profileRoles.length > 0;
  // Ungated → visible.
  if (!wsGated && !profileGated) return true;
  // Either gate match makes the item visible (OR semantics).
  const wsMatch = wsGated ? item.roles!.some((r) => roles.includes(r)) : false;
  const profileMatch =
    profileGated && profileRole !== null
      ? item.profileRoles!.includes(profileRole)
      : false;
  return wsMatch || profileMatch;
}

/**
 * Filter an item by role.
 * - Leaf: returns self if visible, else null.
 * - Parent (has children): filter children recursively. If 0 → null. If 1 → collapse
 *   into the single child so the parent wrapper disappears (IMPLEMENTATION §1 rule).
 */
function filterItem(
  item: NavItem,
  roles: WorkspaceRole[],
  profileRole: ProfileRole | null,
): NavItem | null {
  if (!isRoleVisible(item, roles, profileRole)) return null;
  if (!item.children) return item;
  const kept = item.children
    .map((c) => filterItem(c, roles, profileRole))
    .filter((c): c is NavItem => c !== null);
  if (kept.length === 0) return null;
  if (kept.length === 1) return kept[0];
  return { ...item, children: kept };
}

type FlatLeaf = { key: string; href: string };

function collectLeaves(items: NavItem[]): FlatLeaf[] {
  const out: FlatLeaf[] = [];
  for (const it of items) {
    if (it.children) {
      out.push(...collectLeaves(it.children));
    } else if (it.href) {
      out.push({ key: it.key, href: it.href });
    }
  }
  return out;
}

function computeActiveKey(
  leaves: FlatLeaf[],
  pathname: string,
  search: URLSearchParams,
): string | null {
  let bestKey: string | null = null;
  let bestLen = -1;
  // Phase 1: exact query-bound matches take precedence on their pathname.
  for (const l of leaves) {
    const [base, query] = l.href.split("?");
    if (!query) continue;
    if (pathname !== base) continue;
    const wanted = new URLSearchParams(query);
    let allMatch = true;
    for (const [k, v] of wanted) {
      if (search.get(k) !== v) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) return l.key;
  }
  // Phase 2: longest-prefix-wins among non-query leaves.
  for (const l of leaves) {
    const [base, query] = l.href.split("?");
    if (query) continue;
    if (pathname !== base && !pathname.startsWith(base + "/")) continue;
    if (base.length > bestLen) {
      bestLen = base.length;
      bestKey = l.key;
    }
  }
  return bestKey;
}

export function SidebarNav({
  roles,
  profileRole,
  isYagiInternalMember,
}: {
  roles: WorkspaceRole[];
  profileRole: ProfileRole | null;
  isYagiInternalMember: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Runtime-injected `team` item (yagi-internal member only).
  const runtimeGroups: NavGroup[] = useMemo(() => {
    if (!isYagiInternalMember) return GROUPS;
    return GROUPS.map((g) => {
      if (g.key !== "communication") return g;
      return {
        ...g,
        items: [
          ...g.items,
          { key: "team", href: "/app/team", icon: MessageSquare } as NavItem,
        ],
      };
    });
  }, [isYagiInternalMember]);

  const visibleGroups = runtimeGroups
    .map((g) => {
      const items = g.items
        .map((it) => filterItem(it, roles, profileRole))
        .filter((it): it is NavItem => it !== null);
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);

  const allLeaves = useMemo(
    () => collectLeaves(visibleGroups.flatMap((g) => g.items)),
    [visibleGroups],
  );
  const activeKey = computeActiveKey(allLeaves, pathname, searchParams);

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex flex-col px-2 pb-3" aria-label="Operations">
        {visibleGroups.map((group) => {
          const showLabel = group.items.length >= 2;
          return (
            <div
              key={group.key}
              role="group"
              aria-labelledby={showLabel ? `nav-group-${group.key}` : undefined}
            >
              {showLabel && (
                <SidebarGroupLabel>
                  <span id={`nav-group-${group.key}`}>
                    {t(`groups.${group.key}`)}
                  </span>
                </SidebarGroupLabel>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) =>
                  item.children ? (
                    <ParentRow
                      key={item.key}
                      item={item}
                      activeKey={activeKey}
                      t={t}
                    />
                  ) : (
                    <NavLink
                      key={item.key}
                      item={item}
                      label={t(item.key)}
                      active={activeKey === item.key}
                      indent={0}
                    />
                  ),
                )}
              </div>
            </div>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

function ParentRow({
  item,
  activeKey,
  t,
}: {
  item: NavItem;
  activeKey: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const hasActiveChild = (item.children ?? []).some(
    (c) => c.key === activeKey,
  );
  const [open, setOpen] = useState(hasActiveChild);
  // Keep open synced with route changes: when a child becomes active, expand.
  // (Initial render + on active change both handled by lifting the initial to useState
  //  + a cheap derived-state pattern below.)
  const effectiveOpen = open || hasActiveChild;

  const Icon = item.icon;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={effectiveOpen}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
          "text-muted-foreground hover:text-foreground",
        )}
      >
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span className="flex-1 text-left">{t(item.key)}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform",
            effectiveOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {effectiveOpen && (
        <div className="flex flex-col gap-0.5">
          {item.children!.map((child) => (
            <NavLink
              key={child.key}
              item={child}
              label={t(child.key)}
              active={activeKey === child.key}
              indent={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavLink({
  item,
  label,
  active,
  indent,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  indent: 0 | 1;
}) {
  const Icon = item.icon;
  const base = cn(
    "flex items-center gap-2.5 py-2 rounded-md text-[13px] transition-colors",
    indent === 0 ? "px-3" : "pl-9 pr-3",
    active
      ? "text-foreground bg-accent"
      : "text-muted-foreground hover:text-foreground",
    item.disabled && "opacity-50 cursor-not-allowed pointer-events-none",
  );

  const content = (
    <>
      {Icon && indent === 0 && <Icon className="w-3.5 h-3.5" />}
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

  if (!item.href) {
    return <span className={base}>{content}</span>;
  }

  return (
    <Link
      href={item.href}
      className={base}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}
