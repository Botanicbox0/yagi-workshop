export type UrgencyTier = "normal" | "h24" | "h1";

export function computeUrgencyTier(closeAt: Date | string | null): UrgencyTier {
  if (!closeAt) {
    return "normal";
  }

  const closeDate = typeof closeAt === "string" ? new Date(closeAt) : closeAt;
  const now = new Date();
  const diffMs = closeDate.getTime() - now.getTime();

  if (diffMs < 0) {
    return "normal";
  }

  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    return "h1";
  }

  if (diffHours < 24) {
    return "h24";
  }

  return "normal";
}
