# Subtask 10 — Email notifications via Resend (shared thread messages)

**status:** pending
**assigned_to:** executor_sonnet_46
**created:** 2026-04-21
**parallel_group:** — (sequential — depends on 09 complete)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 10"

---

## Executor preamble

1. Read ONLY this file for scope. Also load `/CLAUDE.md` and `.claude/skills/yagi-nextjs-conventions/SKILL.md`.
2. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
3. Read existing shape as needed:
   - `src/lib/supabase/server.ts` (for the anon-key SSR pattern — DO NOT modify)
   - `src/lib/supabase/database.types.ts` (tables: `thread_messages`, `project_threads`, `projects`, `workspace_members`, `profiles`, `user_roles`)
   - `src/app/[locale]/app/projects/[id]/thread-actions.ts` (where you'll add the fire-and-forget call)
   - `.env.local` columns of interest: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. Pre-flight:
   - `resend` package is already installed (subtask 03 pinned `resend@^6.12.2`).
   - `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are both present in `.env.local`.
6. If blocked (e.g., resend import fails, service role key missing), write `BLOCKED: <reason>` to `results/10_email_notifications.md` and stop.

## Task — create four new files + one surgical edit

### File 1 (new) — `src/lib/resend.ts`

Lazy singleton Resend client with graceful degrade.

```ts
import "server-only";
import { Resend } from "resend";

let client: Resend | null | undefined;

export function getResend(): Resend | null {
  if (client !== undefined) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[resend] RESEND_API_KEY not set — email disabled");
    client = null;
    return null;
  }
  client = new Resend(key);
  return client;
}

// The "from" address used for all outbound mail in Phase 1.2.
// Adjust via env later when a verified sending domain is wired up.
export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL ?? "YAGI Workshop <noreply@yagiworkshop.xyz>";
```

### File 2 (new) — `src/lib/supabase/service.ts`

Service-role admin client for operations that must bypass RLS (recipient lookup, auth user email fetch). **Server-only.** NEVER import this from a Client Component.

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

let admin: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseService() {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
```

Note: `@supabase/supabase-js` should already be a transitive dep via `@supabase/ssr`. Verify — if not present as a direct dep, do NOT install it (would trigger a kill-switch). Use `@supabase/ssr`'s `createBrowserClient` variant with manual `global.headers = { Authorization: 'Bearer <key>' }` as fallback, OR stop with BLOCKED.

### File 3 (new) — `src/lib/email/new-message.ts`

Fire-and-forget recipient fan-out + Resend send.

```ts
import "server-only";
import { createSupabaseService } from "@/lib/supabase/service";
import { getResend, EMAIL_FROM } from "@/lib/resend";

type Locale = "ko" | "en";

function isLocale(v: string | null | undefined): v is Locale {
  return v === "ko" || v === "en";
}

function renderTemplate(opts: {
  locale: Locale;
  authorName: string;
  projectTitle: string;
  bodyPreview: string;
  projectUrl: string;
}) {
  const { locale, authorName, projectTitle, bodyPreview, projectUrl } = opts;
  if (locale === "ko") {
    return {
      subject: `[${projectTitle}] ${authorName}님의 새 메시지`,
      text:
        `${authorName}님이 프로젝트 "${projectTitle}"에 메시지를 남겼습니다.\n\n` +
        `"${bodyPreview}"\n\n` +
        `프로젝트 열기: ${projectUrl}\n\n` +
        `— YAGI Workshop`,
    };
  }
  return {
    subject: `[${projectTitle}] New message from ${authorName}`,
    text:
      `${authorName} sent a new message on project "${projectTitle}".\n\n` +
      `"${bodyPreview}"\n\n` +
      `Open project: ${projectUrl}\n\n` +
      `— YAGI Workshop`,
  };
}

/**
 * Fan out an email notification for a newly inserted SHARED thread message.
 * Must be called AFTER the insert has already succeeded.
 * Caller must not await the return value if it wants fire-and-forget;
 * this function never throws.
 *
 * @param messageId thread_messages.id of the just-inserted row
 */
export async function notifyNewMessage(messageId: string): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return; // no API key — silent no-op

    const admin = createSupabaseService();

    // 1. Load message + thread + project
    const { data: msg, error: msgErr } = await admin
      .from("thread_messages")
      .select(
        `id, body, visibility, author_id, thread_id,
         thread:project_threads!thread_id(id, project_id,
           project:projects!project_id(id, title, workspace_id))`
      )
      .eq("id", messageId)
      .maybeSingle();
    if (msgErr || !msg) return;
    if (msg.visibility !== "shared") return; // only shared triggers email

    // Unwrap possible array shape (Supabase sometimes returns FK joins as arrays)
    const thread = Array.isArray(msg.thread) ? msg.thread[0] : msg.thread;
    if (!thread) return;
    const project = Array.isArray(thread.project)
      ? thread.project[0]
      : thread.project;
    if (!project) return;

    // 2. Author display name
    const { data: authorProfile } = await admin
      .from("profiles")
      .select("display_name, handle")
      .eq("id", msg.author_id)
      .maybeSingle();
    const authorName =
      authorProfile?.display_name ?? authorProfile?.handle ?? "Someone";

    // 3. Recipient set: workspace members + yagi admins, minus author
    const [membersRes, yagiRes] = await Promise.all([
      admin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", project.workspace_id),
      admin
        .from("user_roles")
        .select("user_id")
        .is("workspace_id", null)
        .eq("role", "yagi_admin"),
    ]);
    const recipientIds = new Set<string>();
    for (const r of membersRes.data ?? []) recipientIds.add(r.user_id);
    for (const r of yagiRes.data ?? []) recipientIds.add(r.user_id);
    recipientIds.delete(msg.author_id);
    if (recipientIds.size === 0) return;

    // 4. Recipient profiles (for locale)
    const recipientIdArray = Array.from(recipientIds);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, locale, display_name")
      .in("id", recipientIdArray);
    const profileById = new Map(
      (profiles ?? []).map((p) => [p.id, p] as const)
    );

    // 5. Resolve emails via auth admin API — one call per user (Supabase has no bulk getUserById)
    const emails = await Promise.all(
      recipientIdArray.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return {
          user_id: uid,
          email: data?.user?.email ?? null,
        };
      })
    );

    // 6. Preview + URL
    const bodyPreview =
      msg.body.length > 240 ? `${msg.body.slice(0, 240)}…` : msg.body;
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";

    // 7. Send per recipient, respecting their locale
    await Promise.all(
      emails.map(async ({ user_id, email }) => {
        if (!email) return;
        const profile = profileById.get(user_id);
        const locale: Locale = isLocale(profile?.locale) ? profile!.locale as Locale : "en";
        const projectUrl = `${baseUrl}/${locale}/app/projects/${project.id}`;
        const { subject, text } = renderTemplate({
          locale,
          authorName,
          projectTitle: project.title ?? "Untitled",
          bodyPreview,
          projectUrl,
        });
        try {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject,
            text,
          });
        } catch (err) {
          console.error("[notifyNewMessage] resend failure", {
            user_id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      })
    );
  } catch (err) {
    console.error(
      "[notifyNewMessage] unexpected error",
      err instanceof Error ? err.message : String(err)
    );
  }
}
```

