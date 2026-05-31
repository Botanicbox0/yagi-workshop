"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  Compass,
  Coffee,
  CreditCard,
  ClipboardList,
  FolderOpen,
  Handshake,
  Menu,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { NotificationBell } from "@/components/app/notification-bell";
import { PageHelpLink } from "@/components/app/page-help-link";
import { SidebarUserMenu } from "@/components/app/sidebar-user-menu";
import {
  WorkspaceSwitcher,
  type WorkspaceItem,
} from "@/components/sidebar/workspace-switcher";
import { cn } from "@/lib/utils";
import type { AppContext } from "@/lib/app/context";
import {
  getAppLandingPath,
  resolveAppActor,
  type AppActorKind,
} from "@/lib/app/role-routing";

type TopNavItem = {
  key:
    | "explore"
    | "projects"
    | "campaigns"
    | "discover"
    | "twins"
    | "deals"
    | "my_submissions"
    | "billing"
    | "americano"
    | "admin";
  href: string;
  icon: LucideIcon;
};

const TOP_NAV_ITEMS: TopNavItem[] = [
  { key: "explore", href: "/app/explore", icon: Sparkles },
  { key: "projects", href: "/app/projects", icon: FolderOpen },
  { key: "campaigns", href: "/app/campaigns", icon: Megaphone },
  { key: "discover", href: "/app/discover", icon: Compass },
  { key: "twins", href: "/app/twins", icon: UserRound },
  { key: "deals", href: "/app/deals", icon: Handshake },
  { key: "my_submissions", href: "/app/my-submissions", icon: ClipboardList },
  { key: "billing", href: "/app/billing", icon: CreditCard },
  { key: "americano", href: "/app/americano", icon: Coffee },
  { key: "admin", href: "/app/admin", icon: ShieldCheck },
];

const TOP_NAV_BY_ACTOR: Record<AppActorKind, TopNavItem["key"][]> = {
  brand: [
    "explore",
    "projects",
    "campaigns",
    "discover",
    "billing",
    "americano",
  ],
  artist: ["explore", "twins", "deals"],
  creator: ["campaigns", "my_submissions"],
  yagi_admin: ["admin", "billing", "americano"],
};

export function TopNav({
  context,
  activeWorkspace,
  workspaces,
  initialUnreadCount,
  locale,
}: {
  context: AppContext;
  activeWorkspace: WorkspaceItem | null;
  workspaces: WorkspaceItem[];
  initialUnreadCount: number;
  locale: "ko" | "en";
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isYagiInternalMember = useMemo(
    () => context.workspaces.some((w) => w.slug === "yagi-internal"),
    [context.workspaces],
  );
  const isYagiAdmin = context.workspaceRoles.includes("yagi_admin");
  const actor = resolveAppActor(activeWorkspace, isYagiAdmin);
  const homeHref = actor ? getAppLandingPath(actor) : "/app";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="YAGI Workshop"
        >
          <span className="relative h-8 w-8 overflow-hidden rounded-md bg-surface-raised">
            <Image
              src="/brand/yagi-symbol-mono-dark.png"
              alt=""
              fill
              sizes="32px"
              className="object-contain p-1.5"
              priority
            />
          </span>
          <Image
            src="/brand/yagi-wordmark-white.png"
            alt="YAGI"
            width={56}
            height={18}
            className="hidden h-[18px] w-auto sm:block"
            priority
          />
        </Link>

        {activeWorkspace?.isTest && (
          <div className="hidden h-8 items-center rounded-full border border-brand/45 bg-brand-soft px-3 text-[11px] font-semibold uppercase tracking-label text-brand md:flex">
            {t("test_workspace")}
          </div>
        )}

        <DesktopNav
          pathname={pathname}
          t={t}
          actor={actor}
        />

        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
          {actor === "brand" && <CreditBalance label={t("credit_balance")} />}
          <SearchStub label={t("search")} shortcut={t("search_shortcut")} />
          {activeWorkspace && (
            <div className="hidden w-[170px] xl:block">
              <WorkspaceSwitcher
                current={activeWorkspace}
                workspaces={workspaces}
                isYagiAdmin={isYagiAdmin}
              />
            </div>
          )}
          <div className="hidden items-center gap-1 lg:flex">
            <div className="hidden 2xl:block">
              <PageHelpLink />
            </div>
            <div className="hidden 2xl:block">
              <LanguageSwitcher />
            </div>
            <NotificationBell
              initialUnreadCount={initialUnreadCount}
              locale={locale}
              userId={context.userId}
            />
            <SidebarUserMenu
              profile={context.profile}
              workspaceRoles={context.workspaceRoles}
              isYagiInternalMember={isYagiInternalMember}
              contentSide="bottom"
              compact
            />
          </div>
          <MobileMenu
            context={context}
            activeWorkspace={activeWorkspace}
            workspaces={workspaces}
            isYagiAdmin={isYagiAdmin}
            isYagiInternalMember={isYagiInternalMember}
            initialUnreadCount={initialUnreadCount}
            locale={locale}
            pathname={pathname}
            actor={actor}
          />
        </div>
      </div>
    </header>
  );
}

