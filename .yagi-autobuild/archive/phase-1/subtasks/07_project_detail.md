# Subtask 07 — Project detail page + transitionStatus server action

**status:** pending
**assigned_to:** executor_sonnet_46
**created:** 2026-04-21
**parallel_group:** C (serial — after 06)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 07"

---

## Executor preamble (READ FIRST, then execute)

You are an Executor for ONE task. Constraints:

1. Read ONLY this file for scope. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
2. Load conventions first:
   - `/CLAUDE.md`
   - `.claude/skills/yagi-nextjs-conventions/SKILL.md`
3. Read existing shape (required):
   - `src/lib/supabase/server.ts`
   - `src/lib/supabase/database.types.ts` — find `projects` row shape (confirm column names like `brief` vs `description`, `status` enum values, `workspace_id`, `brand_id`, `created_by`, `deliverable_types` array, `estimated_budget_range`, `target_delivery_at`). Find `user_roles` / `workspace_members` shape for role determination.
   - `src/app/[locale]/app/layout.tsx` + `fetchAppContext` — to reuse role/workspace signals
   - `src/app/[locale]/app/projects/page.tsx` (subtask 05 list page) — to match heading/typography conventions
   - `src/app/[locale]/app/projects/new/new-project-wizard.tsx` (subtask 06) — for style reference
   - `src/i18n/routing.ts` — for `Link` and typed routing
   - `messages/ko.json` `projects` namespace — every key already exists; use the `status_*` and `transition_*` keys already present. Do NOT add new keys.
   - `src/components/ui/` — check for existence of `button`, `badge`, `dropdown-menu`, `separator`, `card`, `avatar`. Install missing ones with `pnpm dlx shadcn@2.1.8 add <name>` (NEVER @latest). Report each install.
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. If blocked (ambiguous schema, missing i18n key you cannot work around, cannot determine role helper), write `BLOCKED: <reason + file:line>` to `results/07_project_detail.md` and stop.

## Task scope

### File 1 (new) — `src/app/[locale]/app/projects/[id]/page.tsx`

**Server Component**. The primary user-facing project detail view.

#### Required behavior

1. **Async props:**
   ```ts
   type Props = { params: Promise<{ locale: string; id: string }> };
   export default async function ProjectDetailPage({ params }: Props) {
     const { locale, id } = await params;
     ...
   }
   ```

2. **Auth + role resolution** — Use `createSupabaseServer()`, fetch the user, resolve their role for this project's workspace. Concretely:
   - `supabase.auth.getUser()` → reject with `notFound()` (from `next/navigation`) if no user.
   - Fetch the project first (so we know its workspace_id).
   - Query `user_roles` for this user filtered by either `workspace_id = project.workspace_id` OR `workspace_id IS NULL` (global roles like `yagi_admin`). Collect all roles into a `Set<string>`.
   - If the project query returns null, call `notFound()` — RLS handles access scoping.

3. **Project fetch** — single query with brand join + counts:
   ```ts
   const { data: project } = await supabase
     .from("projects")
     .select(`
       id, title, brief, status, project_type,
       brand_id, workspace_id, created_by,
       deliverable_types, estimated_budget_range,
       target_delivery_at, created_at, updated_at,
       brand:brands(id, name, logo_url),
       workspace:workspaces(id, name, logo_url),
       creator:profiles!created_by(id, handle, display_name, avatar_url)
     `)
     .eq("id", id)
     .maybeSingle();
   ```
   Adjust column names if `database.types.ts` differs (e.g., `brief` vs `description` — confirm first). If the `creator:profiles!created_by(...)` foreign-key-hint syntax isn't supported by the project's Supabase client version, fetch the creator profile in a separate query.

4. **Counts** — two cheap count queries:
   ```ts
   const [{ count: refsCount }, { count: msgsCount }] = await Promise.all([
     supabase.from("project_references").select("id", { count: "exact", head: true }).eq("project_id", id),
     supabase.from("thread_messages").select("id", { count: "exact", head: true }).eq("project_id", id), // if thread_messages has project_id; adapt if it's via thread FK
   ]);
   ```
   If the counts cannot be fetched cleanly (e.g., `thread_messages` only has `thread_id`), render `0` and note in the result file; subtasks 08 + 09 will wire the real relationship. Do not block on this.

