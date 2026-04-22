-- Phase 1.7 wave D — enable Realtime broadcast for team-chat tables so the
-- browser-side `postgres_changes` subscriptions in <ChannelView> and
-- <ChannelSidebar> actually receive INSERT/UPDATE/DELETE payloads.
--
-- Without this, RLS is still happy but the publication only contains tables
-- explicitly added to it. `supabase_realtime` is Supabase's managed
-- publication; we only need to append our tables.

alter publication supabase_realtime add table public.team_channel_messages;

-- Attachments INSERT arrives after the parent message INSERT. The client
-- re-fetches the message row on INSERT (via `getMessage`), so we don't
-- technically need to broadcast attachments. But add it anyway — future
-- UI can key off it (e.g. lazy thumbnail swap) without another migration.
alter publication supabase_realtime add table public.team_channel_message_attachments;
