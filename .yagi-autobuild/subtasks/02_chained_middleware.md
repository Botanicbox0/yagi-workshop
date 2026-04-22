---
id: 02
name: Chained middleware (next-intl + Supabase session refresh)
status: pending
assigned_to: executor
---

# Subtask 02 — Chained Middleware

## Goal
Replace `src/middleware.ts` so that on every matched request:
1. `next-intl` middleware runs first (produces a response — handles locale prefix redirects).
2. Then `updateSupabaseSession` runs on that response to refresh Supabase auth cookies.

## Current file (for reference — replace it)

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

## Replacement

```ts
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  return updateSupabaseSession(request, response);
}

export const config = {
  matcher: [
    // Skip: Next.js internals, Vercel internals, API, auth callback, static files
    "/((?!api|_next|_vercel|auth/callback|.*\\..*).*)",
  ],
};
```

## Acceptance criteria

- [ ] `src/middleware.ts` rewritten to the replacement above
- [ ] Matcher excludes `/auth/callback` (so the Supabase code-exchange route is not wrapped by locale middleware)
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm dev` starts cleanly (you can skip this if it would block — just verify the file compiles)
- [ ] No changes to any other files

## Notes for executor

- Use Edit tool since the file already exists.
- Do NOT import or use Supabase server-side client here — only `updateSupabaseSession`.
- The `auth/callback` route lives at `src/app/auth/callback/route.ts` (outside [locale]) — excluding it from next-intl means no locale rewrite is attempted on the OAuth callback URL.
