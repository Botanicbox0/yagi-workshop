import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Phase 4.x Wave C.5c sub_01 — PKCE flow. Mirrors client.ts so
      // /auth/confirm's verifyOtp call finds the matching code_verifier
      // cookie set by signUp() at signup time. See client.ts for the
      // Gmail-crawler rationale.
      auth: { flowType: "pkce" },
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
