import type { AppContext } from "@/lib/app/context";

/**
 * A user's "scope" — one of the things they can be acting as right now.
 * Used by the sidebar scope switcher.
 *
 * Phase 4.x Wave C.5b sub_02: "profile" scope (legacy /u/<handle>) was
 * dropped along with persona A locking. Only workspace + admin remain.
 */
export type Scope =
  | { kind: "workspace"; id: string; name: string; href: string; active: boolean }
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
