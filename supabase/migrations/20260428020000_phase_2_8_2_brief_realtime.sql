-- Phase 2.8.2 G_B2_D — brief board sidebar realtime subscription
--
-- The brief side panel's "메시지" tab subscribes to thread_messages INSERT
-- events so new comments appear without a page reload. Realtime in Supabase
-- only fires events for tables that are members of the supabase_realtime
-- publication; without this the existing useEffect subscription in
-- thread-panel.tsx is silent.
--
-- RLS layering (kickoff §2 G_B2_D loop 2):
--   Realtime respects RLS — subscribers only receive rows they are allowed
--   to read. The thread-panel.tsx subscription ALSO filters by thread_id
--   client-side (defense-in-depth) so that even if RLS were misconfigured
--   the UI would not surface other-project messages. Adding to the
--   publication does not loosen any policy.
--
-- Idempotency: only ADD if not already present (matches pattern from
-- 20260422120000_phase_2_0_baseline.sql:4824).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'thread_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'project_threads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.project_threads';
  END IF;
END
$$;
