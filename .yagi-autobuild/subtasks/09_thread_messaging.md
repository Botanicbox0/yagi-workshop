# Subtask 09 — Thread messaging + visibility + Realtime

**status:** pending
**assigned_to:** executor_sonnet_46
**created:** 2026-04-21
**parallel_group:** D (parallel with 08 — both edit the project detail page, in distinct sections)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 09"

---

## Executor preamble

1. Read ONLY this file for scope. Also load `/CLAUDE.md` and `.claude/skills/yagi-nextjs-conventions/SKILL.md`.
2. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
3. Read existing shape as needed: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/database.types.ts` (find `project_threads` + `thread_messages` columns), `src/app/[locale]/app/projects/[id]/page.tsx` (integrate in the Thread placeholder section — NOT the References section), `messages/{ko,en}.json` (`threads` namespace: `title, new_message_ph, send, visibility_shared, visibility_internal, internal_badge, empty, attach`).
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. ⚠️ **Parallel awareness:** subtask 08 (reference collector) is running concurrently and will edit a DIFFERENT section of the project detail page (References placeholder). Only modify the **Thread** section of `page.tsx`. Do NOT touch the References section, the metadata sidebar, the action dropdown, or imports unrelated to threads.
6. If blocked (e.g., `project_threads` or `thread_messages` table missing, Realtime not configured), write `BLOCKED: <reason>` and stop.

## Task — create three new files + one surgical edit to detail page

### File 1 (new) — `src/components/project/thread-panel.tsx`

Client Component (`"use client"`).

**Props:** `{ projectId: string; currentUserId: string; isYagiAdmin: boolean; initialMessages: ThreadMessage[] }`.

Define `ThreadMessage` type locally, mirroring what the server query returns (see File 3).

**Structure:**
- Message list (scrollable, `max-h-[60vh] overflow-y-auto`). Each message row:
  - Small avatar circle (initial letter fallback)
  - Display name / handle + timestamp (muted, right-aligned)
  - Body text (whitespace-pre-wrap, `keep-all` for Korean)
  - If `visibility === "internal"` and `isYagiAdmin` is true, render a small badge using `t("internal_badge")` styled muted.
  - Messages the current user authored are right-aligned; others left-aligned — OR all left-aligned (either style is acceptable; pick one).
- Empty state: `t("empty")` centered.
- Input row at bottom:
  - `<Textarea>` with placeholder `t("new_message_ph")`.
  - Visibility toggle — only render the toggle UI if `isYagiAdmin === true`. Otherwise always send shared. The toggle is a shadcn `<Switch>` (install via `pnpm dlx shadcn@2.1.8 add switch` if missing — NEVER @latest) or a simple button that toggles state. Labels: `t("visibility_shared")` / `t("visibility_internal")`.
  - Send button: `t("send")`. Disabled when textarea is empty or sending.
- On send: call `sendMessage` Server Action. On success, clear the textarea (the Realtime subscription will append the message — or you may optimistically append before Realtime confirms).

**Realtime subscription:**
- `useEffect` subscribes to `thread_messages` inserts via `createSupabaseBrowser()`:
  ```ts
  const channel = supabase
    .channel(`project:${projectId}:thread`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "thread_messages" },
      (payload) => {
        const row = payload.new as ThreadMessage;
        // Filter client-side: only rows whose thread belongs to this project.
        // (Subscribing with a .eq filter on thread_id requires knowing thread_id up-front,
        // which is fine — fetch the project's thread id from initial props; see File 3.)
        if (row.thread_id === threadId) {
          setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row]);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
  ```
- RLS on `thread_messages` handles visibility filtering — a client (non-yagi) subscribed to an INSERT on an internal message will NOT receive the payload because RLS blocks SELECT. Confirm by reading the RLS policies if unsure; if the restrictive policy `thread_msgs_hide_internal_from_clients` exists, Realtime respects it.

### File 2 (new) — `src/app/[locale]/app/projects/[id]/thread-actions.ts`

Server Action file. Use `thread-actions.ts` to avoid collision with `actions.ts` (transitionStatus) and `ref-actions.ts` (subtask 08).

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const sendSchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().trim().min(1).max(10_000),
  visibility: z.enum(["shared","internal"]).default("shared"),
});

export async function sendMessage(input: unknown) {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // If visibility=internal, enforce server-side that the user has yagi_admin role.
  // (Client hides the toggle for non-yagi users; the server must still enforce.)
  if (parsed.data.visibility === "internal") {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .is("workspace_id", null)
      .eq("role", "yagi_admin");
    if (!roles || roles.length === 0) {
      return { error: "forbidden" as const };
    }
  }

  // Find or create the default thread for this project.
  let threadId: string;
  const { data: existing } = await supabase
    .from("project_threads")
    .select("id")
    .eq("project_id", parsed.data.projectId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    threadId = existing.id;
  } else {
    const { data: created, error: threadErr } = await supabase
      .from("project_threads")
      .insert({ project_id: parsed.data.projectId, kind: "default" })
      .select("id")
      .single();
    if (threadErr || !created) return { error: "db" as const, message: threadErr?.message };
    threadId = created.id;
  }

  const { error } = await supabase.from("thread_messages").insert({
    thread_id: threadId,
    author_id: user.id,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
  });
  if (error) return { error: "db" as const, message: error.message };

  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  // NOTE: subtask 10 (email) will call a notifications endpoint from here for shared messages.
  return { ok: true as const };
}
```

