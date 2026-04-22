-- Phase 1.7 — YAGI internal team channels (Slack-like, project-independent)
-- Scope: YAGI internal workspace only. Clients never see these.
-- Adapts .yagi-autobuild/phase-1-7-spec.md lines 42-159 with corrections:
--   * RLS helpers called with explicit auth.uid() as first arg
--   * workspaces uses column `slug` (not `handle`)
--   * YAGI internal workspace already exists; we only seed 3 channels
--   * created_by hardcoded to YAGI admin user (5428a5b9-e320-434f-8bf0-ffdae40f280f)

-- ---------------------------------------------------------------------------
-- 1. updated_at trigger function (public.tg_set_updated_at)
--    No existing public-schema updated_at trigger function, so we create one.
-- ---------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table team_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null check (length(name) between 1 and 50),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  topic text check (length(topic) <= 200),
  is_archived boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create index idx_team_channels_workspace on team_channels(workspace_id);

create trigger trg_team_channels_updated_at
  before update on team_channels
  for each row
  execute function public.tg_set_updated_at();

create table team_channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references team_channels(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (length(body) between 1 and 5000),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_team_channel_messages_channel
  on team_channel_messages(channel_id, created_at desc);

create table team_channel_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references team_channel_messages(id) on delete cascade,
  kind text not null check (kind in ('image','video','pdf','file')),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  thumbnail_path text,
  created_at timestamptz not null default now()
);

create index idx_tc_attachments_message on team_channel_message_attachments(message_id);

-- ---------------------------------------------------------------------------
-- 3. Helper: is this workspace the YAGI internal workspace?
--    Looks up workspaces.slug = 'yagi-internal'.
-- ---------------------------------------------------------------------------
create or replace function is_yagi_internal_ws(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspaces
    where id = ws_id and slug = 'yagi-internal'
  )
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table team_channels enable row level security;
alter table team_channel_messages enable row level security;
alter table team_channel_message_attachments enable row level security;

-- team_channels
create policy team_channels_select on team_channels
  for select
  using (
    is_yagi_internal_ws(workspace_id)
    and (is_ws_member(auth.uid(), workspace_id) or is_yagi_admin(auth.uid()))
  );

create policy team_channels_insert on team_channels
  for insert
  with check (
    is_yagi_internal_ws(workspace_id)
    and (is_ws_admin(auth.uid(), workspace_id) or is_yagi_admin(auth.uid()))
  );

create policy team_channels_update on team_channels
  for update
  using (
    is_yagi_internal_ws(workspace_id)
    and (is_ws_admin(auth.uid(), workspace_id) or is_yagi_admin(auth.uid()))
  );

-- team_channel_messages
create policy team_channel_messages_select on team_channel_messages
  for select
  using (
    exists (
      select 1 from team_channels c
      where c.id = channel_id
        and is_yagi_internal_ws(c.workspace_id)
        and (is_ws_member(auth.uid(), c.workspace_id) or is_yagi_admin(auth.uid()))
    )
  );

create policy team_channel_messages_insert on team_channel_messages
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from team_channels c
      where c.id = channel_id
        and is_yagi_internal_ws(c.workspace_id)
        and is_ws_member(auth.uid(), c.workspace_id)
    )
  );

create policy team_channel_messages_update on team_channel_messages
  for update
  using (author_id = auth.uid());

-- team_channel_message_attachments
create policy tc_attachments_select on team_channel_message_attachments
  for select
  using (
    exists (
      select 1
      from team_channel_messages m
      join team_channels c on c.id = m.channel_id
      where m.id = message_id
        and is_yagi_internal_ws(c.workspace_id)
        and (is_ws_member(auth.uid(), c.workspace_id) or is_yagi_admin(auth.uid()))
    )
  );

create policy tc_attachments_insert on team_channel_message_attachments
  for insert
  with check (
    exists (
      select 1 from team_channel_messages m
      where m.id = message_id
        and m.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Storage bucket + RLS
--    Path convention: {workspace_id}/{channel_id}/{message_id}/{uuid}__{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('team-channel-attachments', 'team-channel-attachments', false)
on conflict (id) do nothing;

create policy "tc-attachments read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'team-channel-attachments'
    and is_yagi_internal_ws((storage.foldername(name))[1]::uuid)
    and is_ws_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

create policy "tc-attachments write" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'team-channel-attachments'
    and is_yagi_internal_ws((storage.foldername(name))[1]::uuid)
    and is_ws_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- ---------------------------------------------------------------------------
-- 6. Seed channels for YAGI internal workspace (already exists)
--    workspace_id: 320c1564-b0e7-481a-871c-be8d9bb605a8
--    created_by : 5428a5b9-e320-434f-8bf0-ffdae40f280f (yagi_admin)
-- ---------------------------------------------------------------------------
insert into team_channels (workspace_id, name, slug, topic, created_by)
values
  ('320c1564-b0e7-481a-871c-be8d9bb605a8', '일반',     'general', '팀 전체 공지와 일상 대화',            '5428a5b9-e320-434f-8bf0-ffdae40f280f'),
  ('320c1564-b0e7-481a-871c-be8d9bb605a8', '아이디어', 'ideas',   '프로젝트 아이디어와 영감',            '5428a5b9-e320-434f-8bf0-ffdae40f280f'),
  ('320c1564-b0e7-481a-871c-be8d9bb605a8', '비즈니스', 'biz',     '클라이언트, 견적, 비즈니스 운영',     '5428a5b9-e320-434f-8bf0-ffdae40f280f')
on conflict (workspace_id, slug) do nothing;
