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
    // Skip: Next.js internals, Vercel internals, API, auth callback, locale-free
    // public surfaces (showcase, challenges), static files.
    //
    // Phase 2.1 G6 #5/#6 — added `showcase` and `challenges` to the negative
    // lookahead so the locale-free public routes at src/app/showcase/[slug]/
    // and src/app/challenges/ (Phase 2.5) are NOT prefixed with a locale by
    // next-intl. Previously `/showcase/<slug>` was being redirected to
    // `/{defaultLocale}/showcase/<slug>` which matched no route, falling
    // back to Next's default 404 and making the custom not-found.tsx
    // unreachable (and the Phase 2.0 G6 L5 html/body shell fix inert).
    "/((?!api|_next|_vercel|auth/callback|showcase|challenges|u|.*\\..*).*)",
  ],
};
