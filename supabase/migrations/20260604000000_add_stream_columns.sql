alter table public.project_deliverables
  add column if not exists stream_uid text,
  add column if not exists stream_status text,
  add column if not exists stream_ready_at timestamptz;
