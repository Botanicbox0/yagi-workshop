-- Phase 1.8 helper: resolve a list of emails to auth.users.id (lowercased,
-- trimmed). SECURITY DEFINER so service-role Server Actions can look up
-- users without exposing auth.users to end clients. Callable from service
-- role only via explicit grants below.

create or replace function public.resolve_user_ids_by_emails(p_emails text[])
returns table (email text, user_id uuid)
language sql
security definer
set search_path = public, auth
as $$
  select u.email::text, u.id
  from auth.users u
  where lower(u.email) = any (select lower(e) from unnest(p_emails) as e)
$$;

revoke all on function public.resolve_user_ids_by_emails(text[]) from public;
revoke all on function public.resolve_user_ids_by_emails(text[]) from anon, authenticated;
grant execute on function public.resolve_user_ids_by_emails(text[]) to service_role;
