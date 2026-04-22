import "server-only";

import { headers } from "next/headers";

/**
 * Phase 1.9 Wave C subtask 04 — locale resolver for the public /showcase/[slug]
 * viewer. This route is intentionally locale-free in the URL, so we derive
 * the locale from the Accept-Language header, defaulting to "ko".
 *
 * Mirrors the Phase 1.8 unsubscribe pattern but has no user/token to look
 * up a stored preference — the showcase is anonymous by design.
 */
export async function resolveShowcaseLocale(): Promise<"ko" | "en"> {
  try {
    const h = await headers();
    const accept = h.get("accept-language") ?? "";
    if (accept.toLowerCase().startsWith("en")) return "en";
  } catch {
    // headers() unavailable — fall through to default.
  }
  return "ko";
}