Verify column names (`project_threads.kind` may be named differently; `thread_messages.author_id` vs `sender_id` vs `created_by`). Adjust to the actual schema.

### File 3 (new) — `src/components/project/thread-panel-server.tsx`

Server Component wrapper that fetches initial data and renders the client panel.

**Props:** `{ projectId: string }`.

```tsx
import { createSupabaseServer } from "@/lib/supabase/server";
import { ThreadPanel } from "./thread-panel";

export async function ThreadPanelServer({ projectId }: { projectId: string }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Find the thread (may be null if no messages yet — the client panel handles that).
  const { data: thread } = await supabase
    .from("project_threads")
    .select("id")
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();

  // Fetch initial messages (empty array if no thread yet).
  const initialMessages = thread
    ? (await supabase
        .from("thread_messages")
        .select(`
          id, thread_id, author_id, body, visibility, created_at,
          author:profiles!author_id(id, handle, display_name, avatar_url)
        `)
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true })
      ).data ?? []
    : [];

  // Determine if the current user is yagi_admin.
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  const isYagiAdmin = !!(roleRows && roleRows.length > 0);

  return (
    <ThreadPanel
      projectId={projectId}
      threadId={thread?.id ?? null}
      currentUserId={user.id}
      isYagiAdmin={isYagiAdmin}
      initialMessages={initialMessages}
    />
  );
}
```

Adjust the profile FK hint syntax to match what the project's Supabase client actually supports. If `profiles!author_id` doesn't work, fetch profiles in a separate query and join in memory.

### File 4 (modify) — `src/app/[locale]/app/projects/[id]/page.tsx`

**Surgical edit.** Find the "Thread" placeholder section (the one that renders `{threadsCount ?? 0}` per subtask 07). Replace the placeholder body with:

```tsx
<ThreadPanelServer projectId={project.id} />
```

Add the import near existing imports:

```ts
import { ThreadPanelServer } from "@/components/project/thread-panel-server";
```

Do NOT touch:
- The References section (subtask 08 is handling that in parallel).
- The metadata sidebar.
- The action dropdown.
- The transitionStatus import/usage.

## Non-negotiables

- Client panel has `"use client"`. Server wrapper and actions file stay server-side.
- `createSupabaseBrowser` only inside `"use client"` for the realtime subscription. `createSupabaseServer` everywhere else.
- No inline Supabase client instantiation.
- Every user-facing string via i18n (`useTranslations("threads")` / `getTranslations("threads")`). Do NOT add new i18n keys. If a label is missing (e.g., avatar fallback text), use a single character or existing key.
- Phase 1.0.6 tokens. No warm tones.
- `pnpm tsc --noEmit` must be clean.

## Acceptance criteria

1. Client user sends a message from the thread panel → message appears immediately (either via realtime or optimistic append).
2. yagi_admin user sees a "Internal" toggle; client user does not see the toggle at all.
3. yagi_admin sends internal message → visible only to yagi (client user's realtime feed does not receive it; a page reload also does not show it — RLS enforces SELECT filtering).
4. `sendMessage` action rejects `visibility=internal` from a non-yagi user server-side with `{ error: "forbidden" }`.
5. Default thread auto-created on first message if absent.
6. `pnpm tsc --noEmit` clean.
7. No new i18n keys added.
8. No merge conflict with subtask 08 — only the Thread section of page.tsx is modified.

## Result file format (`results/09_thread_messaging.md`)

```markdown
# Subtask 09 result
status: complete
files_created:
  - src/components/project/thread-panel.tsx (NN bytes)
  - src/components/project/thread-panel-server.tsx (NN bytes)
  - src/app/[locale]/app/projects/[id]/thread-actions.ts (NN bytes)
files_modified:
  - src/app/[locale]/app/projects/[id]/page.tsx (Thread section only)
shadcn_components_added:
  - <list or "none">
db_column_adjustments:
  - <any schema adjustments>
realtime_channel: project:{projectId}:thread
server_side_internal_check: yes  # yagi_admin role re-verified server-side
tsc_check: clean
acceptance: PASS — thread renders, realtime subscribed, visibility toggle role-gated, server enforces internal check.
```

If blocked: `status: blocked` + `reason: <one line>`.
