export type DeliverableTurnState =
  | "internal"
  | "client_review"
  | "yagi_revision"
  | "approved";

export type ReleasedRoundSource = {
  id: string;
  version: number;
  releasedAt: string | null;
};

export function buildReleasedRoundMap<T extends ReleasedRoundSource>(
  deliverables: T[],
) {
  return new Map(
    deliverables
      .filter((deliverable) => deliverable.releasedAt)
      .sort((a, b) => {
        const aReleased = new Date(a.releasedAt as string).getTime();
        const bReleased = new Date(b.releasedAt as string).getTime();
        if (aReleased !== bReleased) return aReleased - bReleased;
        return a.version - b.version;
      })
      .map((deliverable, index) => [deliverable.id, index + 1]),
  );
}

export function describeReleasedRound(
  index: number | null,
): { kind: "initial" | "revision"; revisionNumber: number | null } {
  if (index == null) return { kind: "initial", revisionNumber: null };
  if (index <= 1) return { kind: "initial", revisionNumber: null };
  return { kind: "revision", revisionNumber: index - 1 };
}

export function getRevisionUsage(input: {
  releasedCount: number;
  revisionRoundsLimit: number;
}): {
  revisionsUsed: number;
  revisionsLimit: number;
  atCap: boolean;
  overCap: boolean;
} {
  const revisionsUsed = Math.max(0, input.releasedCount - 1);
  const allowed = 1 + input.revisionRoundsLimit;
  return {
    revisionsUsed,
    revisionsLimit: input.revisionRoundsLimit,
    atCap: input.releasedCount >= allowed,
    overCap: input.releasedCount > allowed,
  };
}

export function getDeliverableTurnState(input: {
  releasedAt: string | null;
  status: string;
}): DeliverableTurnState {
  if (!input.releasedAt) return "internal";
  if (input.status === "changes_requested") return "yagi_revision";
  if (input.status === "approved") return "approved";
  return "client_review";
}
