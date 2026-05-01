"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase,
  Check,
  ChevronsUpDown,
  ShieldCheck,
} from "lucide-react";
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
  const Icon = kind === "workspace" ? Briefcase : ShieldCheck;
  return <Icon className={cn("w-3.5 h-3.5 shrink-0", className)} />;
}

function scopeLabel(scope: Scope): string {
  return scope.name;
}

export function SidebarScopeSwitcher({
  onNavigate,
}: {
  /** Optional callback fired immediately before `router.push`, used by the
   *  mobile sheet to close itself since scope selection is programmatic
   *  navigation (no <a> for the anchor-capture handler to catch). */
  onNavigate?: () => void;
} = {}) {
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
    // Phase 2.8.5 — single-workspace clients see a plain workspace
    // label (no dropdown affordance, no icon). Yagi's intent: clients
    // need to know which Workshop they are in, but switching is N/A
    // when there is only one. Q-084 holds — labels say "Workshop"
    // not "Workspace" but the workspace name itself shows verbatim.
    return (
      <p
        className="text-sm font-medium text-foreground truncate"
        aria-label="Current Workshop"
      >
        {scopeLabel(active)}
      </p>
    );
  }

  return (
    <MultiScopeSwitcher
      scopes={scopes}
      active={active}
      onSelect={(scope) => {
        onNavigate?.();
        router.push(scope.href);
      }}
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

  const workspaceScopes = scopes.filter((s) => s.kind === "workspace");
  const adminScopes = scopes.filter((s) => s.kind === "admin");

  function scopeKey(scope: Scope): string {
    return scope.kind === "workspace" ? `workspace:${scope.id}` : "admin";
  }

  function renderItem(scope: Scope) {
    return (
      <DropdownMenuItem
        key={scopeKey(scope)}
        onSelect={() => onSelect(scope)}
        className="flex items-center gap-2"
      >
        <ScopeIcon kind={scope.kind} />
        <span className="truncate flex-1">{scopeLabel(scope)}</span>
        {scope.active && (
          <Check className="w-3.5 h-3.5 text-foreground shrink-0" />
        )}
      </DropdownMenuItem>
    );
  }

  const sectionLabelClass =
    "text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium px-2 py-1";

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
            <span className="truncate">{scopeLabel(active)}</span>
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[240px]">
          {workspaceScopes.length > 0 && (
            <>
              <DropdownMenuLabel className={sectionLabelClass}>
                Workshops
              </DropdownMenuLabel>
              {workspaceScopes.map(renderItem)}
            </>
          )}
          {adminScopes.length > 0 && (
            <>
              {workspaceScopes.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className={sectionLabelClass}>
                Admin
              </DropdownMenuLabel>
              {adminScopes.map(renderItem)}
            </>
          )}
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
