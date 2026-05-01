import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 1.1 workspace permission system — unchanged literals, renamed type.
// Per ADR-009 (docs/design/DECISIONS.md).
export type WorkspaceRole =
  | "creator"
  | "workspace_admin"
  | "workspace_member"
  | "yagi_admin";

// Phase 2.5 challenge persona system — distinct namespace.
// NEVER compare against a bare "creator" literal without prefixing with
// `profile.role ===` — see ADR-009 naming rule.
// Phase 2.7 added "client" for the commission-intake persona (ADR-011).
// Phase 4.x Wave C.5b amend_02 added "artist" — DECISIONS Q-094 / §4 of
// PRODUCT-MASTER persona model. The Artist intake surface itself is a
// Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
// the demo account row created in Wave C.5b sub_13/amend_02.
export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";

export type AppContext = {
  userId: string;
  profile: {
    id: string;
    /**
     * Internal-only DB identifier (Phase 4.x Wave C.5b sub_08).
     *
     * `profiles.handle` is auto-generated server-side as `c_<8 hex chars>`
     * and exposed only to internal code paths (auth callback resolver,
     * RLS policies that key off the unique-handle column, future admin
     * tools). It MUST NOT appear in any user-facing surface — sidebar,
     * settings, chat, profile pages, exports, or emails. If you find
     * yourself reaching for `profile.handle` in a JSX/email template,
     * fall back to `display_name` then `id.slice(0, 8)` instead.
     */
    handle: string;
    display_name: string;
    email: string | null;
    avatar_url: string | null;
    locale: "ko" | "en";
    role: ProfileRole | null;
  };
  workspaceRoles: WorkspaceRole[];
  workspaces: { id: string; name: string; slug: string }[];
  currentWorkspaceId: string | null;
};

export async function fetchAppContext(): Promise<AppContext | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, locale, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: rolesRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const workspaceRoles = (rolesRows ?? []).map(
    (r) => r.role as WorkspaceRole
  );

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const workspaces =
    (memberRows ?? [])
      .map((row) => row.workspaces)
      .filter((ws): ws is { id: string; name: string; slug: string } => !!ws);

  return {
    userId: user.id,
    profile: {
      id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      email: user.email ?? null,
      avatar_url: profile.avatar_url,
      locale: profile.locale as "ko" | "en",
      role: (profile.role as ProfileRole | null) ?? null,
    },
    workspaceRoles,
    workspaces,
    currentWorkspaceId: workspaces[0]?.id ?? null,
  };
}
