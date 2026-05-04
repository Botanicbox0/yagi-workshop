## VERDICT: NEEDS-ATTENTION

[FINDING 1] MED: `src/app/[locale]/app/projects/[id]/delete-actions.ts:112` — TOCTOU 0-row UPDATE is treated as success. The UPDATE has the right defensive filters (`id`, `created_by`, `status IN`, `deleted_at IS NULL`), but Supabase/PostgREST returns no error when those filters match 0 rows. If status flips to `in_progress` after the SELECT, the project is not deleted, yet the action revalidates and returns `{ ok: true }`. Recommended fix: append `.select("id")`, inspect returned rows, and return an error when length is 0.

RLS audit complete: `client` and `ws_admin` cannot write `deleted_at` through `projects_update` WITH CHECK; this action correctly uses `createSupabaseService()` and preserves creator/status/deleted filters. `yagi_admin` gets no special branch, which is consistent with the creator-only action contract. Different-user same-workspace is blocked before UPDATE by `created_by !== user.id`.

`revalidatePath("/[locale]/app/projects", "page")` is consistent with Next.js App Router route-pattern revalidation for a dynamic segment; `type: "page"` is required for dynamic patterns per the current docs: https://nextjs.org/docs/app/api-reference/functions/revalidatePath

Run log: NEEDS-ATTENTION — one MED TOCTOU result-check gap; auth/RLS/service-role filters otherwise hold.