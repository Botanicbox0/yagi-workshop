import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

// Phase 4.x Wave C.5c sub_01 — PKCE flow.
// Why: Gmail / Outlook link-preview crawlers GET the email confirm URL
// before the user can click it, single-use-consuming the OTP and
// landing the real click on /auth/expired. PKCE moves the consume to
// an explicit verifyOtp() call inside our /auth/confirm route handler,
// so a passive crawler GET no longer drains the token.
//
// flowType = 'pkce' on the BROWSER client is what makes signUp() /
// resetPasswordForEmail() store a code_verifier locally that the
// matching /auth/confirm verify call needs.
export function createSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "pkce" },
    },
  );
}
