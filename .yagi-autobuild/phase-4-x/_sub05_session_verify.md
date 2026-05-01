# Wave C.5b sub_05 — Email confirm session auto-set verification

**Question**: When a user clicks the email-confirm link, does the session
cookie get set on the eventual /onboarding/workspace landing — i.e. do
they arrive **authenticated**, with no second sign-in step?

**Answer**: Yes, the existing wiring already does this. sub_05 is a
verification + comment-tightening pass; no functional change is needed.

## The chain (verified by code-trace)

1. **Email click** → browser opens
   `https://studio.yagiworkshop.xyz/auth/callback?code=<code>&type=signup`.
2. **Route handler** at `src/app/auth/callback/route.ts` runs in a
   Node.js / edge runtime context where `next/headers` `cookies()`
   returns a **mutable** CookieStore (Next.js 15 Route Handler
   semantics).
3. `createSupabaseServer()` (`src/lib/supabase/server.ts`) builds an
   `@supabase/ssr` server client whose `setAll` adapter writes each
   incoming `{ name, value, options }` via `cookieStore.set(name,
   value, options)`. The adapter's try/catch swallows errors
   *silently* — the catch path only fires when called from a Server
   Component context (read-only cookies); inside a Route Handler the
   write is real.
4. `supabase.auth.exchangeCodeForSession(code)` calls the Supabase
   Auth API, receives the session bundle (`access_token`,
   `refresh_token`, `expires_at`, ...), and invokes `setAll` with the
   3 supabase auth cookies (`sb-<ref>-auth-token` etc.).
5. Those cookies land on the **outgoing response** because Next.js
   merges `cookies().set(...)` writes from a Route Handler into the
   response that the handler ultimately returns — even when the
   return value is `NextResponse.redirect(...)`. (Documented in
   Next.js 15 cookies API.)
6. **Profile lookup** fires next; on `!profile` the route returns
   `NextResponse.redirect(${origin}/${locale}/onboarding/workspace)`.
   The browser follows the 307 with the auth cookies attached, hits
   /onboarding/workspace, the workspace page's server-component
   `getOnboardingState()` reads the session via the same
   `createSupabaseServer()` (now read-only in RSC context) — and
   `auth.getUser()` resolves to the authenticated user.

## Why this could break (and when to revisit)

- **Edge runtime swap**: if `route.ts` ever gains
  `export const runtime = "edge"`, the cookies API surface changes.
  We do not currently set the runtime, so it stays Node.js.
- **Middleware races**: `src/middleware.ts` runs `updateSupabaseSession`
  on every matched request. `auth/callback` is in the middleware
  exclude list (`/((?!api|_next|_vercel|auth/callback|...).*)`), so
  the callback is NOT double-processed. Good.
- **Cross-domain cookie**: `emailRedirectTo` in signup is
  `${siteUrl}/auth/callback` where `siteUrl` is
  `process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin`. The
  resulting auth cookie is scoped to that origin. As long as the
  user finishes the email-confirm round-trip on the same origin they
  signed up from, the cookie is valid. The dev / prod origin split
  is per-environment by design.

## Manual verification yagi can run

When `pnpm dev` is back up:

1. Sign up at `/ko/signup` with a fresh email (use a test inbox).
2. Open the email and click the confirm link. The redirect chain
   should be:
   - `/auth/callback?code=...`
   - `/ko/onboarding/workspace`
3. Open DevTools → Application → Cookies. Three Supabase auth
   cookies named `sb-<projectRef>-auth-token{,.0,.1}` should be
   present, scoped to the host, marked HttpOnly + Secure (in prod).
4. Refresh `/ko/onboarding/workspace`. The page should render the
   workspace form (i.e. user is authenticated). If it bounces to
   `/signin`, the cookies didn't propagate and this verification
   has regressed.
