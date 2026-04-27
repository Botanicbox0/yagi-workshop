# Subtask 08 — Reference collector (uploader + grid + actions)

**status:** pending
**assigned_to:** executor_sonnet_46
**created:** 2026-04-21
**parallel_group:** D (parallel with 09 — both edit the project detail page, in distinct sections)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 08"

---

## Executor preamble

1. Read ONLY this file for scope. Also load `/CLAUDE.md` and `.claude/skills/yagi-nextjs-conventions/SKILL.md`.
2. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
3. Read existing shape as needed: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/database.types.ts` (find `project_references` columns), `src/app/[locale]/app/projects/[id]/page.tsx` (where you'll integrate — locate the "References" placeholder section), `src/app/api/unfurl/route.ts` (from subtask 04 — your URL tab calls this), `messages/{ko,en}.json` (`refs` namespace keys: `title, add_image, add_url, url_ph, url_fetching, url_failed, caption_ph, drop_hint, remove`).
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. ⚠️ **Parallel awareness:** subtask 09 (thread messaging) is running concurrently and will edit a DIFFERENT section of the project detail page (Thread placeholder). Only modify the **References** section of `page.tsx`. Do NOT touch the Thread section, imports unrelated to refs, the metadata sidebar, or the action dropdown.
6. If blocked, write `BLOCKED: <reason>` to `results/08_reference_collector.md` and stop.

## Task — create three new files + one surgical edit to detail page

### File 1 (new) — `src/components/project/reference-uploader.tsx`

Client Component (`"use client"`).

**Props:** `{ projectId: string }`.

**Structure:**
- Two tabs: "Image" / "URL" (use shadcn `<Tabs>` — already installed from subtask 05).
- **Image tab** — `react-dropzone` (installed in subtask 03):
  - Accept `image/jpeg, image/png, image/webp, image/gif`, max 10 MB each, multi-file (`multiple: true`).
  - On drop: for each accepted file, upload to Supabase storage bucket `project-references` at path `${projectId}/${crypto.randomUUID()}.${ext}` using the browser client (`createSupabaseBrowser` from `@/lib/supabase/client`).
  - After successful upload, call the `addReference` Server Action with `{ projectId, kind: "image", storage_path: "<bucket>/<path>" }`.
  - Show an inline spinner next to the dropzone while files are in flight. On error, `toast.error(t("url_failed"))` (reuse `refs.url_failed` since no `upload_failed` key exists) — or use a generic `errors.generic` from the `errors` namespace.
  - Dropzone body text: `t("drop_hint")`.
- **URL tab** — text input + a "Add" button:
  - Input placeholder `t("url_ph")`.
  - On submit: show `t("url_fetching")` state (button disabled + spinner), POST to `/api/unfurl` with `{ url }`, get back OgData.
  - Then call `addReference` Server Action with `{ projectId, kind: "url", external_url: url, og_title, og_description, og_image_url }` (from the OgData response).
  - On fetch failure or empty response, still call `addReference` with just the URL and empty og_* fields (let the user add the URL without metadata).

**Do NOT render refs here.** The grid is a separate server component.

### File 2 (new) — `src/components/project/reference-grid.tsx`

Server Component (no `"use client"`).

**Props:** `{ projectId: string }`.

**Behavior:**
- Query `project_references` for this project via `createSupabaseServer()`. Select: `id, kind, storage_path, external_url, og_title, og_description, og_image_url, caption, created_at`.
- For each row of `kind="image"` with a `storage_path`, generate a signed URL via `supabase.storage.from("project-references").createSignedUrl(path, 3600)` — or if storage_path is already the bucket-qualified prefix, strip the bucket from the path. Inspect the actual storage_path convention used by your upload code from File 1 to match.
- Responsive grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`.
- Each card:
  - Thumbnail (aspect-square, `object-cover`). For images: signed URL. For URL refs: `og_image_url` if present, otherwise a muted placeholder box with a link icon.
  - Title: `og_title` (URL) or filename parsed from `storage_path` (image). Truncate to 2 lines.
  - Description: `og_description` if present (muted, single line truncate).
  - Caption input: an inline-editable `<Input>` (you'll need a tiny client wrapper for the input — either add a `caption-editor.tsx` sub-component with `"use client"` that calls an `updateCaption` server action, OR keep captions read-only for this subtask and defer editing to Phase 1.3). **Simplest path: read-only caption for this subtask.** If a caption exists, render it muted. Skip the editable input entirely. Note this scope-cut in the result file.
  - Remove button (hover-only): triggers `<form action={removeReference}>` with hidden `referenceId` input. Label via `t("remove")`.
- If zero rows, render a small muted "no refs yet" line (reuse any existing neutral key or render an em-dash — do NOT add new keys).

### File 3 (new) — `src/app/[locale]/app/projects/[id]/ref-actions.ts`

Server Action file. Note: use a separate filename (`ref-actions.ts`) to avoid collision with the existing `actions.ts` from subtask 07 (transitionStatus).

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const addSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(["image","url"]),
  storage_path: z.string().optional().nullable(),
  external_url: z.string().url().optional().nullable(),
  og_title: z.string().optional().nullable(),
  og_description: z.string().optional().nullable(),
  og_image_url: z.string().url().optional().nullable(),
}).refine(
  (d) => (d.kind === "image" && !!d.storage_path) || (d.kind === "url" && !!d.external_url),
  { message: "kind mismatch" }
);

