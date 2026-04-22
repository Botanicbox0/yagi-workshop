---
id: 04
name: Apply migration + verify RLS
status: pending
assigned_to: executor
---

# Subtask 04 — Apply Migration + Verify RLS

## Goal
1. Execute `supabase db push` on the linked project.
2. Verify the push succeeded and all tables were created.
3. Verify RLS is active by running an anonymous REST query that should return an empty array (no error).

## Pre-conditions (already satisfied)
- User has already approved via kill-switch.
- `supabase link` has previously been run (don't re-link).
- Migration file exists at `supabase/migrations/20260421000001_phase1_schema.sql`.

## Commands to run (from project root `C:\Users\yout4\yagi-studio\yagi-workshop`)

### 1. Apply migration

The `supabase db push` command is interactive by default — you must pass a flag (or stdin) to auto-confirm. Try these in order:

```bash
# Preferred — Supabase CLI v1.200+:
supabase db push --include-all

# If that still prompts, feed stdin:
echo "Y" | supabase db push
```

If both fail, read `supabase db push --help` to find the right non-interactive flag and use it.

Expected output contains "Applying migration 20260421000001_phase1_schema.sql..." and "Finished supabase db push."

### 2. Verify tables applied

Run `supabase migration list` (or `supabase migration list --linked`). The remote column should show `20260421000001` present.

### 3. Verify anonymous RLS blocks reads

From Bash/PowerShell, make a GET request to the PostgREST endpoint for `workspaces` using ONLY the anon key (no user JWT). Because there are no rows AND the anon role has no policy granting select, the expected response is an empty array `[]` with HTTP 200.

Read the Supabase URL + anon key from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```bash
# Use curl (Git Bash)
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/workspaces?select=id"
# Expected: []
```

A response of `[]` confirms RLS is correctly blocking anonymous access even though the query succeeded.

## Acceptance criteria

- [ ] `supabase db push` completed without error
- [ ] `supabase migration list` shows `20260421000001` on remote
- [ ] Anonymous REST query to `/rest/v1/workspaces` returns `[]` (NOT an error — the empty array proves RLS is active and anon has no grant to see rows)
- [ ] No files were modified (push is a DB operation, not a file operation)

## Write result to `.yagi-autobuild/results/04_apply_migration_and_verify.md`

```
---
id: 04
status: complete | failed
executor: general-purpose
completed_at: <ISO timestamp>
---

## Commands run
- supabase db push (+ flag used): ...
- supabase migration list: output summary
- curl anon query: response body

## Verification
- db push: pass/fail
- migration list shows 20260421000001 remote: yes/no
- anon query returns []: yes/no

## Notes
<any deviation, errors, retries>
```

## IMPORTANT
- Do NOT abort if `supabase db push` shows a warning about unrelated existing migrations. Only abort on actual SQL errors.
- If `supabase db push` asks for confirmation interactively and you cannot bypass with a flag, try `supabase db push <` with a yes-piped stdin.
- Keep errors from `supabase db push` verbatim in the result file so the Evaluator/Builder can diagnose.
