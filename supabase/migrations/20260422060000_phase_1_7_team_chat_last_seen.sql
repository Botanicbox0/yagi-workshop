-- Phase 1.7 wave D — per-user per-channel last-seen timestamps for unread indicators.
-- Stored as a small jsonb blob on profiles to avoid a cross-join table;
-- shape: { "<channel_id>": "<iso8601>" }. The sidebar diffs each channel's
-- `latestMessageAt` against `lastSeenByChannel[channelId]` to decide whether
-- to show the unread dot.

alter table public.profiles
  add column if not exists team_chat_last_seen jsonb not null default '{}'::jsonb;

comment on column public.profiles.team_chat_last_seen is
  'Per-channel last-seen timestamps for unread indicators. Shape: { "<channel_id>": "<iso8601>" }';
