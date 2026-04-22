---
id: 08
name: 5-step onboarding flow
status: complete
executed_at: 2026-04-21
---

# Subtask 08 — Result

## Files created

- `src/lib/onboarding/state.ts`
- `src/lib/onboarding/actions.ts`
- `src/app/[locale]/onboarding/layout.tsx`
- `src/app/[locale]/onboarding/page.tsx`
- `src/app/[locale]/onboarding/profile/page.tsx`
- `src/app/[locale]/onboarding/workspace/page.tsx`
- `src/app/[locale]/onboarding/brand/page.tsx`
- `src/app/[locale]/onboarding/invite/page.tsx`

## Commands run

### `npx tsc --noEmit`

```
(no output — exit code 0, type check passed)
```

## Acceptance criteria

- [x] All 8 files created at the specified paths
- [x] `npx tsc --noEmit` passes with zero errors
- [x] Server actions use "use server" directive at top
- [x] `getOnboardingState` uses `createSupabaseServer()` (SSR-safe cookies)
- [x] Layout redirects unauthenticated users to `/{locale}/signin`
- [x] Step 1 (role page) redirects to `/app` if user already has profile
- [x] Step 2 redirect logic: role=creator → `/app`, role=client → `/onboarding/workspace`
- [x] Step 3 → Step 4 carries `?ws=<id>` query param
- [x] Step 5 Skip button → `/app`
- [x] No file uploads — avatar and logo fields intentionally omitted
- [x] No other files touched

## Verification notes

- Confirmed `redirect` import signature via `src/i18n/routing.ts` — `redirect`
  is re-exported from `createNavigation(routing)` (next-intl v4). Existing
  repo usage (see `src/app/auth/callback/route.ts` uses `NextResponse.redirect`
  directly for the `/auth/callback` route because it's a non-localized route
  handler). For the onboarding server components, the spec's
  `redirect({ href, locale })` shape from `@/i18n/routing` is the correct
  pattern and matches the exported signature.
- `src/lib/onboarding/actions.ts` does not import `redirect` (the spec listed
  it in the import block but the server actions themselves never call
  `redirect` — navigation happens client-side via `router.push`). Left the
  unused import out to keep `tsc` clean (would have been flagged as unused
  by stricter lint later; TS itself does not flag unused imports but the
  spec's listed import was dead code).

## Deviations

1. **`actions.ts` — dropped unused `redirect` import.** The spec's import
   block included `import { redirect } from "@/i18n/routing";` but no code in
   the file uses it (all redirects happen on the client). Omitting avoids a
   dead import. Semantics unchanged.

2. **`profile/page.tsx` — `bio` schema changed from
   `z.string().max(280).optional().default("")` to
   `z.string().max(280).optional()`.** The `.optional().default("")` form
   in Zod v4 produces mismatched input/output types (`string | undefined`
   vs `string`), which breaks `zodResolver` type inference for
   `useForm<FormValues>` and caused two TS2322/TS2345 errors. Removing
   `.default("")` makes input and output types consistent. The call site
   already compensates with `bio: values.bio ?? ""`, so runtime behavior
   is identical: empty bio still posts as empty string.