export async function addReference(input: unknown) {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // RLS ensures the user can only write to projects they have access to.
  const { error } = await supabase.from("project_references").insert({
    project_id: parsed.data.projectId,
    created_by: user.id,
    kind: parsed.data.kind,
    storage_path: parsed.data.storage_path ?? null,
    external_url: parsed.data.external_url ?? null,
    og_title: parsed.data.og_title ?? null,
    og_description: parsed.data.og_description ?? null,
    og_image_url: parsed.data.og_image_url ?? null,
  });
  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  return { ok: true as const };
}

export async function removeReference(formData: FormData) {
  const referenceId = formData.get("referenceId");
  if (typeof referenceId !== "string") return { error: "validation" as const };
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // Fetch the ref to know which project to revalidate
  const { data: ref } = await supabase
    .from("project_references")
    .select("project_id, storage_path")
    .eq("id", referenceId)
    .maybeSingle();
  if (!ref) return { error: "not_found" as const };

  // Delete the storage object if any (RLS on storage enforces access)
  if (ref.storage_path) {
    await supabase.storage.from("project-references").remove([ref.storage_path]);
  }
  const { error } = await supabase
    .from("project_references")
    .delete()
    .eq("id", referenceId);
  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/projects/${ref.project_id}`, "page");
  return { ok: true as const };
}
```

Verify column names in `database.types.ts` before finalizing. If a column differs (e.g., `uploaded_by` instead of `created_by`), adjust.

### File 4 (modify) — `src/app/[locale]/app/projects/[id]/page.tsx`

**Surgical edit.** Find the "References" placeholder section (the one added in subtask 07 that renders `{refsCount ?? 0}`). Replace the placeholder body with:

```tsx
<ReferenceUploader projectId={project.id} />
<ReferenceGrid projectId={project.id} />
```

Add these two imports near the existing imports:

```ts
import { ReferenceUploader } from "@/components/project/reference-uploader";
import { ReferenceGrid } from "@/components/project/reference-grid";
```

Do NOT touch:
- The Thread section (subtask 09 is handling that in parallel).
- The metadata sidebar.
- The action dropdown.
- The imports/usage for the transitionStatus action.
- The section heading for References (keep whatever `<h2>` was there — just replace the placeholder body below it).

Also: the `refsCount` variable is no longer needed in the heading — but leaving it for now is fine. If it was used in a "X items" pattern, it's already been removed per subtask 07 loop 2. Do not re-introduce.

## Non-negotiables

- Uploader is a Client Component with `"use client"`; Grid is a Server Component.
- `createSupabaseBrowser` for client uploads; `createSupabaseServer` for server queries and actions.
- No inline Supabase client instantiation anywhere.
- Every user-facing string via `useTranslations("refs")` (client) or `getTranslations("refs")` (server). Do NOT add new i18n keys.
- Phase 1.0.6 tokens only. Pill CTAs. No warm tones.
- Type-safe throughout. `pnpm tsc --noEmit` must be clean.

## Acceptance criteria

1. Dropzone accepts 2 image files → both uploaded to `project-references` bucket → both rows inserted → visible in grid after revalidate.
2. URL tab with an external URL (e.g., `https://example.com`) → `/api/unfurl` called → row inserted with og_* fields (may be empty for example.com) → visible in grid.
3. Remove button on a card → deletes the row + removes the storage object (if image).
4. Zero-state grid renders cleanly.
5. `pnpm tsc --noEmit` clean.
6. No new i18n keys added.
7. No merge conflict with subtask 09 — only the References section of page.tsx is modified.

## Result file format (`results/08_reference_collector.md`)

```markdown
# Subtask 08 result
status: complete
files_created:
  - src/components/project/reference-uploader.tsx (NN bytes)
  - src/components/project/reference-grid.tsx (NN bytes)
  - src/app/[locale]/app/projects/[id]/ref-actions.ts (NN bytes)
files_modified:
  - src/app/[locale]/app/projects/[id]/page.tsx (References section only)
shadcn_components_added:
  - <list or "none">
scope_cuts:
  - Caption editing deferred — captions render read-only for this subtask.  # remove if you built the editor
db_column_adjustments:
  - <any adjustments from spec vs actual schema>
storage_path_convention:
  - <describe what you stored — e.g., "just the path within bucket, no bucket prefix">
tsc_check: clean
acceptance: PASS — uploads + URL unfurl + grid + remove wired; detail page integrated.
```

If blocked: `status: blocked` + `reason: <one line>`.
