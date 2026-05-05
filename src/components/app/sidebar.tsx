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
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";
import {
  WorkspaceSwitcher,
  type WorkspaceItem,
} from "@/components/sidebar/workspace-switcher";
import type { AppContext } from "@/lib/app/context";

function isYagiInternal(context: AppContext): boolean {
  return context.workspaces.some((w) => w.slug === "yagi-internal");
}

type SidebarProps = {
  context: AppContext;
  /** Phase 4.x task_06 — server-resolved active workspace + full membership list.
   *  When null (zero memberships), the workspace switcher is hidden. The
   *  /app layout redirects to /onboarding/workspace before reaching here in
   *  that case for non-privileged users. */
  activeWorkspace: WorkspaceItem | null;
  workspaces: WorkspaceItem[];
};

function SidebarBody({
  context,
  activeWorkspace,
  workspaces,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const internalMember = isYagiInternal(context);
  // Phase 6/A.2 — gate "+ 새 워크스페이스 만들기" to yagi_admin role only.
  const isYagiAdmin = context.workspaceRoles.includes("yagi_admin");
  return (
    <div
      className="flex flex-col h-full min-h-0"
      onClickCapture={(e) => {
        if (!onNavigate) return;
        const target = e.target as HTMLElement;
        if (target.closest("a")) onNavigate();
      }}
    >
      {/* Phase 4.x task_06 — workspace switcher replaces the older
          SidebarScopeSwitcher at the sidebar top. yagi_admin / profile
          scope switching has been folded into the user menu + nav admin
          entry; the explicit scope switcher file remains for potential
          Phase 5+ reuse. */}
      <div className="px-5 pt-5 pb-3">
        <SidebarBrand />
        {activeWorkspace && (
          <div className="mt-3">
            <WorkspaceSwitcher
              current={activeWorkspace}
              workspaces={workspaces}
              isYagiAdmin={isYagiAdmin}
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pt-1 pb-3">
        <SidebarNav
          roles={context.workspaceRoles}
          profileRole={context.profile.role}
          isYagiInternalMember={internalMember}
        />
      </div>
      <div className="p-3 border-t border-border">
        <SidebarUserMenu
          profile={context.profile}
          workspaceRoles={context.workspaceRoles}
          isYagiInternalMember={internalMember}
        />
      </div>
    </div>
  );
}

export function Sidebar({
  context,
  activeWorkspace,
  workspaces,
}: SidebarProps) {
  return (
    <aside
      aria-label="Main navigation"
      className="hidden md:flex w-[240px] shrink-0 border-r border-border bg-background flex-col min-h-dvh"
    >
      <SidebarBody
        context={context}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
      />
    </aside>
  );
}

export function MobileSidebarSheet({
  context,
  activeWorkspace,
  workspaces,
}: SidebarProps) {
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
        <SidebarBody
          context={context}
          activeWorkspace={activeWorkspace}
          workspaces={workspaces}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
