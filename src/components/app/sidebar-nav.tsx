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

// Phase 7 Wave C.0 — must mirror WorkspaceItem.kind in workspace-switcher.tsx.
// Wave C.1 migration adds 'creator' + 'agency'. The CTAs already exclude
// non-sponsor kinds, so adding both here is a no-op for any item that gates
// on `kinds`.
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
  /** Visible if user's `profile.role` matches one of these. See ADR-009 for why
   *  profile-role and workspace-role are split. */
  profileRoles?: ProfileRole[];
  /** Phase 7 Wave C.0 — gate by the active workspace's `kind` column. When set,
   *  the entry is visible only if the user's currently active workspace's kind
   *  is in this list. Combined with `roles`/`profileRoles` via AND when present
   *  alongside them; when used alone, kind alone gates. */
  kinds?: WorkspaceKindForNav[];
  children?: NavItem[];
};

type NavGroup = {
  key: "work" | "communication" | "billing" | "system" | "operations";
  items: NavItem[];
};

// Phase 7 Wave C.0 IA refactor:
//   - Removed: challenges parent + 3 children, campaigns parent + 3 children,
//     admin_commissions, admin_trash, admin_support sidebar entries.
//     All admin sub-tools accessed via /app/admin dashboard 7-card grid (HF4).
//   - Added: operations group (yagi_admin only) with single YAGI 관리 entry,
//     my_submissions entry (creator workspace only),
//     [+ 새 프로젝트 시작] standalone primary CTA at top (brand/artist only),
//     kind-gated [+ 캠페인 요청] now inside work group (was top-level CTA).
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
        // Phase 7 Wave B.1 + Wave C.0: moved from top-level CTA into work
        // group as a regular entry (still kind-gated to brand/artist).
        key: "campaign_request",
        href: "/app/campaigns/request",
        icon: Megaphone,
        kinds: ["brand", "artist"],
      },
      {
        // Phase 7 Wave C.3: creator workspace's only work entry. Page ships
        // in C.3; the route stub renders a list of own submissions.
        key: "my_submissions",
        href: "/app/my-submissions",
        icon: FolderOpen,
        kinds: ["creator"],
      },
      {
        // Phase 4.x task_05 + Q-103 + Wave C.0 matrix: 추천 Artist disabled
        // placeholder, brand workspace only (Phase 10 Inbound Track ships
        // the activated form).
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
        // Wave C.0 matrix: brand/artist/yagi_admin only. Creator excluded.
        kinds: ["brand", "artist", "yagi_admin"],
      },
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
      // Wave C.0: settings is the only system entry — admin/commissions,
      // admin/trash, admin/support all moved into the admin dashboard
      // 7-card grid (HF4). Sidebar exposure removed.
      { key: "settings", href: "/app/settings", icon: Settings },
    ],
  },
  {
    // Phase 7 Wave C.0 — NEW group, yagi_admin only. Single entry that
    // lands the admin dashboard, where the 7-card grid (HF4) navigates to
    // every admin sub-tool.
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
 * - Leaf: returns self if visible, else null.
 * - Parent (has children): filter children recursively. If 0 → null. If 1 → collapse
 *   into the single child so the parent wrapper disappears (IMPLEMENTATION §1 rule).
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
  activeWorkspaceKind,
}: {
  roles: WorkspaceRole[];
  profileRole: ProfileRole | null;
  isYagiInternalMember: boolean;
  /** Phase 7 Wave B.1 + C.0 — current active workspace's kind. Used to gate
   *  every kind-bound entry in the GROUPS table (dashboard / projects /
   *  campaign_request / my_submissions / recommended_artist / meetings) plus
   *  the standalone [+ 새 프로젝트 시작] CTA at top. */
  activeWorkspaceKind?: WorkspaceKindForNav | null;
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

  // Phase 7 Wave C.0 — [+ 새 프로젝트 시작] is the standalone primary CTA at
  // the top, replacing the Wave B [+ 캠페인 요청] in that slot. Same
  // brand/artist kind gate (creator + plain yagi_admin admin workspace
  // wouldn't start a project from this surface).
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
                "flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium border transition-colors",
                newProjectActive
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border hover:border-foreground/40 hover:bg-accent/50",
              )}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t("new_project_cta")}</span>
            </Link>
          </div>
        )}
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
  // Phase 2.7.1 P12-3: bumped resting contrast (muted → 85) and active
  // weight (font-semibold) so the active item reads as anchor, not label.
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
