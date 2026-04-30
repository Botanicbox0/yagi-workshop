"use server";

// Phase 4.x task_06 — server actions for the workspace switcher.
//
// Cookie write (the read path is in active.ts via next/headers cookies()).
// We deliberately keep this in a separate server-action file so the
// resolver in active.ts can stay sync-free of any "use server" pragma.
//
// Tampering protection: setActiveWorkspaceAction validates that the
// caller actually belongs to the workspace they ask for. If they don't,
// the cookie is NOT set and the action returns an error. This means
// even if a bad client crafts a POST manually, only their own
// memberships make it into the cookie.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ACTIVE_WORKSPACE_COOKIE } from "./active";

export type SetActiveWorkspaceResult =
  | { ok: true }
  | { ok: false; error: "unauthenticated" | "not_a_member" | "invalid" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setActiveWorkspaceAction(
  workspaceId: string,
): Promise<SetActiveWorkspaceResult> {
  if (!UUID_RE.test(workspaceId)) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Membership check: the workspaces RLS already scopes by member, but
  // we're explicit so the failure mode is a clean error rather than an
  // RLS-empty-result silent miss.
  const { data: row } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!row) return { ok: false, error: "not_a_member" };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    // 90 days — long enough to survive typical client sessions; short
    // enough that an abandoned device eventually reverts to first-member
    // fallback after rotation. Re-write on every successful switch
    // refreshes the expiry.
    maxAge: 60 * 60 * 24 * 90,
  });

  // Re-render the app shell so the new active workspace propagates
  // through the sidebar + dashboards. The /app layout holds the
  // workspace-aware UI.
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}
