---
id: 01
name: Supabase SSR clients
status: pending
assigned_to: executor
---

# Subtask 01 — Supabase SSR Clients

## Goal
Create three TypeScript modules that wrap `@supabase/ssr` for Next.js 15 App Router:
1. Server-side client (async cookies API of Next 15)
2. Browser client
3. Middleware session-refresh helper

## Files to create

### File 1: `src/lib/supabase/server.ts`

Exports named async function `createSupabaseServer()` returning an SSR client. Must use Next 15's async `cookies()` API (i.e., `const cookieStore = await cookies()`). Must use `createServerClient` from `@supabase/ssr`.

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (read-only cookies) — ignore.
          }
        },
      },
    }
  );
}
```

### File 2: `src/lib/supabase/client.ts`

Exports named function `createSupabaseBrowser()`. Uses `createBrowserClient` from `@supabase/ssr`.

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### File 3: `src/lib/supabase/middleware.ts`

Exports named async function `updateSupabaseSession(request: NextRequest, response: NextResponse): Promise<NextResponse>`. This is the helper invoked by `src/middleware.ts` to refresh auth tokens on every request.

The function must:
- Build a Supabase server client that reads request cookies and writes to both request and response.
- Call `supabase.auth.getUser()` to refresh the token.
- Return the updated response.
- IMPORTANT: do not mutate the response by constructing a new one from scratch when an existing response (e.g., from next-intl) has already been produced — mutate the cookies on the passed-in response.

```ts
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}
```

## Acceptance criteria

- [ ] `src/lib/supabase/server.ts` exists and exports `createSupabaseServer`
- [ ] `src/lib/supabase/client.ts` exists and exports `createSupabaseBrowser`
- [ ] `src/lib/supabase/middleware.ts` exists and exports `updateSupabaseSession`
- [ ] `npx tsc --noEmit` passes with no new errors introduced by these three files
- [ ] No changes to any other files
- [ ] `@supabase/ssr` already installed (check package.json) — do not add deps

## Notes for executor

- Use Write tool to create each file.
- Do not import or reference a `Database` type yet — that comes in subtask 05.
- Do not modify `src/middleware.ts` — that is subtask 02.
- The `try/catch` in server.ts around `cookieStore.set` is intentional; Next.js forbids cookie writes in Server Components but allows them in Route Handlers / Server Actions — the catch silences the RSC case.
