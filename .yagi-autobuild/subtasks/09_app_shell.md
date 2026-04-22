---
id: 09
name: App shell (sidebar + dashboard)
status: pending
assigned_to: executor
---

# Subtask 09 — App Shell

## Goal
Build the authenticated app shell: auth-guarded layout, 240px left sidebar, and an empty-state dashboard with two disabled tabs.

## Files to create (7 files)

```
src/lib/app/context.ts                                  — fetchAppContext() server helper
src/lib/app/signout-action.ts                           — signOutAction server action
src/app/[locale]/(app)/layout.tsx                       — auth guard + renders sidebar + children
src/app/[locale]/(app)/page.tsx                         — dashboard (empty state)
src/components/app/sidebar.tsx                          — server component shell that imports client subcomponents
src/components/app/sidebar-workspace-switcher.tsx       — client component
src/components/app/sidebar-nav.tsx                      — client component
src/components/app/sidebar-user-menu.tsx                — client component
```

## File 1: `src/lib/app/context.ts`

Server-only helper that fetches everything the app shell needs.

```ts
import { createSupabaseServer } from "@/lib/supabase/server";

export type Role = "creator" | "workspace_admin" | "workspace_member" | "yagi_admin";

export type AppContext = {
  userId: string;
  profile: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    locale: "ko" | "en";
  };
  roles: Role[];
  workspaces: { id: string; name: string; slug: string }[];
  currentWorkspaceId: string | null;
};

export async function fetchAppContext(): Promise<AppContext | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, locale")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: rolesRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (rolesRows ?? []).map((r) => r.role as Role);

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const workspaces =
    (memberRows ?? [])
      .map((row) => row.workspaces)
      .filter((ws): ws is { id: string; name: string; slug: string } => !!ws);

  return {
    userId: user.id,
    profile: {
      id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      locale: profile.locale as "ko" | "en",
    },
    roles,
    workspaces,
    currentWorkspaceId: workspaces[0]?.id ?? null,
  };
}
```

## File 2: `src/lib/app/signout-action.ts`

```ts
"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
```

## File 3: `src/app/[locale]/(app)/layout.tsx`

Server component. Redirects to `/signin` if no user, to `/onboarding` if no profile.

```tsx
import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { Sidebar } from "@/components/app/sidebar";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/signin", locale });

  const ctx = await fetchAppContext();
  if (!ctx) redirect({ href: "/onboarding", locale });

  return (
    <div className="min-h-dvh flex">
      <Sidebar context={ctx} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
```

## File 4: `src/app/[locale]/(app)/page.tsx`

Server component. Empty-state dashboard with two disabled tabs.

```tsx
import { getTranslations } from "next-intl/server";
import { fetchAppContext } from "@/lib/app/context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AppDashboardPage() {
  const t = await getTranslations("dashboard");
  const ctx = await fetchAppContext();

  const isYagiAdmin = ctx?.roles.includes("yagi_admin") ?? false;
  const isCreator = ctx?.roles.includes("creator") ?? false;

  if (isYagiAdmin) {
    return (
      <div className="px-10 py-12 max-w-5xl">
        <h1 className="font-display text-3xl tracking-tight mb-2">
          <em>All projects</em>
        </h1>
        <p className="text-sm text-muted-foreground">Across all workspaces</p>
        <div className="mt-10 text-sm text-muted-foreground">
          {/* Phase 1.2+ */}
          (admin project list placeholder)
        </div>
      </div>
    );
  }

  if (isCreator) {
    return (
      <div className="px-10 py-12 max-w-5xl">
        <h1 className="font-display text-3xl tracking-tight mb-2">
          <em>Creator dashboard</em>
        </h1>
        <p className="text-sm text-muted-foreground">Contests &amp; submissions</p>
        <div className="mt-10 text-sm text-muted-foreground">
          {/* Phase 2 */}
          (creator contest list placeholder)
        </div>
      </div>
    );
  }

  // Client (workspace_admin / workspace_member) view
  return (
    <div className="px-10 py-12 max-w-5xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-1">
            <em>Projects</em>
          </h1>
          <p className="text-sm text-muted-foreground">
            {ctx?.workspaces[0]?.name}
          </p>
        </div>
        <Button size="lg" disabled title={t("coming_soon")}>
          {t("new_project")}
        </Button>
      </div>

      <Tabs defaultValue="direct" className="w-full">
        <TabsList>
          <TabsTrigger value="direct" disabled>
            {t("direct_tab")}
          </TabsTrigger>
          <TabsTrigger value="contest" disabled>
            {t("contest_tab")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-16 flex flex-col items-center justify-center text-center py-20 border border-dashed border-border rounded-lg">
        <p className="font-display text-xl tracking-tight mb-2">
          <em>{t("empty_title")}</em>
        </p>
        <p className="text-sm text-muted-foreground">{t("empty_sub")}</p>
      </div>
    </div>
  );
}
```

## File 5: `src/components/app/sidebar.tsx`

Server component that assembles the sidebar from its client subcomponents.

```tsx
import { SidebarWorkspaceSwitcher } from "./sidebar-workspace-switcher";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";
import type { AppContext } from "@/lib/app/context";

export function Sidebar({ context }: { context: AppContext }) {
  return (
    <aside className="w-[240px] shrink-0 border-r border-border bg-background flex flex-col min-h-dvh">
      <div className="p-5 border-b border-border">
        <SidebarWorkspaceSwitcher
          workspaces={context.workspaces}
          currentWorkspaceId={context.currentWorkspaceId}
        />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav roles={context.roles} />
      </div>
      <div className="p-3 border-t border-border">
        <SidebarUserMenu profile={context.profile} />
      </div>
    </aside>
  );
}
```

