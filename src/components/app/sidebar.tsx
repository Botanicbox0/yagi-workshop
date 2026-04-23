import { SidebarWorkspaceSwitcher } from "./sidebar-workspace-switcher";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";
import type { AppContext } from "@/lib/app/context";

export function Sidebar({ context }: { context: AppContext }) {
  const isYagiInternalMember = context.workspaces.some(
    (w) => w.slug === "yagi-internal"
  );
  return (
    <aside className="w-[240px] shrink-0 border-r border-border bg-background flex flex-col min-h-dvh">
      <div className="p-5 border-b border-border">
        <SidebarWorkspaceSwitcher
          workspaces={context.workspaces}
          currentWorkspaceId={context.currentWorkspaceId}
        />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav
          roles={context.workspaceRoles}
          isYagiInternalMember={isYagiInternalMember}
        />
      </div>
      <div className="p-3 border-t border-border">
        <SidebarUserMenu profile={context.profile} />
      </div>
    </aside>
  );
}
