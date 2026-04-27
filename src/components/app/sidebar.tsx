"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarScopeSwitcher } from "./sidebar-scope-switcher";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { SidebarPublicExit } from "./sidebar-public-exit";
import type { AppContext } from "@/lib/app/context";

function isYagiInternal(context: AppContext): boolean {
  return context.workspaces.some((w) => w.slug === "yagi-internal");
}

function SidebarBody({
  context,
  onNavigate,
}: {
  context: AppContext;
  onNavigate?: () => void;
}) {
  const internalMember = isYagiInternal(context);
  return (
    <div
      className="flex flex-col h-full min-h-0"
      onClickCapture={(e) => {
        if (!onNavigate) return;
        const target = e.target as HTMLElement;
        if (target.closest("a")) onNavigate();
      }}
    >
      {/* Phase 2.8.5 — brand block + workspace label split into two rows
          with their own dividers so the workspace identity reads as
          "you are in <workspace>" rather than as a navigation chrome. */}
      <div className="px-5 py-4 border-b border-border">
        <SidebarBrand />
      </div>
      <div className="px-5 py-3 border-b border-border/60">
        <SidebarScopeSwitcher onNavigate={onNavigate} />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav
          roles={context.workspaceRoles}
          profileRole={context.profile.role}
          isYagiInternalMember={internalMember}
        />
      </div>
      <div className="p-3 border-t border-border space-y-1">
        <SidebarUserMenu
          profile={context.profile}
          workspaceRoles={context.workspaceRoles}
          isYagiInternalMember={internalMember}
        />
        <SidebarPublicExit />
      </div>
    </div>
  );
}

export function Sidebar({ context }: { context: AppContext }) {
  return (
    <aside
      aria-label="Main navigation"
      className="hidden md:flex w-[240px] shrink-0 border-r border-border bg-background flex-col min-h-dvh"
    >
      <SidebarBody context={context} />
    </aside>
  );
}

export function MobileSidebarSheet({ context }: { context: AppContext }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open navigation"
      >
        <Menu className="w-4 h-4" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-[260px] max-w-[80vw] flex flex-col"
      >
        <SheetTitle className="sr-only">Main navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Switch scope, navigate sections, and manage your account.
        </SheetDescription>
        <SidebarBody context={context} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
