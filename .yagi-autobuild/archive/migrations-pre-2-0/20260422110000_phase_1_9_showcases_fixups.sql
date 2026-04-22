-- Phase 1.9 fixups (Codex K-05 HIGH #1 + #2)
--
-- HIGH #1: showcases_update_internal had no WITH CHECK. Re-create with matching
-- post-update predicate so a ws_admin cannot rewrite project_id to move a
-- showcase into a workspace they don't admin.
--
-- HIGH #2: view_count increment was a non-atomic read-modify-write. Add a
-- SECURITY DEFINER RPC that does UPDATE ... SET view_count = view_count + 1
-- RETURNING view_count in a single statement.

drop policy if exists showcases_update_internal on showcases;
create policy showcases_update_internal on showcases
  for update
  using (
    is_yagi_admin(auth.uid())
    or exists (
      select 1 from projects p
      where p.id = project_id
        and is_ws_admin(auth.uid(), p.workspace_id)
    )
  )
  with check (
    is_yagi_admin(auth.uid())
    or exists (
      select 1 from projects p
      where p.id = project_id
        and is_ws_admin(auth.uid(), p.workspace_id)
    )
  );

-- HIGH #2 — atomic view count increment.
create or replace function public.increment_showcase_view(sid uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update showcases
     set view_count = view_count + 1
   where id = sid
     and status = 'published'
   returning view_count;
$$;

-- Allow public (anon + authenticated) to call the RPC; the function itself
-- gates on status='published' so drafts cannot be incremented.
grant execute on function public.increment_showcase_view(uuid) to anon, authenticated;
