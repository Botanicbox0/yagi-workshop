-- ==========================================================
-- YAGI Workshop — Phase 1.1 Schema + RLS + Storage
-- Tenancy: Workspace > Brand > Project
-- ==========================================================

-- =========== Tables ===========

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  logo_url text,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'custom')),
  tax_id text,
  tax_invoice_email text,
  brand_guide jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_slug_idx on public.workspaces(slug);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$'),
  logo_url text,
  industry text,
  description text,
  brand_guide jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index brands_workspace_idx on public.brands(workspace_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_-]{3,30}$'),
  display_name text not null,
  bio text,
  avatar_url text,
  locale text not null default 'ko' check (locale in ('ko', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('creator', 'workspace_admin', 'workspace_member', 'yagi_admin')),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint ws_role_requires_ws
    check ((role like 'workspace_%' and workspace_id is not null) or (role not like 'workspace_%' and workspace_id is null)),
  unique (user_id, role, workspace_id)
);
create index user_roles_user_idx on public.user_roles(user_id);
create index user_roles_ws_idx on public.user_roles(workspace_id);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  invited_by uuid references public.profiles(id),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index ws_members_ws_idx on public.workspace_members(workspace_id);
create index ws_members_user_idx on public.workspace_members(user_id);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token text not null unique,
  invited_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  project_type text not null default 'direct_commission'
    check (project_type in ('direct_commission', 'contest_brief')),
  created_by uuid not null references public.profiles(id),
  title text not null,
  brief text,
  deliverable_types text[] not null default '{}',
  estimated_budget_range text,
  target_delivery_at timestamptz,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'in_discovery', 'in_production',
    'in_revision', 'delivered', 'approved', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_workspace_idx on public.projects(workspace_id);
create index projects_brand_idx on public.projects(brand_id);
create index projects_type_status_idx on public.projects(project_type, status);

create table public.project_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  added_by uuid not null references public.profiles(id),
  storage_path text,
  external_url text,
  og_title text,
  og_description text,
  og_image_url text,
  caption text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  constraint ref_has_source check (storage_path is not null or external_url is not null)
);
create index project_refs_project_idx on public.project_references(project_id);

create table public.project_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index project_threads_project_idx on public.project_threads(project_id);

create table public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.project_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text,
  attachments jsonb not null default '[]'::jsonb,
  visibility text not null default 'shared' check (visibility in ('internal', 'shared')),
  parent_message_id uuid references public.thread_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index thread_messages_thread_idx on public.thread_messages(thread_id);

create table public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null default 1,
  submitted_by uuid not null references public.profiles(id),
  storage_paths text[] not null default '{}',
  external_urls text[] not null default '{}',
  note text,
  status text not null default 'submitted' check (status in ('submitted', 'changes_requested', 'approved')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create index deliverables_project_idx on public.project_deliverables(project_id);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index milestones_project_idx on public.project_milestones(project_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_number text unique not null,
  amount numeric(14, 2) not null,
  currency text not null default 'KRW',
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  paid_at timestamptz,
  status text not null default 'issued' check (status in ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
  note text,
  tax_invoice_issued boolean not null default false,
  tax_invoice_issued_at timestamptz,
  created_by uuid not null references public.profiles(id)
);
create index invoices_ws_idx on public.invoices(workspace_id);
create index invoices_project_idx on public.invoices(project_id);

-- =========== Triggers ===========

create or replace function public.tg_touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger workspaces_touch before update on public.workspaces
  for each row execute function public.tg_touch_updated_at();
create trigger brands_touch before update on public.brands
  for each row execute function public.tg_touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.tg_touch_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function public.tg_touch_updated_at();

-- =========== Security-definer helpers ===========

create or replace function public.is_yagi_admin(uid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
$$;

create or replace function public.is_ws_member(uid uuid, wsid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
$$;

create or replace function public.is_ws_admin(uid uuid, wsid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from workspace_members
    where user_id = uid and workspace_id = wsid and role = 'admin'
  );
$$;

-- =========== Enable RLS ===========

alter table public.workspaces enable row level security;
alter table public.brands enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.project_references enable row level security;
alter table public.project_threads enable row level security;
alter table public.thread_messages enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.project_milestones enable row level security;
alter table public.invoices enable row level security;

-- =========== Policies: profiles ===========

create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_upsert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- =========== Policies: user_roles ===========

create policy "user_roles_read_self" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_yagi_admin(auth.uid()));
create policy "user_roles_self_insert_creator" on public.user_roles for insert to authenticated
  with check (user_id = auth.uid() and role = 'creator' and workspace_id is null);
create policy "user_roles_self_insert_ws_admin" on public.user_roles for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'workspace_admin' and workspace_id is not null
    and public.is_ws_admin(auth.uid(), workspace_id)
  );
create policy "user_roles_yagi_admin" on public.user_roles for all to authenticated
  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));

