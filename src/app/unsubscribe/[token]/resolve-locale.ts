import "server-only";

import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Resolve the recipient's locale for the unsubscribe page.
 *
 * Order of preference:
 *   1. profiles.locale (looked up via token → user_id)
 *   2. Accept-Language header (prefix "ko" wins, otherwise "en")
 *   3. "ko" (default)
 */
export async function resolveUnsubscribeLocale(
  token: string,
): Promise<"ko" | "en"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey && token) {
    try {
      const admin = createClient<Database>(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: tokenRow } = await admin
        .from("notification_unsubscribe_tokens")
        .select("user_id")
        .eq("token", token)
        .maybeSingle();

      if (tokenRow?.user_id) {
        const { data: profile } = await admin
          .from("profiles")
          .select("locale")
          .eq("id", tokenRow.user_id)
          .maybeSingle();
        if (profile?.locale === "en") return "en";
        if (profile?.locale === "ko") return "ko";
      }
    } catch (err) {
      console.error("[unsubscribe/resolve-locale] lookup failed:", err);
    }
  }

  try {
    const h = await headers();
    const accept = h.get("accept-language") ?? "";
    if (accept.toLowerCase().startsWith("en")) return "en";
  } catch {
    // headers() unavailable — fall through to default.
  }

  return "ko";
}
