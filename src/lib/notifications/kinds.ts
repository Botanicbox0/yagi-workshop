// Phase 1.8 — closed set of notification kinds, with their severity tier.
// Do not add new kinds without also updating:
//   - messages/{ko,en}.json -> notifications.events.<kind>.{title,body}
//   - SEVERITY_BY_KIND below
//   - phase-1-8-spec.md event-kind table

export type NotificationKind =
  | "meeting_scheduled"
  | "meeting_summary_sent"
  | "invoice_issued"
  | "board_shared"
  | "board_approved"
  | "showcase_published"
  | "frame_uploaded_batch"
  | "revision_uploaded"
  | "feedback_received"
  | "thread_message_new"
  | "team_channel_mention"
  // Phase 2.5 G5/G7 — challenge lifecycle notifications
  | "challenge_submission_confirmed"
  | "challenge_closing_soon"
  | "challenge_announced_winner"
  | "challenge_announced_participant"
  // Phase 2.8.2 G_B2_E — @yagi / @admin / @client mention in a brief thread
  | "thread_mention"
  // Phase 2.8.6 — client-initiated meeting flow + workspace-scoped support chat
  | "meeting_requested"
  | "meeting_confirmed"
  | "meeting_rescheduled"
  | "meeting_cancelled"
  | "support_message_new";

export type NotificationSeverity = "high" | "medium" | "low";

export const SEVERITY_BY_KIND: Record<NotificationKind, NotificationSeverity> = {
  meeting_scheduled: "high",
  meeting_summary_sent: "high",
  invoice_issued: "high",
  board_shared: "high",
  board_approved: "high",
  showcase_published: "high",
  frame_uploaded_batch: "medium",
  revision_uploaded: "medium",
  feedback_received: "medium",
  thread_message_new: "low",
  team_channel_mention: "low",
  // Phase 2.5 G5/G7
  challenge_submission_confirmed: "medium",
  challenge_closing_soon: "high",
  challenge_announced_winner: "high",
  challenge_announced_participant: "medium",
  thread_mention: "high",
  meeting_requested: "high",
  meeting_confirmed: "high",
  meeting_rescheduled: "high",
  meeting_cancelled: "high",
  support_message_new: "medium",
};

export function severityOf(kind: NotificationKind): NotificationSeverity {
  return SEVERITY_BY_KIND[kind];
}
