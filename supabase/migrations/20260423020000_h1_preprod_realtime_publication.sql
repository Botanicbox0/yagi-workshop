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
--
-- Phase 2.1 G7 M1 — idempotency guards added. Bare ALTER PUBLICATION ... ADD
-- TABLE errors if the table is already a member; the DO blocks below make the
-- migration safe to re-apply (clean-clone reproducibility + defence against
-- partial prior runs). Live DB was already corrected by the first apply; the
-- guards only affect fresh environments.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'preprod_frame_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_reactions;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'preprod_frame_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_comments;
  END IF;
END $$;
