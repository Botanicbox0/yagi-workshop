// =============================================================================
// Phase 2.8 G_B-6 — Brief comment panel
// =============================================================================
// Server Component wrapper around the existing project ThreadPanelServer
// (Phase 1.x infrastructure). Per SPEC §3.5 + §6, brief comments reuse the
// project_threads + thread_messages tables unchanged; v1 has no
// block-level inline anchoring. Block-level comments are deferred to
// Phase 2.9 (FU-2.8-comment-kind).
//
// This file exists primarily so the brief board has a stable component
// boundary that the G_B-7 tab can drop in without referencing the
// project-overview ThreadPanelServer directly.
// =============================================================================

import { ThreadPanelServer } from "@/components/project/thread-panel-server";

export function BriefCommentPanel({ projectId }: { projectId: string }) {
  return <ThreadPanelServer projectId={projectId} />;
}