5. **Layout** (Tailwind, Phase 1.0.6 tokens only, white bg / black text / no warm tones):

   ```
   ┌─────────────────────────────────────────────────────────────┐
   │  breadcrumb:  {workspace.name} › {brand.name ?? "—"} › {title}    │
   │  [ status badge ]              [ Action dropdown ▾ ]              │
   ├────────────────────────────────────────┬────────────────────┤
   │  <section> Brief                       │  <aside> Metadata  │
   │    render brief text (whitespace-pre-  │    - created by    │
   │    wrap, keep-all for Korean)          │    - created at    │
   │                                        │    - target delivery│
   │  <section> References                  │    - budget range  │
   │    placeholder: "{refsCount} items"    │    - deliverable   │
   │    subtask 08 will populate            │      types (chips) │
   │                                        │                    │
   │  <section> Thread                      │    <h3> Participants│
   │    placeholder: "{msgsCount} messages" │      (creator only │
   │    subtask 09 will populate            │       for now)     │
   │                                        │                    │
   │                                        │    <h3> Milestones  │
   │                                        │      "Coming soon"  │
   │                                        │      (muted)       │
   └────────────────────────────────────────┴────────────────────┘
   ```

   Responsive: single column below `md:`, 2/3 + 1/3 grid at `md:` and above. Use `grid grid-cols-1 md:grid-cols-3 gap-8` with left section `md:col-span-2` and aside `md:col-span-1`.

6. **Breadcrumb** — simple text, not a shadcn breadcrumb component. Workspace name links to nothing (or to `/app` if preferable); brand name plain; project title as current (semibold). Use `›` (U+203A) as separator. Wrap in `<nav aria-label="breadcrumb">`.

7. **Status badge** — same styling as the list page (`projects.status_{status}` i18n key). Monochrome palette; no warm tones. If you already built a small inline badge on the list page, you may import and reuse it. Otherwise inline a `<span>` — the badge does not need to be extracted into a shared component for this subtask.

8. **Action dropdown** — uses shadcn `<DropdownMenu>` (install if missing). Contents depend on user role + current project status. The dropdown itself is rendered regardless; if NO transitions are available to this user, show a disabled placeholder item like `projects.status_{status}` (read-only current status) or hide the dropdown entirely.

   **Allowed transitions per role × status:**

   | Role | status=draft | status=submitted | status=in_discovery | status=in_production | status=in_revision | status=delivered | status=approved | status=archived |
   |------|--------------|------------------|---------------------|----------------------|--------------------|------------------|-----------------|-----------------|
   | workspace_admin | `transition_submit` → `submitted` | — | — | — | — | `transition_approve` → `approved`, `transition_request_revision` → `in_revision` | — | — |
   | workspace_member | — | — | — | — | — | — | — | — |
   | yagi_admin | — | `transition_start_discovery` → `in_discovery` | `transition_start_production` → `in_production` | `transition_mark_delivered` → `delivered` | `transition_mark_delivered` → `delivered` | `transition_archive` → `archived` | `transition_archive` → `archived` | — |

   A user can hold multiple roles — UNION the available actions. If the user is both `workspace_admin` AND `yagi_admin` on a `delivered` project, they see all of `approve` + `request_revision` + `archive`.

   Each dropdown item is a `<form action={transitionStatusServerAction}>` with hidden inputs for `projectId` and `newStatus`, and the button text uses the `transition_*` i18n key. This keeps the action server-driven and progressively enhanced.

9. **Metadata sidebar** — straightforward key/value list:
   - Created by: creator.display_name (or handle) + small avatar circle (fallback: first letter in a circle).
   - Created at: `Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(created_at))`.
   - Target delivery: same formatting, em-dash if null.
   - Budget: `estimated_budget_range` text, em-dash if null.
   - Deliverable types: row of chips using `projects.deliverable_{type}` labels (styled `inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs`).
   - Participants: for this subtask, just show the creator. Workspace members will be added in subtask 12 (team).
   - Milestones: muted "Coming soon" line.

10. **i18n** — `getTranslations("projects")` for most strings. Use `getTranslations("common")` for generic labels if they exist (e.g., labels like "created by"). If no key exists, reuse the closest existing key — do NOT add new keys. Acceptable workaround: use a non-i18n neutral symbol like `›` for the breadcrumb separator; use emoji-free em-dash for empty values.

### File 2 (new) — `src/app/[locale]/app/projects/[id]/actions.ts`

Server Action file. Exports `transitionStatus`.

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.string().uuid(),
  newStatus: z.enum([
    "draft","submitted","in_discovery","in_production",
    "in_revision","delivered","approved","archived",
  ]),
});

// Allowed transitions per (role, currentStatus) → newStatus set
const ALLOWED: Record<"workspace_admin" | "yagi_admin", Record<string, string[]>> = {
  workspace_admin: {
    draft: ["submitted"],
    delivered: ["approved", "in_revision"],
  },
  yagi_admin: {
    submitted: ["in_discovery"],
    in_discovery: ["in_production"],
    in_production: ["delivered"],
    in_revision: ["delivered"],
    delivered: ["archived"],
    approved: ["archived"],
  },
};