Schema notes:
- `projects.title` is the canonical project title column. If it's missing or named differently (e.g., `name`), inspect `database.types.ts` and adjust.
- `thread_messages.visibility` is text/enum. Treat `"shared"` as the trigger; any other value (including nullish) skips the notification.
- `profiles.locale` is a text column; valid values are `"ko"` or `"en"`. Anything else falls through to English.
- Recipient dedup: author excluded.

### File 4 (modify) — `src/app/[locale]/app/projects/[id]/thread-actions.ts`

**Surgical edit.** After the successful `thread_messages.insert` (currently lines 64–69), capture the inserted row's id and call `notifyNewMessage` fire-and-forget **only when visibility is "shared"**.

Change the insert to return the id:

```ts
const { data: inserted, error } = await supabase
  .from("thread_messages")
  .insert({
    thread_id: threadId,
    author_id: user.id,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
  })
  .select("id")
  .single();
if (error || !inserted) return { error: "db" as const, message: error?.message };

revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");

// Fire-and-forget email notification. Never await — user-perceived send latency
// must stay low, and notifyNewMessage handles all errors internally.
if (parsed.data.visibility === "shared") {
  void notifyNewMessage(inserted.id);
}

return { ok: true as const };
```

Add the import near the top:

```ts
import { notifyNewMessage } from "@/lib/email/new-message";
```

Do NOT touch the yagi_admin role check block, the thread auto-creation block, or the Zod schema.

## Non-negotiables

- `resend` package already installed — do NOT run `pnpm add` for anything. If you discover a missing transitive dep, write BLOCKED.
- `createSupabaseService` uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS. Use it ONLY inside `src/lib/email/**` and `src/lib/supabase/service.ts`. Never import into components.
- `"server-only"` import at the top of every new lib file.
- `notifyNewMessage` never throws — all failure paths log + return. It is called with `void` (fire-and-forget).
- Email text template can be bilingual (inline TypeScript) — do NOT add new i18n keys to `messages/*.json`.
- No new shadcn components.
- `pnpm tsc --noEmit` must be clean.
- No warm tones (but this subtask has no UI, so moot).

## Acceptance criteria

1. `getResend()` returns `null` and logs a warning when `RESEND_API_KEY` is unset. Verify by mentally walking through the code.
2. Service client imports `server-only` — confirm any attempted client-side import would fail the build.
3. `notifyNewMessage("<fake-uuid>")` (called in isolation) does not throw even when the message doesn't exist — it returns silently.
4. When visibility=internal, `sendMessage` does NOT call `notifyNewMessage`.
5. When visibility=shared, `sendMessage` fires notify AFTER the insert succeeds, and returns `{ ok: true }` without waiting for the email.
6. Recipient set dedupes correctly: a yagi_admin who is ALSO a workspace member is emailed once, not twice.
7. Author is never included in recipients.
8. Locale routing: `/ko/...` URL for recipients with `profiles.locale = "ko"`, `/en/...` otherwise.
9. `pnpm tsc --noEmit` clean.
10. No new i18n keys added to `messages/*.json`.

## Result file format (`results/10_email_notifications.md`)

```markdown
# Subtask 10 result
status: complete
files_created:
  - src/lib/resend.ts (NN bytes)
  - src/lib/supabase/service.ts (NN bytes)
  - src/lib/email/new-message.ts (NN bytes)
files_modified:
  - src/app/[locale]/app/projects/[id]/thread-actions.ts (1 import + reshaped insert + fire-and-forget call)
deps_added:
  - none  # resend already installed in subtask 03
schema_adjustments:
  - <e.g., "projects.title confirmed as text column" or "project_name used instead">
graceful_degrade:
  - RESEND_API_KEY absent → getResend returns null, notify logs + returns; no throw
locale_routing: yes  # per-recipient locale drives subject/body + project URL locale segment
fire_and_forget: yes  # sendMessage returns { ok: true } without awaiting notifyNewMessage
tsc_check: clean
acceptance: PASS — resend singleton, recipient fan-out with dedup, bilingual template, fire-and-forget wired into sendMessage for shared visibility only.
```

If blocked: `status: blocked` + `reason: <one line>`.
