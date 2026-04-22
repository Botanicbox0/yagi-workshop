# Subtask 08 feedback — loop 1
verdict: PASS

## Checks
- Client/Server directives: pass — `reference-uploader.tsx` opens with `"use client"` (line 1); `reference-grid.tsx` has no `"use client"` directive, confirming Server Component.
- Supabase client usage: pass — uploader uses `createSupabaseBrowser` from `@/lib/supabase/client`; grid and ref-actions use `createSupabaseServer` from `@/lib/supabase/server`. No inline client instantiation.
- Dropzone config + storage path: pass — accepts `image/jpeg`, `image/png`, `image/webp`, `image/gif`; `maxSize: 10 * 1024 * 1024`; `multiple: true`. Storage path stored as `${projectId}/${crypto.randomUUID()}.${ext}` (no bucket prefix), matching the documented convention. Grid strips no prefix and passes `storage_path` directly to `createSignedUrl` — consistent.
- URL tab + unfurl: pass — POSTs to `/api/unfurl` with `{ url }`, handles failure by catching and falling back to calling `addReference` with just the URL and empty og_* fields. Button disabled + spinner during fetch state.
- addReference validation (no kind column): pass — Zod schema has no `kind` field; `.refine()` requires either `storage_path` or `external_url`; insert to DB omits `kind` entirely, matching the documented schema adjustment (`added_by` used instead of `created_by`).
- removeReference: pass — takes `FormData`, validates `referenceId` is a string, fetches ref to get `storage_path` + `project_id`, deletes storage object if `storage_path` exists, deletes DB row, revalidates path. Returns `{ error } | { ok }` shape throughout.
- Grid rendering: pass — `createSignedUrl` with 3600s expiry for image refs; `og_image_url` for URL refs with Link-icon placeholder fallback; responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`; `line-clamp-2` on title, `line-clamp-1` on description; captions read-only (scope cut noted). Zero-state renders `—` (em-dash, no new key).
- page.tsx surgical edit + parallel non-overlap: pass — imports `ReferenceUploader` + `ReferenceGrid` added (lines 14-15); References section body uses both components (lines 358-359); Thread section with `ThreadPanelServer` coexists cleanly at lines 362-368. Metadata sidebar, action dropdown, and `transitionStatus` imports untouched.
- i18n keys unchanged: pass — `refs` namespace in both `ko.json` and `en.json` contains exactly the 8 keys specified in the task (`title, add_image, add_url, url_ph, url_fetching, url_failed, caption_ph, drop_hint, remove`). No new keys added.
- tsc clean: pass — `pnpm tsc --noEmit` produced no output (zero errors).
- No hardcoded strings: pass — all user-facing strings use `useTranslations("refs")` + `useTranslations("errors")` in the client uploader and `getTranslations("refs")` in the server grid. No hardcoded English strings in UI.
- No warm tones: pass — no `amber`, `cognac`, `bone`, or `orange` Tailwind classes found in either component. Uses `bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground` only.

## Notes
- The `refsCount` variable in `page.tsx` (line 205) is still fetched and assigned but never rendered in the References section heading — this is harmless (spec explicitly says leaving it is fine) and does not affect functionality or types.
- The remove button in `reference-grid.tsx` uses an async form action inline (`async (fd) => { await removeReference(fd); }`). This is the same pattern used by the status transition dropdown in `page.tsx` and is idiomatic for Next.js 15 App Router Server Actions.
