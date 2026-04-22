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
