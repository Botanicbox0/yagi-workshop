import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Phase 4.x Wave C.5c sub_01 — PKCE flow parity with server.ts /
      // client.ts. Middleware reads/writes the same auth cookies; if the
      // flowType differs across clients, code_verifier handling drifts.
      auth: { flowType: "pkce" },
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
