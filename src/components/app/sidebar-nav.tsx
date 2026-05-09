"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Receipt,
  Settings,
  ShieldCheck,
  MessageSquare,
  Briefcase,
  LayoutDashboard,
  Sparkles,
  Plus,
  FolderOpen,
  Megaphone,
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

// Wave C v2 — kept in sync with WorkspaceItem.kind in workspace-switcher.tsx
// and WorkspaceKind in lib/workspace/active.ts.
type WorkspaceKindForNav =
  | "brand"
  | "agency"
  | "artist"
  | "creator"
  | "yagi_admin";

type NavItem = {
  key: string;
  href?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  /** Visible if user has any of these workspace roles. Combined with `profileRoles`
   *  via OR — passing either gate makes the item visible. If both are unset, item
   *  is visible to everyone. */
  roles?: WorkspaceRole[];
  /** Visible if user's `profile.role` matches one of these. */
  profileRoles?: ProfileRole[];
  /** Wave C v2 — gate by the active workspace's `kind`. When set, the entry
   *  is visible only if the user's currently active workspace's kind is in
   *  this list. Combined AND with role gates when both present. */
  kinds?: WorkspaceKindForNav[];
  children?: NavItem[];
};

type NavGroup = {
  key: "work" | "communication" | "billing" | "system" | "operations";
  items: NavItem[];
};

