# Subtask 13 result
status: complete
tool_used: Supabase MCP execute_sql (audit) + apply_migration (fix)
kill_switch: approved via chat reply (continue) after Telegram msg_id 17
migration_applied: storage_policy_hardening_20260421

## Audit table (pre-migration)

| Bucket | Exists | Public? | Policies (count) | Issue? |
|--------|--------|---------|------------------|--------|
| project-references | yes | private | 2 (INSERT, SELECT) | INSERT missing authorization |
| avatars | yes | **PUBLIC** | 3 (READ, UPDATE, INSERT) | public flag violated spec |

## Policy detail (pre-migration)

### project-references
- INSERT (`refs_insert`): `(bucket_id = 'project-references'::text)` — **Insufficient authorization.**
- SELECT (`refs_read`): properly joined via project_references + projects with `is_ws_member()` / `is_yagi_admin()`.

### avatars
- READ (`avatars_read`): `(bucket_id = 'avatars'::text)` — open to all authenticated (acceptable per spec; the `public` bucket flag was the critical issue).
- UPDATE (`avatars_update`): owner-scoped (`owner = auth.uid()`) — correct.
- INSERT (`avatars_write`): folder-scoped to `auth.uid()` — correct.

## Issues found
1. **avatars bucket — CRITICAL** — `public: true`, bypasses RLS for anonymous reads. Must be private with signed-URL model.
2. **project-references — refs_insert MEDIUM** — policy only checked bucket_id; any authenticated user could insert arbitrary paths.

## Migration applied

```sql
-- 1) Make avatars bucket private
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- 2) Replace refs_insert with authorized variant
DROP POLICY IF EXISTS refs_insert ON storage.objects;

CREATE POLICY refs_insert_authorized
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-references'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))
    )
  );
```

Helper signatures verified pre-apply: `is_ws_member(uid uuid, wsid uuid)`, `is_yagi_admin(uid uuid)`.

## Post-migration state (verified)

- `avatars.public` = **false**
- `project-references.public` = **false**
- `refs_insert` policy: **dropped**
- `refs_insert_authorized` policy: **active**, check_expr correctly references `projects p`, `storage.foldername(objects.name)[1]`, and the two helper functions.

## Compatibility notes for downstream code

- **Avatars bucket is now private.** Subtask 12's profile-form was pre-emptively built to use `createSignedUrl(path, 3600)` for avatar display — no code change needed. Any legacy code that relied on `getPublicUrl` for avatars will now break and must be migrated (none found in current codebase grep).
- **project-references INSERT now requires** the user be a workspace member of the project OR yagi_admin AND the path prefix must be `{projectId}/...`. Subtask 08's uploader already writes paths as `{projectId}/{uuid}.{ext}` — compliant.

## Recommendation

Applied. No further action required for Phase 1.2.
