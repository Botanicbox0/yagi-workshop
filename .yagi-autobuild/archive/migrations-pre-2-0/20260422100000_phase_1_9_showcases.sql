-- Phase 1.9 — Showcases (public portfolio pages per project)
-- Adapts .yagi-autobuild/phase-1-9-spec.md lines 42-132 with corrections:
--   * RLS helpers called with explicit auth.uid() as first arg
--   * DELETE policies added for showcases + showcase_media (yagi_admin only)
--   * updated_at trigger uses existing tg_set_updated_at()
--   * Storage RLS policies for showcase-media (member-scoped read/write) and
--     showcase-og (public read, yagi_admin write)
-- No Realtime publication — view counter uses fire-and-forget Edge call.

-- ---------------------------------------------------------------------------
-- 1. showcases table
-- ---------------------------------------------------------------------------
create table showcases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  board_id uuid references preprod_boards(id),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  title text not null,
  subtitle text,
  narrative_md text,
  cover_media_storage_path text,
  cover_media_external_url text,
  cover_media_type text check (cover_media_type in ('image','video_upload','video_embed')),
  credits_md text,
  client_name_public text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  made_with_yagi boolean not null default true,
  badge_removal_requested boolean not null default false,
  badge_removal_approved_at timestamptz,
  badge_removal_approved_by uuid references auth.users(id),
  is_password_protected boolean not null default false,
  password_hash text,
  view_count integer not null default 0,
  og_image_path text,
  og_image_regenerated_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_showcases_slug on showcases(slug);
create index idx_showcases_published
  on showcases(status, published_at desc)
  where status = 'published';
create index idx_showcases_project on showcases(project_id);

create trigger trg_showcases_updated_at
  before update on showcases
  for each row
  execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. showcase_media table
-- ---------------------------------------------------------------------------
create table showcase_media (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references showcases(id) on delete cascade,
  sort_order integer not null,
  media_type text not null check (media_type in ('image','video_upload','video_embed')),
  storage_path text,
  external_url text,
  embed_provider text check (embed_provider is null or embed_provider in ('youtube','vimeo','tiktok','instagram')),
  caption text,
  created_at timestamptz not null default now(),
  unique (showcase_id, sort_order)
);

create index idx_showcase_media_showcase on showcase_media(showcase_id);

-- ---------------------------------------------------------------------------
-- 3. RLS — tables
-- ---------------------------------------------------------------------------
alter table showcases enable row level security;
alter table showcase_media enable row level security;

-- showcases: SELECT — yagi_admin OR workspace member of the project's ws
create policy showcases_select_internal on showcases
  for select
  using (
    is_yagi_admin(auth.uid())
    or exists (
      select 1 from projects p
      where p.id = project_id
        and is_ws_member(auth.uid(), p.workspace_id)
    )
  );

-- showcases: INSERT — yagi_admin only
create policy showcases_insert_internal on showcases
  for insert
  with check (is_yagi_admin(auth.uid()));

-- showcases: UPDATE — yagi_admin OR workspace admin of project's ws
create policy showcases_update_internal on showcases
  for update
  using (
    is_yagi_admin(auth.uid())
    or exists (
      select 1 from projects p
      where p.id = project_id
        and is_ws_admin(auth.uid(), p.workspace_id)
    )
  );

-- showcases: DELETE — yagi_admin only
create policy showcases_delete_internal on showcases
  for delete
  using (is_yagi_admin(auth.uid()));

-- showcase_media: SELECT — yagi_admin or workspace member of the parent showcase's project
create policy showcase_media_select on showcase_media
  for select
  using (
    exists (
      select 1 from showcases s
      where s.id = showcase_id
        and (
          is_yagi_admin(auth.uid())
          or exists (
            select 1 from projects p
            where p.id = s.project_id
              and is_ws_member(auth.uid(), p.workspace_id)
          )
        )
    )
  );

-- showcase_media: INSERT — yagi_admin only
create policy showcase_media_insert on showcase_media
  for insert
  with check (
    exists (
      select 1 from showcases s
      where s.id = showcase_id
        and is_yagi_admin(auth.uid())
    )
  );

-- showcase_media: UPDATE — yagi_admin only
create policy showcase_media_update on showcase_media
  for update
  using (
    exists (
      select 1 from showcases s
      where s.id = showcase_id
        and is_yagi_admin(auth.uid())
    )
  );

-- showcase_media: DELETE — yagi_admin only
create policy showcase_media_delete on showcase_media
  for delete
  using (
    exists (
      select 1 from showcases s
      where s.id = showcase_id
        and is_yagi_admin(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Storage buckets + RLS
--    Path convention:
--      showcase-media: {showcase_id}/{uuid}__{filename}
--      showcase-og:    {showcase_id}.png (flat)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('showcase-media', 'showcase-media', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('showcase-og', 'showcase-og', true)
on conflict (id) do nothing;

-- showcase-media read: yagi_admin OR workspace member of the showcase's project
create policy "showcase-media read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'showcase-media'
    and (
      is_yagi_admin(auth.uid())
      or exists (
        select 1 from showcases s
        join projects p on p.id = s.project_id
        where s.id = (storage.foldername(name))[1]::uuid
          and is_ws_member(auth.uid(), p.workspace_id)
      )
    )
  );

-- showcase-media write: yagi_admin only
create policy "showcase-media write" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'showcase-media'
    and is_yagi_admin(auth.uid())
  );

create policy "showcase-media update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'showcase-media'
    and is_yagi_admin(auth.uid())
  );

create policy "showcase-media delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'showcase-media'
    and is_yagi_admin(auth.uid())
  );

-- showcase-og: PUBLIC read (bucket is public) — no read policy needed for anon
-- but we add write/update/delete policies restricted to yagi_admin
create policy "showcase-og write" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'showcase-og'
    and is_yagi_admin(auth.uid())
  );

create policy "showcase-og update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'showcase-og'
    and is_yagi_admin(auth.uid())
  );

create policy "showcase-og delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'showcase-og'
    and is_yagi_admin(auth.uid())
  );
