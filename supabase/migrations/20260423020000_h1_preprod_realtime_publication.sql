-- Phase 2.1 G2 — H1 remediation.
--
-- Add preprod feedback tables to the supabase_realtime publication.
-- Before this migration, the UI subscription in
-- src/components/preprod/board-editor.tsx (postgres_changes on reactions +
-- comments) was a silent no-op — the live publication only contained
-- notification_events + team_channel_messages + team_channel_message_attachments.
-- Preprod feedback therefore only updated on page reload from Phase 1.4
-- ship through Phase 2.0 closeout.
--
-- Findings: .yagi-autobuild/phase-2-1/G2_H1_RESOLVED.md
-- Pre-flight (RLS enabled, policies present, REPLICA IDENTITY default) passed
-- before apply.

ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_comments;