-- =========== Policies: workspaces ===========

create policy "ws_read_members" on public.workspaces for select to authenticated
  using (public.is_ws_member(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
create policy "ws_create_any_auth" on public.workspaces for insert to authenticated with check (true);
create policy "ws_update_admin" on public.workspaces for update to authenticated
  using (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()))
  with check (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
create policy "ws_delete_yagi" on public.workspaces for delete to authenticated
  using (public.is_yagi_admin(auth.uid()));

-- =========== Policies: brands ===========

create policy "brands_read" on public.brands for select to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "brands_write_admin" on public.brands for all to authenticated
  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));

-- =========== Policies: workspace_members ===========

create policy "ws_members_read" on public.workspace_members for select to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "ws_members_self_bootstrap" on public.workspace_members for insert to authenticated
  with check (
    (user_id = auth.uid() and role = 'admin'
     and not exists (select 1 from workspace_members m where m.workspace_id = workspace_members.workspace_id))
    or public.is_ws_admin(auth.uid(), workspace_id)
    or public.is_yagi_admin(auth.uid())
  );
create policy "ws_members_delete_admin" on public.workspace_members for delete to authenticated
  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));

-- =========== Policies: workspace_invitations ===========

create policy "ws_inv_read_admin" on public.workspace_invitations for select to authenticated
  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "ws_inv_write_admin" on public.workspace_invitations for all to authenticated
  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));

-- =========== Policies: projects ===========

create policy "projects_read" on public.projects for select to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "projects_insert" on public.projects for insert to authenticated
  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "projects_update" on public.projects for update to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
  with check (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "projects_delete_yagi" on public.projects for delete to authenticated
  using (public.is_yagi_admin(auth.uid()));

-- =========== Policies: project child tables ===========

create policy "proj_refs_rw" on public.project_references for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "proj_threads_rw" on public.project_threads for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "thread_msgs_rw" on public.thread_messages for all to authenticated
  using (exists (select 1 from project_threads t join projects p on p.id = t.project_id
    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from project_threads t join projects p on p.id = t.project_id
    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "thread_msgs_hide_internal_from_clients" on public.thread_messages as restrictive for select to authenticated
  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());

create policy "deliverables_rw" on public.project_deliverables for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "milestones_rw" on public.project_milestones for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
  with check (exists (select 1 from projects p where p.id = project_id
    and (public.is_ws_admin(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));

create policy "invoices_read" on public.invoices for select to authenticated
  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
create policy "invoices_yagi_write" on public.invoices for all to authenticated
  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));

-- =========== Storage buckets ===========

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('workspace-logos', 'workspace-logos', true),
  ('brand-logos', 'brand-logos', true),
  ('project-references', 'project-references', false),
  ('project-deliverables', 'project-deliverables', false)
on conflict (id) do nothing;

create policy "avatars_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "ws_logos_read" on storage.objects for select using (bucket_id = 'workspace-logos');
create policy "ws_logos_write" on storage.objects for insert to authenticated with check (bucket_id = 'workspace-logos');

create policy "brand_logos_read" on storage.objects for select using (bucket_id = 'brand-logos');
create policy "brand_logos_write" on storage.objects for insert to authenticated with check (bucket_id = 'brand-logos');

create policy "refs_read" on storage.objects for select to authenticated
  using (bucket_id = 'project-references' and exists (
    select 1 from project_references pr join projects p on p.id = pr.project_id
    where pr.storage_path = name
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
  ));
create policy "refs_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-references');

create policy "deliverables_read" on storage.objects for select to authenticated
  using (bucket_id = 'project-deliverables' and exists (
    select 1 from project_deliverables d join projects p on p.id = d.project_id
    where name = any(d.storage_paths)
    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
  ));
create policy "deliverables_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-deliverables');