// Wave C v2 IA refactor (per SPEC §C.0 / PRODUCT-MASTER §C.0.5):
//   - work group filtered by activeWorkspaceKind:
//     - brand/artist/yagi_admin → dashboard + projects + campaign_request +
//       recommended_artist (disabled placeholder, brand only)
//     - creator → my_submissions only
//   - communication: meetings (brand/artist/yagi_admin), team (yagi-internal injected)
//   - billing: invoices (workspace_admin) + admin_invoices (yagi_admin)
//   - system: settings (everyone)
//   - operations (NEW): admin (yagi_admin only — single entry, sub-tools via
//     /app/admin dashboard 7-card grid)
//
// Removed from prior IAs (now hidden in sidebar; reach via admin dashboard):
//   - challenges parent + 3 children
//   - campaigns parent + 3 children
//   - admin_commissions
//   - admin_trash
//   - admin_support
const GROUPS: NavGroup[] = [
  {
    key: "work",
    items: [
      {
        key: "dashboard",
        href: "/app/dashboard",
        icon: LayoutDashboard,
        kinds: ["brand", "artist", "yagi_admin"],
      },
      {
        key: "projects",
        href: "/app/projects",
        icon: Briefcase,
        kinds: ["brand", "artist", "yagi_admin"],
      },
      {
        // Wave C v2 — sponsor-eligible workspaces request a campaign here
        // (Wave B entry, kept as a regular nav item inside work group; the
        // top-of-sidebar CTA is reserved for [+ 새 프로젝트 시작] per §C.0.5).
        key: "campaign_request",
        href: "/app/campaigns/request",
        icon: Megaphone,
        kinds: ["brand", "artist"],
      },
      {
        // Wave C creator dashboard — only entry visible to creator workspaces.
        key: "my_submissions",
        href: "/app/my-submissions",
        icon: FolderOpen,
        kinds: ["creator"],
      },
      {
        // Phase 4.x + Wave C v2 IA matrix — disabled placeholder, brand only.
        key: "recommended_artist",
        icon: Sparkles,
        disabled: true,
        kinds: ["brand"],
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
        kinds: ["brand", "artist", "yagi_admin"],
      },
      // `team` is runtime-injected for yagi-internal members.
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
      // Wave C v2: only settings remains. admin_commissions / admin_trash /
      // admin_support reachable via admin dashboard 7-card grid.
      { key: "settings", href: "/app/settings", icon: Settings },
    ],
  },
  {
    // Wave C v2 NEW group — yagi_admin only. Single entry; sub-tools via
    // the admin dashboard's 7-card grid.
    key: "operations",
    items: [
      {
        key: "admin",
        href: "/app/admin",
        icon: ShieldCheck,
        roles: ["yagi_admin"],
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
  if (!wsGated && !profileGated) return true;
  const wsMatch = wsGated ? item.roles!.some((r) => roles.includes(r)) : false;
  const profileMatch =
    profileGated && profileRole !== null
      ? item.profileRoles!.includes(profileRole)
      : false;
  return wsMatch || profileMatch;
}

function isKindVisible(
  item: NavItem,
  activeKind: WorkspaceKindForNav | null | undefined,
): boolean {
  if (!item.kinds || item.kinds.length === 0) return true;
  if (!activeKind) return false;
  return item.kinds.includes(activeKind);
}

/**
 * Filter an item by role + kind.
 * Leaf returns self if visible. Parent recursively filters children; if 0 →
 * null; if 1 → collapse into the single child (per IMPLEMENTATION §1).
 */
function filterItem(
  item: NavItem,
  roles: WorkspaceRole[],
  profileRole: ProfileRole | null,
  activeKind: WorkspaceKindForNav | null | undefined,
): NavItem | null {
  if (!isRoleVisible(item, roles, profileRole)) return null;
  if (!isKindVisible(item, activeKind)) return null;
  if (!item.children) return item;
  const kept = item.children
    .map((c) => filterItem(c, roles, profileRole, activeKind))
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
  activeWorkspaceKind,
}: {
  roles: WorkspaceRole[];
  profileRole: ProfileRole | null;
  isYagiInternalMember: boolean;
  /** Wave C v2 — the active workspace's `kind`. Used to gate work-group
   *  entries (dashboard / projects / campaign_request / my_submissions /
   *  recommended_artist / meetings) plus the standalone [+ 새 프로젝트 시작]
   *  CTA at the top. */
  activeWorkspaceKind?: WorkspaceKindForNav | null;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        .map((it) => filterItem(it, roles, profileRole, activeWorkspaceKind))
        .filter((it): it is NavItem => it !== null);
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);

  const allLeaves = useMemo(
    () => collectLeaves(visibleGroups.flatMap((g) => g.items)),
    [visibleGroups],
  );
  const activeKey = computeActiveKey(allLeaves, pathname, searchParams);

  // Wave C v2 [+ 새 프로젝트 시작] standalone primary CTA at top of sidebar.
  // Per SPEC §C.0.5, this is the 북극성 1순위 entry — sage fill resting state
  // (MED-5 fix: was muted card border which blended into the nav).
  const showNewProjectCta =
    activeWorkspaceKind === "brand" || activeWorkspaceKind === "artist";
  const newProjectActive =
    pathname === "/app/projects/new" || pathname.startsWith("/app/projects/new/");

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex flex-col px-2 pb-3" aria-label="Operations">
        {showNewProjectCta && (
          <div className="px-1 pt-2 pb-3">
            <Link
              href="/app/projects/new"
              aria-current={newProjectActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium border transition-colors duration-flora ease-flora",
                newProjectActive
                  ? "bg-foreground text-background border-foreground"
                  // MED-5: sage fill resting state asserts CTA hierarchy on sidebar
                  : "bg-sage text-sage-ink border-transparent hover:bg-sage/90",
              )}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t("new_project_cta")}</span>
            </Link>
          </div>
        )}
        {visibleGroups.map((group) => {
          // Wave C v2 K-06 LOOP-1 FINDING 2 fix: the new `operations` group
          // has a single yagi_admin entry (`admin`) by design — without the
          // exception below, showLabel >= 2 would suppress the "운영" label
          // and the ShieldCheck link would appear orphaned at the bottom of
          // the sidebar. Treat operations as always-labeled even at 1 entry.
          const showLabel =
            group.key === "operations" || group.items.length >= 2;
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
      ? "text-foreground bg-accent font-semibold"
      : "text-foreground/85 hover:text-foreground hover:bg-accent/50",
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
