import type { AppContext } from "@/lib/app/context";

/**
 * A user's "scope" — one of the things they can be acting as right now.
 * Used by the sidebar scope switcher (Phase 2.6 G2) and by G6 profile
 * edit-affordance detection ("is this visitor the owner?").
 */
export type Scope =
  | { kind: "workspace"; id: string; name: string; href: string; active: boolean }
  | { kind: "profile"; handle: string; display_name: string; href: string; active: boolean }
  | { kind: "admin"; name: string; href: string; active: boolean };

export function getUserScopes(ctx: AppContext, currentPath?: string): Scope[] {
  const scopes: Scope[] = [];

  for (const ws of ctx.workspaces) {
    scopes.push({
      kind: "workspace",
      id: ws.id,
      name: ws.name,
      href: "/app",
      active:
        (currentPath?.startsWith("/app") &&
          !currentPath?.startsWith("/app/admin")) ||
        false,
    });
  }

  if (ctx.profile.role === "creator" || ctx.profile.role === "studio") {
    scopes.push({
      kind: "profile",
      handle: ctx.profile.handle,
      display_name: ctx.profile.display_name,
      href: `/u/${ctx.profile.handle}`,
      active: currentPath?.startsWith(`/u/${ctx.profile.handle}`) || false,
    });
  }

  if (ctx.workspaceRoles.includes("yagi_admin")) {
    scopes.push({
      kind: "admin",
      name: "Yagi Admin",
      href: "/app/admin",
      active: currentPath?.startsWith("/app/admin") || false,
    });
  }

  return scopes;
}