function DesktopNav({
  pathname,
  t,
  actor,
}: {
  pathname: string;
  t: ReturnType<typeof useTranslations>;
  actor: AppActorKind | null;
}) {
  const items = TOP_NAV_ITEMS.filter((item) =>
    isTopNavItemVisible(item, actor),
  );

  return (
    <nav
      className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-2 lg:flex"
      aria-label="Primary"
    >
      {items.map((item) => (
        <TopNavLink
          key={item.key}
          item={item}
          label={t(item.key)}
          active={isActive(pathname, item.href)}
        />
      ))}
    </nav>
  );
}

function TopNavLink({
  item,
  label,
  active,
  onClick,
  mobile = false,
}: {
  item: TopNavItem;
  label: string;
  active: boolean;
  onClick?: () => void;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full text-sm font-medium transition-colors duration-flora ease-flora focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        mobile ? "h-11 w-full justify-start px-3" : "h-9 px-2.5 text-[13px]",
        active
          ? "bg-brand text-brand-on"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="truncate keep-all">{label}</span>
    </Link>
  );
}

function CreditBalance({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden h-9 items-center gap-2 rounded-full border border-border/70 bg-surface-raised px-3 text-xs font-medium text-foreground md:flex",
        className,
      )}
    >
      <WalletCards className="h-4 w-4 text-gold" aria-hidden="true" />
      <span className="whitespace-nowrap keep-all">{label}</span>
    </div>
  );
}

function SearchStub({
  label,
  shortcut,
}: {
  label: string;
  shortcut: string;
}) {
  return (
    <button
      type="button"
      className="hidden h-9 min-w-[128px] items-center gap-2 rounded-full border border-border/70 bg-surface-raised px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground md:flex"
      aria-label={label}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{label}</span>
      <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {shortcut}
      </kbd>
    </button>
  );
}

function MobileMenu({
  context,
  activeWorkspace,
  workspaces,
  isYagiAdmin,
  isYagiInternalMember,
  initialUnreadCount,
  locale,
  pathname,
  actor,
}: {
  context: AppContext;
  activeWorkspace: WorkspaceItem | null;
  workspaces: WorkspaceItem[];
  isYagiAdmin: boolean;
  isYagiInternalMember: boolean;
  initialUnreadCount: number;
  locale: "ko" | "en";
  pathname: string;
  actor: AppActorKind | null;
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const items = TOP_NAV_ITEMS.filter((item) =>
    isTopNavItemVisible(item, actor),
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t("open_menu")}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[min(92vw,360px)] flex-col border-border bg-background p-4"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">YAGI</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pt-6">
          {activeWorkspace && (
            <WorkspaceSwitcher
              current={activeWorkspace}
              workspaces={workspaces}
              isYagiAdmin={isYagiAdmin}
            />
          )}
          {activeWorkspace?.isTest && (
            <div className="rounded-xl border border-brand/45 bg-brand-soft px-3 py-2 text-[11px] font-semibold uppercase tracking-label text-brand">
              {t("test_workspace")}
            </div>
          )}
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2 rounded-xl border border-border/70 bg-surface-raised px-3 text-left text-sm text-muted-foreground"
            aria-label={t("search")}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">{t("search")}</span>
            <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px]">
              {t("search_shortcut")}
            </kbd>
          </button>
          {actor === "brand" && (
            <CreditBalance label={t("credit_balance")} className="!flex" />
          )}
        </div>

        <nav className="mt-6 flex flex-col gap-1" aria-label="Primary">
          {items.map((item) => (
            <TopNavLink
              key={item.key}
              item={item}
              label={t(item.key)}
              active={isActive(pathname, item.href)}
              onClick={() => setOpen(false)}
              mobile
            />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-border/70 pt-4">
          <div className="flex items-center gap-1">
            <PageHelpLink />
            <LanguageSwitcher />
            <NotificationBell
              initialUnreadCount={initialUnreadCount}
              locale={locale}
              userId={context.userId}
            />
          </div>
          <SidebarUserMenu
            profile={context.profile}
            workspaceRoles={context.workspaceRoles}
            isYagiInternalMember={isYagiInternalMember}
            contentSide="top"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isTopNavItemVisible(
  item: TopNavItem,
  actor: AppActorKind | null,
): boolean {
  if (!actor) return false;
  return TOP_NAV_BY_ACTOR[actor].includes(item.key);
}
