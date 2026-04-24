"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, ChevronsUpDown, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserScopes } from "@/lib/app/use-user-scopes";
import type { Scope } from "@/lib/app/scopes";

const FIRST_USE_STORAGE_KEY = "yagi.scopeSelector.firstUseSeen";

function ScopeIcon({
  kind,
  className,
}: {
  kind: Scope["kind"];
  className?: string;
}) {
  const Icon =
    kind === "workspace" ? Briefcase : kind === "profile" ? User : ShieldCheck;
  return <Icon className={cn("w-3.5 h-3.5 shrink-0", className)} />;
}

function scopeLabel(scope: Scope): string {
  return scope.kind === "workspace"
    ? scope.name
    : scope.kind === "profile"
      ? scope.display_name
      : scope.name;
}

export function SidebarScopeSwitcher() {
  const scopes = useUserScopes();
  const router = useRouter();
  const t = useTranslations("app.scopeSelector");

  const active = scopes.find((s) => s.active) ?? scopes[0];

  if (!active) {
    return (
      <p className="font-display text-base tracking-tight text-muted-foreground">
        —
      </p>
    );
  }

  if (scopes.length === 1) {
    return (
      <p className="font-display text-base tracking-tight flex items-center gap-2">
        <ScopeIcon kind={active.kind} className="text-muted-foreground" />
        <em>{scopeLabel(active)}</em>
      </p>
    );
  }

  return (
    <MultiScopeSwitcher
      scopes={scopes}
      active={active}
      onSelect={(scope) => router.push(scope.href)}
      tooltipLabel={t("firstUseTooltip")}
    />
  );
}

function MultiScopeSwitcher({
  scopes,
  active,
  onSelect,
  tooltipLabel,
}: {
  scopes: Scope[];
  active: Scope;
  onSelect: (scope: Scope) => void;
  tooltipLabel: string;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipShown = useRef(false);

  useEffect(() => {
    if (tooltipShown.current) return;
    try {
      if (localStorage.getItem(FIRST_USE_STORAGE_KEY) === "1") return;
      setTooltipOpen(true);
      tooltipShown.current = true;
    } catch {
      // localStorage unavailable (private mode, SSR hydration race) — skip silently.
    }
  }, []);

  const dismissTooltip = () => {
    setTooltipOpen(false);
    try {
      localStorage.setItem(FIRST_USE_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const ordered: Scope[] = [
    ...scopes.filter((s) => s.kind === "workspace"),
    ...scopes.filter((s) => s.kind === "profile"),
    ...scopes.filter((s) => s.kind === "admin"),
  ];

  return (
    <div className="relative">
      <DropdownMenu
        onOpenChange={(open) => {
          if (open && tooltipOpen) dismissTooltip();
        }}
      >
        <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          <span className="font-display text-base tracking-tight flex items-center gap-2 min-w-0">
            <ScopeIcon kind={active.kind} className="text-muted-foreground" />
            <em className="truncate">{scopeLabel(active)}</em>
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          {ordered.map((scope) => {
            const key =
              scope.kind === "workspace"
                ? `workspace:${scope.id}`
                : scope.kind === "profile"
                  ? `profile:${scope.handle}`
                  : `admin`;
            return (
              <DropdownMenuItem
                key={key}
                onSelect={() => onSelect(scope)}
                className={cn(
                  "flex items-center gap-2",
                  scope.active && "bg-accent",
                )}
              >
                <ScopeIcon kind={scope.kind} />
                <span className="truncate">{scopeLabel(scope)}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {tooltipOpen && (
        <button
          type="button"
          onClick={dismissTooltip}
          className="absolute left-0 top-full mt-2 z-20 rounded-md border border-border bg-foreground text-background text-[11px] leading-snug px-2.5 py-1.5 shadow-sm max-w-[220px] text-left"
          aria-label={tooltipLabel}
        >
          {tooltipLabel}
        </button>
      )}
    </div>
  );
}
