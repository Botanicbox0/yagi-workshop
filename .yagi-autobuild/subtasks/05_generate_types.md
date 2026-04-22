---
id: 05
name: Generate Supabase TypeScript types
status: pending
assigned_to: executor
---

# Subtask 05 — Generate TypeScript Types

## Goal
Produce `src/lib/supabase/database.types.ts` from the applied schema.

## Primary path — Supabase MCP

The CLI is not linked (Subtask 04 confirmed). Use the Supabase MCP tool:
- `mcp__claude_ai_Supabase__generate_typescript_types` with `project_id: jvamvbpxnztynsccvcmr`

Write the returned TypeScript source to `src/lib/supabase/database.types.ts` (overwrite if exists). Use the Write tool.

## Fallback path

If MCP is unavailable, try `supabase gen types typescript --project-id jvamvbpxnztynsccvcmr > src/lib/supabase/database.types.ts` — but this requires `SUPABASE_ACCESS_TOKEN`, so it will likely fail the same way `db push` did.

## Post-generation wiring

After writing `database.types.ts`, update `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` to use the `Database` generic:

**server.ts — Change these lines:**

Before:
```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
...
return createServerClient(
```

After:
```ts
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
...
return createServerClient<Database>(
```

(Also drop the `CookieOptions` import if unused.)

**client.ts — Change these lines:**

Before:
```ts
import { createBrowserClient } from "@supabase/ssr";
...
return createBrowserClient(
```

After:
```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
...
return createBrowserClient<Database>(
```

**middleware.ts — Change this line:**

Before:
```ts
const supabase = createServerClient(
```

After:
```ts
const supabase = createServerClient<Database>(
```

(And add `import type { Database } from "@/lib/supabase/database.types";`)

## Acceptance criteria

- [ ] `src/lib/supabase/database.types.ts` exists, non-empty (>= 100 lines likely)
- [ ] Exports a type named `Database` (grep confirms `export type Database` or `export interface Database` or a `Database` inside a `export type` chain)
- [ ] All 13 table names appear in the types file: workspaces, brands, profiles, user_roles, workspace_members, workspace_invitations, projects, project_references, project_threads, thread_messages, project_deliverables, project_milestones, invoices
- [ ] `server.ts`, `client.ts`, `middleware.ts` updated to use `<Database>` generic
- [ ] `npx tsc --noEmit` passes with zero errors

## Write result to `.yagi-autobuild/results/05_generate_types.md`

```
---
id: 05
status: complete | failed
executor: general-purpose
completed_at: <ISO timestamp>
---

## Files created/modified
- ...

## Verification
- Types file line count: N
- All 13 tables present: yes/no
- tsc --noEmit: pass/fail

## Notes
```

## Notes
- DO NOT edit any other files besides the three Supabase client files + database.types.ts.
- If MCP returns the types with different formatting than expected (e.g., namespaces), write them verbatim — TS compiler is source of truth.
