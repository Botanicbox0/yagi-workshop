// Phase 4.x task_06 — Active workspace resolver.
//
// Decision lock-in (_decisions_locked.md section 2): cookie-based.
// The cookie 'yagi_active_workspace' carries a uuid. Every server-side
// page render that needs the active workspace must validate the
// cookie's uuid against workspace_members for the current user, then
// fall back to the first membership if invalid or absent.
//
// Cookie tampering is fully defended:
//   1. The cookie value is not trusted -- we always re-check
//      workspace_members membership on the server.
//   2. If the cookie's uuid is not a valid membership for this user,
//      we ignore it and use first-member fallback. (We do NOT trust
//      the cookie even for read-only display.)
//
// Phase 4 caveat: workspaces.kind column is added by task_01 migration
// (Wave D D.1 apply). Until apply, the SELECT returns undefined for
// kind; we coerce to 'brand' (matches task_01 UPDATE that sets every
// existing row to 'brand'). Post-apply, kind is one of 3 enum values.

import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 7 Wave C.1 — 'creator' added by migration 20260506200000.
// Lightweight workspace kind auto-created at campaign submission time
// (Talenthouse pattern). 'agency' is reserved for Phase 11 compensation
// routing partnerships.
export type WorkspaceKind =
  | "brand"
  | "agency"
  | "artist"
  | "creator"
  | "yagi_admin";

export type ActiveWorkspaceMembership = {
  id: string;
  name: string;
  kind: WorkspaceKind;
};

export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function narrowKind(value: unknown): WorkspaceKind {
  if (
    value === "brand" ||
    value === "agency" ||
    value === "artist" ||
    value === "creator" ||
    value === "yagi_admin"
  ) {
    return value;
  }
  return "brand";
}

/**
 * Returns the user's workspace memberships, joined with workspace name + kind.
 * Used by the workspace switcher dropdown to render full lists. The active
 * one is found by `id === activeWorkspaceId`.
 *
 * Cross-tenant guard: the SELECT joins through workspace_members for the
 * caller's user_id, so RLS scopes naturally. workspaces RLS already gates
 * SELECT to members.
 */
export async function listOwnWorkspaces(
  userId: string,
): Promise<ActiveWorkspaceMembership[]> {
  const supabase = await createSupabaseServer();
  // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
  const sb = supabase as any;
  const { data: rows } = (await sb
    .from("workspace_members")
    .select(
      `
      workspace_id,
      created_at,
      workspace:workspaces ( id, name, kind )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true })) as {
    data:
      | {
          workspace_id: string;
          workspace: { id: string; name: string; kind?: string } | null;
        }[]
      | null;
  };

  const list: ActiveWorkspaceMembership[] = [];
  for (const r of rows ?? []) {
    if (!r.workspace) continue;
    list.push({
      id: r.workspace.id,
      name: r.workspace.name,
      kind: narrowKind(r.workspace.kind),
    });
  }
  return list;
}

/**
 * Resolve the user's currently-active workspace. Reads the
 * 'yagi_active_workspace' cookie, validates membership against
 * workspace_members, and falls back when the cookie is absent,
 * malformed, or doesn't correspond to a valid membership.
 *
 * Phase 6/A.2 — Artist sign-in default:
 * When no valid cookie exists, prefer the user's most-recently-joined
 * Artist workspace over the simple first-membership fallback. This
 * ensures Artist users land in their own Artist workspace by default
 * rather than a Brand workspace they may also belong to.
 * listOwnWorkspaces returns memberships ordered by created_at ASC, so
 * we scan in reverse to pick the most recently joined artist workspace.
 *
 * Returns null when the user has no workspace memberships at all
 * (caller should redirect to /onboarding).
 */
export async function resolveActiveWorkspace(
  userId: string,
): Promise<ActiveWorkspaceMembership | null> {
  const memberships = await listOwnWorkspaces(userId);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (cookieValue && UUID_RE.test(cookieValue)) {
    const match = memberships.find((m) => m.id === cookieValue);
    if (match) return match;
    // Fall through to default selection. We deliberately do NOT attempt
    // to clear the cookie here -- this resolver is read-only (cookies()
    // in next/headers is read in server components). The
    // setActiveWorkspace server action is the only writer; if a stale
    // cookie keeps arriving here, the resolver silently falls back
    // without leaking which workspace_id the user does NOT belong to.
  }

  // Phase 6/A.2 — Artist sign-in default: prefer the most-recently-joined
  // Artist workspace so Artist users enter their own workspace by default.
  // listOwnWorkspaces orders by created_at ASC; we want most-recent,
  // so iterate in reverse.
  for (let i = memberships.length - 1; i >= 0; i--) {
    if (memberships[i].kind === "artist") return memberships[i];
  }

  return memberships[0];
}