## File 6: `src/components/app/sidebar-workspace-switcher.tsx`

Client component. Single workspace → plain text. Multiple → dropdown.

```tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";

type WS = { id: string; name: string; slug: string };

export function SidebarWorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: WS[];
  currentWorkspaceId: string | null;
}) {
  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  if (!current) {
    return (
      <p className="font-display text-base tracking-tight text-muted-foreground">
        No workspace
      </p>
    );
  }

  if (workspaces.length === 1) {
    return (
      <p className="font-display text-base tracking-tight">
        <em>{current.name}</em>
      </p>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center justify-between group">
        <span className="font-display text-base tracking-tight">
          <em>{current.name}</em>
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        {workspaces.map((ws) => (
          <DropdownMenuItem key={ws.id}>{ws.name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## File 7: `src/components/app/sidebar-nav.tsx`

Client component. Renders nav items filtered by roles.

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  FolderKanban,
  Clapperboard,
  Store,
  Users,
  Receipt,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Role } from "@/lib/app/context";

type Item = {
  key: string;
  href: string;
  icon: typeof FolderKanban;
  disabled?: boolean;
  roles: Role[];
};

const items: Item[] = [
  { key: "projects", href: "/app", icon: FolderKanban, roles: ["workspace_admin", "workspace_member"] },
  { key: "storyboards", href: "/app/storyboards", icon: Clapperboard, disabled: true, roles: ["workspace_admin", "workspace_member"] },
  { key: "brands", href: "/app/brands", icon: Store, disabled: true, roles: ["workspace_admin"] },
  { key: "team", href: "/app/team", icon: Users, disabled: true, roles: ["workspace_admin"] },
  { key: "billing", href: "/app/billing", icon: Receipt, disabled: true, roles: ["workspace_admin"] },
  { key: "settings", href: "/app/settings", icon: Settings, disabled: true, roles: ["workspace_admin", "workspace_member"] },
];

const adminItems: Item[] = [
  { key: "admin", href: "/app/admin", icon: ShieldCheck, disabled: true, roles: ["yagi_admin"] },
];

export function SidebarNav({ roles }: { roles: Role[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const visible = items.filter((i) => i.roles.some((r) => roles.includes(r)));
  const admin = adminItems.filter((i) => roles.includes("yagi_admin"));

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex flex-col gap-0.5 px-2">
        {visible.map((item) => (
          <NavLink key={item.key} item={item} label={t(item.key)} active={pathname === item.href} />
        ))}
        {admin.length > 0 && (
          <>
            <div className="h-px bg-border mx-2 my-2" />
            {admin.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                label={t(item.key)}
                active={pathname === item.href}
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
```

## File 8: `src/components/app/sidebar-user-menu.tsx`

Client component. Avatar + display_name → dropdown with Sign out.

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/app/signout-action";

type Profile = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

export function SidebarUserMenu({ profile }: { profile: Profile }) {
  const c = useTranslations("common");
  const initials = profile.display_name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || profile.handle.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors">
        <Avatar className="w-7 h-7">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] truncate">{profile.display_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">@{profile.handle}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="min-w-[180px]">
        <DropdownMenuItem disabled className="text-xs">
          @{profile.handle}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button type="submit" className="w-full">
            <DropdownMenuItem asChild>
              <span className="flex items-center gap-2 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
                {c("signout")}
              </span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Acceptance criteria

- [ ] All 8 files created
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `(app)/layout.tsx` redirects to `/signin` if no user, `/onboarding` if no profile
- [ ] Dashboard page renders different content for yagi_admin vs creator vs client roles
- [ ] Sidebar shows workspace name (Fraunces italic) at top
- [ ] Sidebar nav filters by role: workspace_admin sees Projects/Storyboards/Brands/Team/Billing/Settings; creator sees none (empty); yagi_admin additionally sees Admin section
- [ ] Sign out form submits to `signOutAction` server action which calls `supabase.auth.signOut()` and redirects to `/`
- [ ] No other files touched

## Write result to `.yagi-autobuild/results/09_app_shell.md`

Standard format with tsc output. Note any TS fix-ups you had to make.

## Notes for executor

- Lucide icons: the installed version (1.8.0) has named exports. If imports fail, run `grep FolderKanban node_modules/lucide-react/dist/lucide-react.d.ts` to verify.
- `Role` type is re-exported from `@/lib/app/context` — make sure that `export type Role` is present in that file.
- Server actions imported from `@/lib/app/signout-action` must have `"use server"` at top.
- The `redirect` from `next/navigation` (used in signout-action) differs from `redirect` from `@/i18n/routing` — the former is plain Next.js redirect to any URL, the latter is next-intl-aware. Use plain `redirect("/")` for signout since it returns to the root landing page (locale picker).
- `<form action={signOutAction}>` pattern: Next 15 supports passing a server action directly as the form `action` prop.
- The existing `src/app/[locale]/page.tsx` (landing page) uses `useTranslations` from `next-intl` as a sync hook, not `getTranslations`. Server components in route groups should use `getTranslations` from `next-intl/server` for async-first behavior in Next 15.
