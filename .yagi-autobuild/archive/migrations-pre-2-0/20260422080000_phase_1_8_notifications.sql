-- Phase 1.8 — notifications data model
-- Creates notification_preferences, notification_events, and
-- notification_unsubscribe_tokens with RLS (users see only their own rows).
-- Inserts to notification_events are always service-role; users can only
-- update in_app_seen_at on their own rows.

create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_immediate_enabled boolean not null default true,
  email_digest_enabled boolean not null default true,
  digest_time_local time not null default '09:00',
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  timezone text not null default 'Asia/Seoul',
  updated_at timestamptz not null default now()
);

-- Reuse existing tg_set_updated_at() (verified present).
drop trigger if exists tg_set_notif_prefs_updated_at on notification_preferences;
create trigger tg_set_notif_prefs_updated_at
  before update on notification_preferences
  for each row execute function tg_set_updated_at();

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  kind text not null,
  severity text not null check (severity in ('high','medium','low')),
  title text not null,
  body text,
  url_path text,
  payload jsonb,
  email_sent_at timestamptz,
  email_batch_id uuid,
  in_app_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notif_events_user_unsent
  on notification_events(user_id, severity, created_at)
  where email_sent_at is null;

create index if not exists idx_notif_events_user_unseen
  on notification_events(user_id, created_at desc)
  where in_app_seen_at is null;

alter table notification_preferences enable row level security;
alter table notification_events enable row level security;

-- prefs: user sees/upserts/updates own
drop policy if exists prefs_select_own on notification_preferences;
create policy prefs_select_own on notification_preferences
  for select using (user_id = auth.uid());

drop policy if exists prefs_upsert_own on notification_preferences;
create policy prefs_upsert_own on notification_preferences
  for insert with check (user_id = auth.uid());

drop policy if exists prefs_update_own on notification_preferences;
create policy prefs_update_own on notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- events: user sees only own; cannot insert (service-role only);
-- can update own (app layer restricts to in_app_seen_at).
drop policy if exists notif_events_select_own on notification_events;
create policy notif_events_select_own on notification_events
  for select using (user_id = auth.uid());

drop policy if exists notif_events_update_own on notification_events;
create policy notif_events_update_own on notification_events
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Unsubscribe tokens (opaque, one-time-ish — "used_at" timestamps the confirm).
create table if not exists notification_unsubscribe_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists idx_unsub_tokens_user
  on notification_unsubscribe_tokens(user_id);

-- unsubscribe tokens: anonymous unsubscribe page must be able to read by token
-- (so no RLS by default — the token itself is the secret). Rows never leak
-- user_id to unauth callers through our app routes; PostgREST anon policy is
-- off. Keep RLS disabled here deliberately; document the reasoning.
alter table notification_unsubscribe_tokens disable row level security;

-- Realtime publication — REQUIRED so the in-app bell can subscribe to
-- postgres_changes on notification_events (Phase 1.7 learning: Realtime is
-- NOT auto-enabled for new tables).
do $realtime$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notification_events'
  ) then
    execute 'alter publication supabase_realtime add table notification_events';
  end if;
end
$realtime$;
