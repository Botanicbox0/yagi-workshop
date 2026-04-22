-- Drop empty Phase 1.0 stub invoices table (0 rows, no code deps) to replace with Phase 1.5 schema
drop table if exists public.invoices cascade;

-- 1. Extend workspaces with tax registration columns
alter table public.workspaces
  add column if not exists business_registration_number text,
  add column if not exists representative_name text,
  add column if not exists business_address text,
  add column if not exists business_type text,
  add column if not exists business_item text,
  add column if not exists tax_invoice_email text;

-- 2. Supplier profile (single-row table for YAGI itself)
create table if not exists public.supplier_profile (
  id uuid primary key default gen_random_uuid(),
  business_registration_number text not null unique,
  corporate_name text not null,
  representative_name text not null,
  address text not null,
  business_type text,
  business_item text,
  contact_email text not null,
  contact_phone text,
  default_rates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger supplier_profile_updated_at
  before update on public.supplier_profile
  for each row execute function public.tg_touch_updated_at();

-- Seed YAGI placeholder row (yagi can fill in real values later)
insert into public.supplier_profile
  (business_registration_number, corporate_name, representative_name, address, contact_email, default_rates)
values
  ('0000000000', '야기워크숍 주식회사', '윤병삼', 'TBD', 'hello@yagiworkshop.xyz',
   '{"meeting_hourly_krw": 150000, "storyboard_flat_krw": 500000}'::jsonb)
on conflict (business_registration_number) do nothing;

-- 3. Invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  supplier_id uuid not null references public.supplier_profile(id),
  invoice_number text,
  nts_approval_number text,
  status text not null default 'draft'
    check (status in ('draft','issued','paid','void')),
  supply_date date not null,
  issue_date date,
  due_date date,
  subtotal_krw integer not null default 0,
  vat_krw integer not null default 0,
  total_krw integer not null default 0,
  memo text,
  popbill_mgt_key text unique,
  popbill_response jsonb,
  filed_at timestamptz,
  paid_at timestamptz,
  void_reason text,
  void_at timestamptz,
  is_mock boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_project on public.invoices(project_id);
create index if not exists idx_invoices_workspace on public.invoices(workspace_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_is_mock on public.invoices(is_mock) where is_mock = true;

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.tg_touch_updated_at();

-- 4. Invoice line items
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  display_order integer not null default 0,
  item_name text not null,
  specification text,
  quantity numeric(12,2) not null default 1,
  unit_price_krw integer not null,
  supply_krw integer not null,
  vat_krw integer not null,
  note text,
  source_type text check (source_type in ('manual','meeting','storyboard','deliverable')),
  source_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_items_invoice on public.invoice_line_items(invoice_id);

-- 5. Recalc totals trigger
create or replace function public.recalc_invoice_totals() returns trigger
language plpgsql security definer
as $$
declare
  inv_id uuid;
  new_subtotal integer;
  new_vat integer;
begin
  inv_id := coalesce(new.invoice_id, old.invoice_id);
  select coalesce(sum(supply_krw), 0), coalesce(sum(vat_krw), 0)
    into new_subtotal, new_vat
    from public.invoice_line_items
    where invoice_id = inv_id;
  update public.invoices
    set subtotal_krw = new_subtotal,
        vat_krw = new_vat,
        total_krw = new_subtotal + new_vat
    where id = inv_id;
  return coalesce(new, old);
end $$;

create trigger invoice_items_recalc
  after insert or update or delete on public.invoice_line_items
  for each row execute function public.recalc_invoice_totals();

-- 6. RLS
alter table public.supplier_profile enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;

-- supplier_profile: yagi_admin only (SELECT, UPDATE)
create policy supplier_profile_select on public.supplier_profile for select
  using (public.is_yagi_admin(auth.uid()));
create policy supplier_profile_update on public.supplier_profile for update
  using (public.is_yagi_admin(auth.uid()))
  with check (public.is_yagi_admin(auth.uid()));

-- invoices: workspace members see their issued/paid/void; yagi_admin sees all
create policy invoices_select on public.invoices for select
  using (
    public.is_yagi_admin(auth.uid())
    or public.is_ws_member(auth.uid(), workspace_id)
  );
create policy invoices_insert on public.invoices for insert
  with check (public.is_yagi_admin(auth.uid()));
create policy invoices_update on public.invoices for update
  using (public.is_yagi_admin(auth.uid()))
  with check (public.is_yagi_admin(auth.uid()));

-- RESTRICTIVE: drafts hidden from non-yagi
create policy invoices_hide_drafts_from_clients on public.invoices
  as restrictive for select
  using (public.is_yagi_admin(auth.uid()) or status <> 'draft');

-- RESTRICTIVE: mock invoices hidden from non-yagi
create policy invoices_hide_mocks_from_clients on public.invoices
  as restrictive for select
  using (public.is_yagi_admin(auth.uid()) or is_mock = false);

-- invoice_line_items: select via parent invoice (RLS chain)
create policy invoice_items_select on public.invoice_line_items for select
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and (
          public.is_yagi_admin(auth.uid())
          or public.is_ws_member(auth.uid(), i.workspace_id)
        )
    )
  );
create policy invoice_items_modify on public.invoice_line_items for all
  using (public.is_yagi_admin(auth.uid()))
  with check (public.is_yagi_admin(auth.uid()));
