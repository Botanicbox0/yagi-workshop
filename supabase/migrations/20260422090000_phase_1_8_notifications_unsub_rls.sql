alter table notification_unsubscribe_tokens enable row level security;

-- Default deny: no anon or authenticated user can read/write tokens.
-- The unsubscribe page + actions use the service-role client, which bypasses RLS.
create policy unsub_tokens_deny_all on notification_unsubscribe_tokens
  for all
  using (false)
  with check (false);
