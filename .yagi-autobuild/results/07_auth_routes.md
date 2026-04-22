---
id: 07
name: Auth routes (signin, signup, callback)
status: complete
executed_at: 2026-04-21
---

# Subtask 07 — Result

## Files created

- `src/app/[locale]/(auth)/layout.tsx`
- `src/app/[locale]/(auth)/signin/page.tsx`
- `src/app/[locale]/(auth)/signup/page.tsx`
- `src/app/auth/callback/route.ts`

## Commands run

### `npx tsc --noEmit`

```
(no output — exit code 0, type check passed)
```

## Acceptance criteria

- [x] All 4 files created at the specified paths
- [x] Parenthesized `(auth)` folder is an App Router route group (not in URL)
- [x] `npx tsc --noEmit` passes
- [x] Callback route imports `createSupabaseServer` from `@/lib/supabase/server`
- [x] Callback redirects to `/{locale}/onboarding` if no profile, else `/{locale}/app`
- [x] No other files touched

## Notes

- `layout.tsx` is a server component (no `"use client"` directive).
- signin and signup pages are client components using RHF + zod + Supabase browser client.
- Callback route exchanges code for session, looks up `profiles` row, redirects based on presence.
- Supports optional `next` query param for post-auth redirect.
