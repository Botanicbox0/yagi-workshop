// Phase 2.5 launchpad X1 CRITICAL #3 + #6 — centralized status pill helper.
//
// Replaces the six (+) ad-hoc `statusBadgeClass` / `getStatusBadgeVariant`
// implementations scattered across `src/app/[locale]/app/**/page.tsx` with
// a single source of truth. Each consumer calls `statusPillClass(kind,
// status)` and gets back a className using semantic tokens from
// `src/app/globals.css` (`--success`, `--warning`, `--info`, plus existing
// `--muted` / `--foreground` / `--destructive`).
//
// Adding a new kind → add an entry here; page code unchanged.
// Changing the palette → edit the tokens in globals.css; every consumer
// refreshes simultaneously. Phase 2.5 challenge states plug into the same
// helper (see `kind: 'challenge'` below) — avoids the "5th dialect"
// drift risk X1 flagged.

export type StatusKind =
  | "project"
  | "invoice"
  | "meeting"
  | "challenge"
  | "showcase"
  | "submission"             // Phase 2.5 G3 §F.2 — creator's view of own challenge_submissions
  | "campaign_submission";   // Wave C v2 — creator's view of own campaign_submissions

export type StatusTone =
  | "neutral"   // grey / muted — idle/archived
  | "success"   // green — done/approved/paid
  | "warning"   // amber — needs action / stale
  | "info"      // blue — in progress / intermediate
  | "emphasis"  // solid foreground — live/active
  | "danger"    // red — void / failed / cancelled
  | "sage_full" // Wave C v2 MED-7 — full sage, action-needed state
  | "sage_soft";// Wave C v2 MED-7 — soft sage, terminal-success state

// Tone → semantic-token className mapping. One row, one concept.
const TONE_CLASS: Record<StatusTone, string> = {
  neutral:   "border-transparent bg-muted text-muted-foreground",
  success:   "border-transparent bg-success text-success-foreground",
  warning:   "border-transparent bg-warning text-warning-foreground",
  info:      "border-transparent bg-info text-info-foreground",
  emphasis:  "border-transparent bg-foreground text-background",
  danger:    "border-transparent bg-destructive/15 text-destructive",
  // Wave C v2 MED-7: sage tokens for campaign_submission narrative arc.
  // Loud sage = "your action is needed" (approved_for_distribution).
  // Soft sage = "this is at rest, completed" (distributed).
  sage_full: "border-transparent bg-sage text-sage-ink",
  sage_soft: "border-transparent bg-sage-soft text-sage-ink",
};

// Kind × status → tone mapping. Owns all the per-domain semantic choices
// so page files don't re-invent them.
const KIND_TONE: Record<StatusKind, Record<string, StatusTone>> = {
  project: {
    draft:         "neutral",
    submitted:     "info",
    in_discovery:  "emphasis",
    in_production: "emphasis",
    in_revision:   "emphasis",
    delivered:     "success",
    approved:      "success",
    archived:      "neutral",
  },
  invoice: {
    draft:  "neutral",
    issued: "info",
    paid:   "success",
    void:   "danger",
  },
  meeting: {
    scheduled: "info",
    completed: "success",
    cancelled: "danger",
  },
  // Phase 2.5 challenge lifecycle (SPEC v2 §1 challenge state field).
  challenge: {
    draft:              "neutral",
    open:               "emphasis",
    closed_judging:     "info",
    closed_announced:   "success",
    archived:           "neutral",
  },
  showcase: {
    draft:     "neutral",
    published: "emphasis",
    archived:  "neutral",
  },
  // Phase 2.5 challenge_submissions — creator's view of own work. Public
  // gallery surfaces `ready` only via RLS; creator sees full lifecycle.
  submission: {
    created:    "info",       // 올렸어요 — just submitted
    processing: "warning",    // 확인 중 — media processing / admin review
    ready:      "emphasis",   // 공개됨 — visible in gallery
    rejected:   "neutral",    // 확인 필요 — soft framing per G3 DP §F.2
  },
  // Wave C v2 campaign_submissions — creator's view of own work. Narrative
  // arc:
  //   submitted → approved_for_distribution (CTA — applicant must act)
  //               or declined / revision_requested
  //   approved_for_distribution → distributed (terminal success)
  //
  // MED-7 fix (K-06 LOOP-1 #6): semantic weight escalates TOWARD the CTA
  // state, not away from it. Full sage on approved_for_distribution
  // (signals action), soft sage on distributed (signals completion).
  campaign_submission: {
    submitted:                  "neutral",
    approved_for_distribution:  "sage_full",
    declined:                   "neutral",
    revision_requested:         "warning",
    distributed:                "sage_soft",
    withdrawn:                  "neutral",
  },
};

/**
 * Return the className string for a status pill.
 * Unknown kind + status combinations fall back to `neutral` tone.
 */
export function statusPillClass(kind: StatusKind, status: string): string {
  const kindMap = KIND_TONE[kind];
  const tone = (kindMap && kindMap[status]) ?? "neutral";
  return TONE_CLASS[tone];
}
