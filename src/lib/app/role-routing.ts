import type { ActiveWorkspaceMembership } from "@/lib/workspace/active";

export type AppActorKind = "brand" | "artist" | "creator" | "yagi_admin";

export function resolveAppActor(
  activeWorkspace: ActiveWorkspaceMembership | null,
  isYagiAdmin: boolean,
): AppActorKind | null {
  if (activeWorkspace?.kind === "yagi_admin") return "yagi_admin";
  if (
    activeWorkspace?.kind === "brand" ||
    activeWorkspace?.kind === "artist" ||
    activeWorkspace?.kind === "creator"
  ) {
    return activeWorkspace.kind;
  }
  if (!activeWorkspace && isYagiAdmin) return "yagi_admin";
  return null;
}

export function getAppLandingPath(actor: AppActorKind): string {
  switch (actor) {
    case "yagi_admin":
      return "/app/admin";
    case "brand":
      return "/app/explore";
    case "artist":
      return "/app/deals";
    case "creator":
      return "/app/campaigns";
  }
}

export function getAppLandingHref(
  locale: string,
  actor: AppActorKind | null,
): string {
  if (!actor) return `/${locale}/onboarding`;
  return `/${locale}${getAppLandingPath(actor)}`;
}
