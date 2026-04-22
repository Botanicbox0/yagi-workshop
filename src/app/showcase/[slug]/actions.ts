"use server";

/**
 * Phase 1.9 Wave C subtask 04 — public showcase viewer Server Actions.
 *
 * All actions here run against the service-role client because the viewer
 * is unauthenticated by design (public brand surface). Slugs act as the
 * capability token; password gating is an optional second factor.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createSupabaseService } from "@/lib/supabase/service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Password unlock session: valid for 24 hours. Long enough to survive a
// re-share in a group chat but short enough that a shared device forgets
// after a day.
const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

// View-count dedupe cookie: also 24h, matching spec §04 "rate-limit to 1
// increment per IP per 24h" (we use a cookie as a per-client proxy — the
// true IP rate-limit would need an edge KV which we don't have yet).
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

type UnlockResult =
  | { ok: true }
  | { ok: false; error: "invalid_password" | "not_found" | "server_error" };

/**
 * Verify a password against `showcases.password_hash` and, on success, set
 * a short-lived session cookie `sc_unlock_{id}=1` so subsequent renders
 * skip the password prompt.
 */
export async function unlockShowcase(
  showcaseId: string,
  password: string,
  slug: string,
): Promise<UnlockResult> {
  if (!UUID_RE.test(showcaseId)) {
    return { ok: false, error: "not_found" };
  }
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "invalid_password" };
  }

  let svc;
  try {
    svc = createSupabaseService();
  } catch (err) {
    console.error("[showcase/unlock] service init failed", err);
    return { ok: false, error: "server_error" };
  }

  const { data, error } = await svc
    .from("showcases")
    .select("id, password_hash, is_password_protected, status")
    .eq("id", showcaseId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[showcase/unlock] lookup failed", error);
    return { ok: false, error: "server_error" };
  }
  if (!data) {
    return { ok: false, error: "not_found" };
  }
  if (!data.is_password_protected || !data.password_hash) {
    // No gate to unlock — treat as success so client can refresh.
    return { ok: true };
  }

  let matches = false;
  try {
    matches = await bcrypt.compare(password, data.password_hash);
  } catch (err) {
    console.error("[showcase/unlock] bcrypt compare failed", err);
    return { ok: false, error: "server_error" };
  }
  if (!matches) {
    return { ok: false, error: "invalid_password" };
  }

  try {
    const store = await cookies();
    store.set({
      name: `sc_unlock_${showcaseId}`,
      value: "1",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: UNLOCK_COOKIE_MAX_AGE,
    });
  } catch (err) {
    console.error("[showcase/unlock] cookie set failed", err);
    return { ok: false, error: "server_error" };
  }

  if (slug) revalidatePath(`/showcase/${slug}`);
  return { ok: true };
}

/**
 * Fire-and-forget view-count increment. Caller intentionally does not
 * `await` this — never block page render on it. All errors are swallowed
 * and logged.
 *
 * Dedupe strategy: a 24h `sc_viewed_{id}` cookie. If present, skip. This
 * is per-client, not per-IP; a true per-IP check requires edge KV we
 * don't have yet (tracked for Phase 1.10+).
 */
export async function incrementShowcaseView(
  showcaseId: string,
): Promise<void> {
  try {
    if (!UUID_RE.test(showcaseId)) return;

    const store = await cookies();
    const cookieName = `sc_viewed_${showcaseId}`;
    if (store.get(cookieName)?.value === "1") return;

    const svc = createSupabaseService();

    try {
      await svc.rpc("increment_showcase_view", { sid: showcaseId });
    } catch (err) {
      console.error("[showcase] incrementShowcaseView rpc:", err);
    }

    store.set({
      name: cookieName,
      value: "1",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: VIEW_COOKIE_MAX_AGE,
    });
  } catch (err) {
    console.error("[showcase/view] increment threw", err);
  }
}
