# Subtask 06 — New project flow (3-step) + createProject server action

**status:** pending
**assigned_to:** executor_sonnet_46
**created:** 2026-04-21
**parallel_group:** C (serial — after 05, before 07)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 06"

---

## Executor preamble (READ FIRST, then execute)

You are an Executor for ONE task. Constraints:

1. Read ONLY this file for task scope. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
2. Before coding, load project conventions:
   - `/CLAUDE.md`
   - `.claude/skills/yagi-nextjs-conventions/SKILL.md`
3. Read existing shape (required):
   - `src/lib/supabase/server.ts` — Supabase server client
   - `src/lib/supabase/client.ts` — Supabase browser client (for reference if needed)
   - `src/lib/supabase/database.types.ts` — DB type surface; find `projects` row shape + enums (`project_type`, `project_status`, `deliverable_type`)
   - `src/app/[locale]/app/projects/page.tsx` (subtask 05 output) — to see the list page you're linking from
   - `src/app/[locale]/app/layout.tsx` + whatever `fetchAppContext` returns — so you know how to get the active workspace + brands
   - `src/i18n/routing.ts` — for `Link`, `redirect`, `useRouter`
   - `messages/ko.json` `projects` namespace — list the keys that already exist (brief_step, refs_step, review_step, title_label/ph, description_label/ph, brand_label, brand_none, tone_label/ph, deliverable_types_label, deliverable_{film,still,campaign,editorial,social,other}, budget_label/ph, delivery_label, save_draft, submit_project)
   - `src/components/ui/` — check which components already exist: `button`, `input`, `label`, `textarea`, `select`, `checkbox`, `calendar`/`date-picker`, `dialog`/`alert-dialog`. Install any missing ones with `pnpm dlx shadcn@2.1.8 add <name>` (NEVER @latest). Report each install.
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. If blocked (ambiguous schema, missing i18n key — note: this subtask does NOT allow adding new i18n keys; work with what's in the `projects` namespace), write `BLOCKED: <reason + file:line>` to `results/06_new_project_flow.md` and stop.
6. When done, write `.yagi-autobuild/results/06_new_project_flow.md`.

## Task scope — new route + actions + supporting client component

You may create the minimum files needed — recommended structure below, but exact file layout is your call as long as it's idiomatic and the acceptance criteria pass.

### Suggested files

- `src/app/[locale]/app/projects/new/page.tsx` — Server Component. Fetches user's workspaces + brands for the dropdown (uses `fetchAppContext` or direct Supabase query). Passes initial data to a Client Component wizard.
- `src/app/[locale]/app/projects/new/new-project-wizard.tsx` — Client Component (`"use client"`). The 3-step wizard body. Uses RHF + Zod, Sonner toasts.
- `src/app/[locale]/app/projects/new/actions.ts` — Server Action file (`"use server"` at top). Exports `createProject` and optionally a `submitDraft` helper.

Do NOT create extra shared utilities — keep everything scoped to this route.

### Step 1 — Brief (fields)

| Field | Schema | UI |
|-------|--------|----|
| `title` | `string().trim().min(1).max(200)` — required | `<Input>` with `useTranslations("projects").title_label` label + `title_ph` placeholder. Required marker (asterisk). |
| `description` | `string().max(4000).optional()` | `<Textarea>` (install if missing). Label `description_label`, placeholder `description_ph`. |
| `brand_id` | `string().uuid().nullable().optional()` | shadcn `<Select>` dropdown. Options = brands from user's workspace(s). First option is `brand_none` label (no brand, value=`""` → submits as `null`). |
| `tone` | `string().max(500).optional()` | `<Input>` text. Label `tone_label`, placeholder `tone_ph`. |
| `deliverable_types` | `z.array(z.enum(["film","still","campaign","editorial","social","other"])).min(1)` — at least one | Checkbox group. 6 checkboxes labelled `deliverable_film` / `_still` / `_campaign` / `_editorial` / `_social` / `_other`. Min 1 selected — validation error shown inline. |
| `estimated_budget_range` | `string().max(100).optional()` | `<Input>` text. Label `budget_label`, placeholder `budget_ph`. |
| `target_delivery_at` | ISO date string (YYYY-MM-DD) or null | `<Input type="date">` is acceptable. Label `delivery_label`. If you install shadcn's `calendar` + `popover`, that's also fine — but native date input is simpler and has no dep cost. |

**Submit of step 1:**
- Zod `.safeParse` — if fail, inline errors (red text `text-xs text-destructive` below each field).
- If pass, advance to Step 2 locally (component state — no server call yet).

**"Save draft" button** (left side, muted): triggers `createProject` action with current (possibly incomplete) brief data but with a relaxed schema that only requires `title` — on success, toast `common.saved_draft` (if key exists, otherwise don't emit a toast — **do not invent new i18n keys**), then navigate to `/app/projects/{id}` where the user can continue editing later.

### Step 2 — References (placeholder)

Single empty state card with a muted message (reuse `refs.title` for a heading if desired) and a "Skip for now" button → advances to Step 3. Do NOT build uploaders — subtask 08 handles that.

If no appropriate "Skip for now" i18n key exists in `projects` or `refs`, use `common.skip` or `common.next` — check `common` namespace first; if no fit, use the Step controls button with label `review_step` (advance to Review). Do NOT add new keys.

### Step 3 — Review

Read-only summary: show all submitted Step 1 fields in a two-column layout (label on left, value on right). Empty/optional fields show em-dash. Deliverable types shown as a row of chips.

Two buttons at the bottom:
- Left: `save_draft` (ghost / outline) — same as Step 1's Save draft.
- Right: `submit_project` (primary pill CTA) — triggers a confirm dialog (shadcn `<AlertDialog>`; install if missing). Dialog body is brief confirmation text — reuse an existing key like `common.confirm`/`common.cancel` for the two buttons. Confirm → calls `createProject` with `intent: "submit"` → status transitions to `submitted` → redirect to `/app/projects/{id}`. Cancel → close dialog.

### Server Action — `createProject`

File: `src/app/[locale]/app/projects/new/actions.ts`

```ts
"use server";

import { z } from "zod";
import { redirect } from "@/i18n/routing";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const briefSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  brand_id: z.string().uuid().nullable().optional(),
  tone: z.string().max(500).optional().nullable(),
  deliverable_types: z.array(z.enum([
    "film","still","campaign","editorial","social","other"
  ])).default([]),
  estimated_budget_range: z.string().max(100).optional().nullable(),
  target_delivery_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  intent: z.enum(["draft","submit"]).default("draft"),
});

export async function createProject(input: unknown) {
  const parsed = briefSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validation" as const, issues: parsed.error.flatten() };
  }
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // Determine workspace — pick the user's first workspace membership.
  // If the user's account has multiple, you may either:
  //   (a) accept an explicit workspace_id in the input (add to the schema), or
  //   (b) pick the first via workspace_members query ordered by created_at.
  // Option (b) is fine for MVP — there's only one workspace per user right now.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) return { error: "no_workspace" as const };

  const status = parsed.data.intent === "submit" ? "submitted" : "draft";

  const insertPayload = {
    workspace_id: membership.workspace_id,
    created_by: user.id,
    project_type: "direct_commission" as const,
    status,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    brand_id: parsed.data.brand_id || null,
    tone: parsed.data.tone ?? null,
    deliverable_types: parsed.data.deliverable_types,
    estimated_budget_range: parsed.data.estimated_budget_range ?? null,
    target_delivery_at: parsed.data.target_delivery_at ?? null,
  };

  const { data: project, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !project) {
    return { error: "db" as const, message: error?.message ?? "insert failed" };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true as const, id: project.id, status };
}
```

**Notes on the action:**
- Shape of the `insertPayload` must match the actual `projects` schema — READ `database.types.ts` first to confirm column names. If a column is named differently (e.g., `estimated_budget` vs `estimated_budget_range`), adjust. If any listed field does NOT exist on the table, OMIT it from the insert and note in the result file which field was omitted.
- The `deliverable_types` column may be a Postgres enum array or a plain text array — insert as-is; Supabase handles it.
- `target_delivery_at` — if the column is a `date`, the `YYYY-MM-DD` string works. If it's a `timestamptz`, append `T00:00:00Z`.
- Do NOT write client-side redirects from the action; return `{ ok, id }` and let the client navigate via `useRouter().push("/app/projects/" + id)`. Using `next-intl`'s `redirect` from a Server Action works too — either is acceptable.

### Wizard component behavior

- Local step state (`useState<"brief" | "refs" | "review">("brief")`).
- Progress indicator at top: `1. {brief_step} > 2. {refs_step} > 3. {review_step}` — active step bold, completed steps with check glyph, future steps muted.
- Form state persists across steps (use a single RHF `useForm` with all Step 1 fields; don't fragment into multiple forms).
- On `createProject` returning `{ error: "validation", issues }`, surface issues as Sonner toast (`toast.error`) and stay on current step. On `{ error: "db" }` or `"unauthenticated"` or `"no_workspace"`, toast the generic errors key (`errors.generic`, `errors.unauthorized` — use what exists in the `errors` namespace).
- On `{ ok, id }`, toast a success (reuse an existing key; if nothing fits, skip the toast) and `router.push("/app/projects/" + id)`.

## Non-negotiables

- Server Action file has `"use server"` at top.
- Supabase access ONLY through `@/lib/supabase/server` on the server and `@/lib/supabase/client` if you need a browser client (probably unnecessary here — the wizard calls the Server Action directly).
- Every user-facing string via `useTranslations("projects")` / `useTranslations("common")` / `useTranslations("errors")`. Do NOT add new i18n keys in this subtask.
- Next.js 15 async props.
- Phase 1.0.6 styling: white/black, pill primary CTAs, keep-all for Korean, no warm tones.
- Type-safe throughout — no `any`. If the Supabase insert type is complex, let inference do its thing or declare a local `InsertPayload` type.

## Anti-patterns to reject

- Multiple RHF `useForm` instances for the same logical form.
- Storing form state in a context just for 3 steps — plain `useState` + RHF is sufficient.
- Calling `createProject` during Step 1→Step 2 advance (advance is purely client-side; only the final submit calls the action unless Save-draft is clicked).
- Hardcoded strings.
- Manual `workspace_id` = `hardcoded-uuid`. Query `workspace_members` to resolve it.
- Skipping the Zod re-parse in the Server Action ("client already validated" — untrusted; re-parse).
- Using `fetch("/api/...")` from the wizard to call the action — use Server Actions directly (`async (data) => { const res = await createProject(data); ... }`).

## Acceptance criteria

1. `/ko/app/projects/new` loads with Step 1 (Brief) as a 3-step wizard shell.
2. Brand dropdown populates from the current user's workspace brands (zero brands → shows only "None" option; user can still proceed).
3. Attempting to advance with empty `title` or zero `deliverable_types` shows inline validation errors.
4. Filling valid data → advance to Step 2 (placeholder) → advance to Step 3 (Review) → click Submit → confirm dialog → Submit → `projects` row inserted with `status='submitted'` + `project_type='direct_commission'` → user lands on `/ko/app/projects/{id}` (the detail page is subtask 07; for this subtask landing on a 404 is acceptable as long as the URL is correct).
5. "Save draft" button on Step 1 or Step 3 creates a row with `status='draft'` and navigates to the detail URL.
6. `pnpm tsc --noEmit` exits 0.
7. No new i18n keys added. No new deps beyond optional shadcn components (report each).

## Result file format (`results/06_new_project_flow.md`)

```markdown
# Subtask 06 result
status: complete
files_created:
  - src/app/[locale]/app/projects/new/page.tsx (NN bytes)
  - src/app/[locale]/app/projects/new/new-project-wizard.tsx (NN bytes)
  - src/app/[locale]/app/projects/new/actions.ts (NN bytes)
files_modified:
  - none
shadcn_components_added:
  - <list each, e.g., textarea, select, checkbox, alert-dialog>  # or "none"
db_column_adjustments:
  - <if any column was renamed/omitted vs spec — explain>  # or "none"
tsc_check: clean
i18n_keys_used:
  - projects.{title_label, title_ph, description_label, description_ph, brand_label,
    brand_none, tone_label, tone_ph, deliverable_types_label, deliverable_film,
    deliverable_still, deliverable_campaign, deliverable_editorial, deliverable_social,
    deliverable_other, budget_label, budget_ph, delivery_label, save_draft, submit_project,
    brief_step, refs_step, review_step}
  - common.{<list>}
  - errors.{<list>}
acceptance: PASS — wizard loads, brand dropdown populates, validation inline, submit inserts row + redirects, save draft works.
```

If blocked: `status: blocked` + `reason: <one line>`.
