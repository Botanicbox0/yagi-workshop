import {
  describeReleasedRound,
  getRevisionUsage,
} from "@/lib/project-deliverables/release-state";

export type RevisionRoundLabels = {
  initialDelivery: string;
  revisionRound: string;
  revisionUsage: string;
  scopeIncludedRevisions: string;
};

export function formatReleasedRoundLabel(
  releasedRound: number | null,
  labels: Pick<RevisionRoundLabels, "initialDelivery" | "revisionRound">,
) {
  const description = describeReleasedRound(releasedRound);
  if (description.kind === "initial") return labels.initialDelivery;
  return labels.revisionRound.replace(
    "{n}",
    String(description.revisionNumber ?? 0),
  );
}

export function formatRevisionUsageLabel(
  input: {
    releasedCount: number;
    revisionRoundsLimit: number;
  },
  label: string,
) {
  const usage = getRevisionUsage(input);
  return label
    .replace("{used}", String(usage.revisionsUsed))
    .replace("{limit}", String(usage.revisionsLimit));
}

export function formatScopeIncludedRevisionsLabel(limit: number, label: string) {
  return label.replace("{n}", String(limit));
}
