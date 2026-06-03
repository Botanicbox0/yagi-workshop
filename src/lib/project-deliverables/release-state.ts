export const INCLUDED_REVISION_ROUNDS = 2;

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

export function getDeliverableTurnState(input: {
  releasedAt: string | null;
  status: string;
}): DeliverableTurnState {
  if (!input.releasedAt) return "internal";
  if (input.status === "changes_requested") return "yagi_revision";
  if (input.status === "approved") return "approved";
  return "client_review";
}
