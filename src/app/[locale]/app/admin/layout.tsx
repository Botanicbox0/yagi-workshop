import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { fetchAppContext } from "@/lib/app/context";
import {
  listOwnWorkspaces,
  resolveActiveWorkspace,
} from "@/lib/workspace/active";
import { AdminWorkspaceSwitchNotice } from "./workspace-switch-notice";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const ctx = await fetchAppContext();
  if (!ctx) {
    redirect({ href: "/", locale });
    return null;
  }
  if (!ctx.workspaceRoles.includes("yagi_admin")) {
    redirect({ href: "/app", locale });
    return null;
  }

  const [activeWorkspace, ownWorkspaces] = await Promise.all([
    resolveActiveWorkspace(ctx.userId),
    listOwnWorkspaces(ctx.userId),
  ]);

  if (activeWorkspace?.kind !== "yagi_admin") {
    const internalWorkspace =
      ownWorkspaces.find((workspace) => workspace.kind === "yagi_admin") ??
      null;

    return (
      <AdminWorkspaceSwitchNotice
        currentWorkspaceName={activeWorkspace?.name ?? null}
        internalWorkspace={
          internalWorkspace
            ? { id: internalWorkspace.id, name: internalWorkspace.name }
            : null
        }
      />
    );
  }

  return <>{children}</>;
}
