import type { ChallengeState } from "./types";

/** Allowed challenge state transitions (yagi-decided 2026-04-24). */
export const ALLOWED_TRANSITIONS: Readonly<Record<ChallengeState, readonly ChallengeState[]>> = {
  draft: ["open"],
  open: ["closed_judging"],
  closed_judging: ["closed_announced", "open"],  // reopen allowed (Q-024)
  closed_announced: ["archived"],
  archived: [],
} as const;

export function isValidTransition(from: ChallengeState, to: ChallengeState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedNextStates(from: ChallengeState): readonly ChallengeState[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}
