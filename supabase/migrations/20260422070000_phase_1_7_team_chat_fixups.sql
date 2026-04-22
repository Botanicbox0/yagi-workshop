-- Phase 1.7 fixups (Codex K-05 HIGH #1 + #2)
--
-- HIGH #1: deleteMessage was a silent no-op because no DELETE policy existed
-- on team_channel_messages — RLS denied all deletes. Add an author-or-yagi-admin
-- DELETE policy matching the Server Action's intent.
--
-- HIGH #2: team_channel_messages_update had no WITH CHECK, so a logged-in YAGI
-- Internal member could call .update({ author_id: '<other>', channel_id: '<other>' })
-- from the browser and Postgres would accept it (USING matched the old row).
-- Lock the new row's author_id to the caller — channel_id is left mutable
-- (defense-in-depth: the Server Action only updates body + edited_at, and any
-- channel_id change inside YAGI Internal would still be visible to the same
-- member set). The Server Action's own field allow-list remains the primary gate.

-- HIGH #1 — author or yagi_admin can delete.
create policy team_channel_messages_delete on team_channel_messages
  for delete
  using (
    author_id = auth.uid()
    or is_yagi_admin(auth.uid())
  );

-- HIGH #2 — re-create UPDATE policy with WITH CHECK locking author_id.
drop policy if exists team_channel_messages_update on team_channel_messages;
create policy team_channel_messages_update on team_channel_messages
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
