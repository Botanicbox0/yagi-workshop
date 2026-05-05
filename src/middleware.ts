import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// Phase 4.x task_05 — /app/commission/* -> /app/projects redirect.
// Phase 2.x leftover surface; Phase 4 funnels all client intake through
// /app/projects. Open-redirect protection: we drop ALL query params
// (specifically `?next=https://evil.com` is ignored) and target a
// fixed in-app path.
//
// Matches both locale-prefixed and locale-free forms; the locale-free
// case targets the routing default locale.
const COMMISSION_WITH_LOCALE = /^\/(ko|en)\/app\/commission(?:\/.*)?$/;
const COMMISSION_NO_LOCALE = /^\/app\/commission(?:\/.*)?$/;

function maybeRedirectCommission(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const localedMatch = path.match(COMMISSION_WITH_LOCALE);
  if (localedMatch) {
    const locale = localedMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/app/projects`;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }
  if (COMMISSION_NO_LOCALE.test(path)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}/app/projects`;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }
  return null;
}

export default async function middleware(request: NextRequest) {
  const commissionRedirect = maybeRedirectCommission(request);
  if (commissionRedirect) return commissionRedirect;

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
    // Phase 4.x Wave C.5b sub_02 — `u` removed (creator handle profile
    // tree at /u/<handle> is gone). Keeping it in the exclude was a
    // forward-leak from the deleted Phase 2.5 surface.
    // Phase 4.x Wave C.5c sub_01 — `auth/confirm` added (PKCE
    // intermediate verify endpoint; same locale-free shape as
    // auth/callback).
    // Phase 7 Wave A.4 — `campaigns` added (locale-free public landing
    // at /campaigns and /campaigns/[slug]; parallel to showcase +
    // challenges).
    "/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|campaigns|.*\\..*).*)",
  ],
};