export async function transitionStatus(formData: FormData) {
  const parsed = schema.safeParse({
    projectId: formData.get("projectId"),
    newStatus: formData.get("newStatus"),
  });
  if (!parsed.success) return { error: "validation" as const };

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // Fetch project to know its workspace + current status
  const { data: project, error: fetchErr } = await supabase
    .from("projects")
    .select("id, status, workspace_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (fetchErr || !project) return { error: "not_found" as const };

  // Resolve user's roles (global + workspace-scoped)
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role, workspace_id")
    .eq("user_id", user.id);
  const roles = new Set(
    (roleRows ?? [])
      .filter(r => r.workspace_id === null || r.workspace_id === project.workspace_id)
      .map(r => r.role as string)
  );

  // Check if this (role × currentStatus → newStatus) is allowed
  const wsAdminCan = roles.has("workspace_admin") &&
    (ALLOWED.workspace_admin[project.status] ?? []).includes(parsed.data.newStatus);
  const yagiCan = roles.has("yagi_admin") &&
    (ALLOWED.yagi_admin[project.status] ?? []).includes(parsed.data.newStatus);
  if (!wsAdminCan && !yagiCan) return { error: "forbidden" as const };

  const { error: updateErr } = await supabase
    .from("projects")
    .update({ status: parsed.data.newStatus })
    .eq("id", project.id);
  if (updateErr) return { error: "db" as const, message: updateErr.message };

  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
  revalidatePath(`/[locale]/app/projects`, "page");
  return { ok: true as const };
}
```

**Notes on the action:**
- Accepts `FormData` because the dropdown items render as `<form action={transitionStatus}>` for progressive enhancement. If you prefer passing a plain object, you may — but then the wrapping in the dropdown item must be a Client Component calling the action, which adds complexity. FormData + `<form>` is cleaner here.
- The ALLOWED map is duplicated between the page (for rendering available items) and the action (for enforcement) — this is intentional defense-in-depth. Keep them in sync.
- Do not throw — return structured errors.

## Non-negotiables

- Server Component page. Server Action file with `"use server"` at top.
- Supabase via `@/lib/supabase/server` only.
- Every user-facing string via i18n (`getTranslations`). No hardcoded visible strings — use existing `projects` namespace keys.
- Next.js 15 async props.
- Phase 1.0.6 tokens. No warm tones. Pill CTAs where appropriate. keep-all for Korean long text.
- Type-safe — no `any`. `pnpm tsc --noEmit` must be clean.

## Anti-patterns

- Fetching workspace members / user roles from a Client Component.
- Hardcoding allowed transitions inside the UI and forgetting the server — BOTH must enforce.
- Rendering action buttons without role checks (security theater — show what the user can actually do, not disabled buttons they'd-love-to-click).
- `any` types for the Supabase project row — use inference or declare a local `type Project = {...}` matching the select shape.
- Storing role state in React state / cookies — always re-query server-side.
- Adding new i18n keys (not allowed in this subtask).

## Acceptance criteria

1. `/ko/app/projects/{id}` loads for an authenticated user who has access to that project (via RLS).
2. Renders breadcrumb, status badge, action dropdown, brief section, reference placeholder, thread placeholder, metadata sidebar, participants (creator), milestones placeholder.
3. Action dropdown items filtered per role × status per the table above. A workspace_admin on a draft sees `transition_submit`; a yagi_admin on a submitted sees `transition_start_discovery`; a workspace_member on any project sees an empty or disabled dropdown.
4. Clicking a transition form-submits to `transitionStatus`, which validates role + currentStatus + newStatus → updates → revalidates. On success, the page shows the new status on reload.
5. Attempting an unauthorized transition (forged formData) returns `{ error: "forbidden" }` server-side without updating the row — verified by the server Zod + role logic.
6. `pnpm tsc --noEmit` exits 0.
7. No new i18n keys. No new deps beyond shadcn `dropdown-menu` if it wasn't already installed.

## Result file format (`results/07_project_detail.md`)

```markdown
# Subtask 07 result
status: complete
files_created:
  - src/app/[locale]/app/projects/[id]/page.tsx (NN bytes)
  - src/app/[locale]/app/projects/[id]/actions.ts (NN bytes)
shadcn_components_added:
  - <list, or "none">
db_column_adjustments:
  - <any column renames vs this spec — e.g., brief vs description>
counts_wired:
  - references: <yes | no — reason if no>
  - messages: <yes | no — reason if no>
role_sources:
  - user_roles table (workspace_id NULL for global, workspace_id=project.workspace_id for scoped)
tsc_check: clean
i18n_keys_used:
  - projects.{status_*, transition_*, deliverable_*, ...}
acceptance: PASS — detail page renders, transitions role-gated, server enforces.
```

If blocked: `status: blocked` + `reason: <one line>`.
