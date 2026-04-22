# Subtask 13 — Storage bucket policy review (conditional kill-switch)

**status:** pending
**assigned_to:** executor_haiku_45
**created:** 2026-04-21
**parallel_group:** E (parallel with 11)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 13"

---

## Executor preamble

1. Read ONLY this file for scope. Also load `/CLAUDE.md`.
2. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or other subtask files.
3. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
4. **READ ONLY task.** Do NOT apply any migration yourself. If a policy change is needed, write the draft SQL into the result file and STOP with `status: needs_kill_switch`. The Orchestrator will handle Telegram gating.
5. Allowed tools: Supabase MCP (`list_tables`, `execute_sql` for SELECTs on pg_catalog / storage schema, `get_advisors`), Read, Write, Grep. Do NOT call `apply_migration`.

## Task — audit two storage buckets

### Target buckets
1. `project-references` — created/used in subtask 08 (image uploads).
2. `avatars` — expected to exist for profile avatar uploads (subtask 12 will exercise this if policies are correct).

### Questions to answer

For each bucket:

1. Does the bucket exist?
2. Is it **public** or **private**? (Project requirement: both must be **private** — uploads gated by RLS, reads via signed URL only.)
3. What RLS policies exist on `storage.objects` for this bucket? List each policy with its `cmd` (SELECT/INSERT/UPDATE/DELETE) and its `USING` / `WITH CHECK` predicate.
4. For `project-references`:
   - INSERT: must restrict path prefix to `{projectId}/*` where the user is a member of the project's workspace OR a yagi_admin.
   - SELECT: same authorization.
   - DELETE: creator of the reference OR yagi_admin.
5. For `avatars`:
   - INSERT/UPDATE: path must be `{userId}/*` and `auth.uid() = userId`.
   - SELECT: readable by anyone authenticated (or public-signed-URL model — either acceptable as long as it's documented).
   - DELETE: owner only.

### How to query

Use the Supabase MCP `execute_sql` tool (SELECT only). Example queries:

```sql
-- 1. Bucket existence + public flag
SELECT id, name, public FROM storage.buckets WHERE name IN ('project-references','avatars');

-- 2. RLS policies on storage.objects for these buckets
SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS check_expr
FROM pg_policy
WHERE polrelid = 'storage.objects'::regclass
ORDER BY polname;

-- (storage.objects policies usually filter by bucket_id inside their predicate; report all then filter mentally.)
```

If the Supabase MCP is not connected, write `BLOCKED: Supabase MCP unavailable` to the result file and stop.

## Decision rule

- **PASS (no change needed):** Both buckets exist, both private, policies correctly scoped. Write `status: complete` + a concise audit table.
- **NEEDS KILL-SWITCH:** Any issue found. Do NOT apply. Write draft SQL and `status: needs_kill_switch` with the list of issues. The Orchestrator will Telegram-gate the apply.

## Result file (`results/13_storage_policy_review.md`)

```markdown
# Subtask 13 result
status: complete | needs_kill_switch | blocked
tool_used: Supabase MCP execute_sql (read-only)

## Audit table

| Bucket | Exists | Public? | Policies (count) | Issue? |
|--------|--------|---------|------------------|--------|
| project-references | yes/no | private/public | N | none / <list> |
| avatars | yes/no | private/public | N | none / <list> |

## Policy detail (per bucket)

### project-references
- SELECT: <predicate>
- INSERT: <predicate>
- UPDATE: <predicate>
- DELETE: <predicate>

### avatars
- (same structure)

## Issues found (if any)
1. <bucket> — <policy cmd> — <description> — <severity: low/med/high>

## Draft SQL (if needs_kill_switch)

```sql
-- Draft — DO NOT APPLY. Orchestrator will gate.
-- Example:
-- CREATE POLICY ... ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'project-references' AND ...);
```

## Recommendation
- <e.g., "No changes required." | "Apply draft SQL after kill-switch approval.">
```

Keep the result file ≤200 lines. Do NOT guess policy text — if MCP query returns empty, say so explicitly.
