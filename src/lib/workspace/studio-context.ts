import type { ActiveWorkspaceMembership } from "@/lib/workspace/active";

export function isStudioContext(
  activeWorkspace: Pick<ActiveWorkspaceMembership, "kind"> | null | undefined,
  isYagiAdmin: boolean,
): boolean {
  return activeWorkspace?.kind === "yagi_admin" && isYagiAdmin;
}
