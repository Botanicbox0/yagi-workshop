# Subtask 08 result
status: complete
files_created:
  - src/components/project/reference-uploader.tsx (5434 bytes)
  - src/components/project/reference-grid.tsx (4255 bytes)
  - src/app/[locale]/app/projects/[id]/ref-actions.ts (2644 bytes)
files_modified:
  - src/app/[locale]/app/projects/[id]/page.tsx (References section only)
shadcn_components_added:
  - none (tabs already installed; no new components required)
scope_cuts:
  - Caption editing deferred — captions render read-only for this subtask.
db_column_adjustments:
  - Spec specified `created_by` column; actual schema has `added_by` — adjusted all inserts/selects to use `added_by`.
  - Spec specified `kind` column (enum "image"|"url"); actual schema has NO `kind` column — kind is inferred at runtime: if `storage_path` is set and `external_url` is null → image; if `external_url` is set → URL ref. The `addSchema` Zod schema was updated accordingly (no `kind` field; refine requires either storage_path or external_url).
storage_path_convention:
  - Stored as path within bucket only, no bucket prefix. Format: `{projectId}/{uuid}.{ext}`. Example: `550e8400-e29b-41d4-a716-446655440000/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`. The bucket name `project-references` is NOT included in the stored path. When generating signed URLs in the grid, the raw `storage_path` is passed directly to `supabase.storage.from("project-references").createSignedUrl(path, 3600)`.
tsc_check: clean
acceptance: PASS — uploads + URL unfurl + grid + remove wired; detail page integrated. Parallel constraint respected: only the References section of page.tsx was modified; Thread section (added by subtask 09) left untouched.
