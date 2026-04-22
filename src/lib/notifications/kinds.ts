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
  | "team_channel_mention";

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
};

export function severityOf(kind: NotificationKind): NotificationSeverity {
  return SEVERITY_BY_KIND[kind];
}
