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
export type ProfileRole = "creator" | "studio" | "observer";

export type AppContext = {
  userId: string;
  profile: {
    id: string;
    handle: string;
    display_name: string;
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
      avatar_url: profile.avatar_url,
      locale: profile.locale as "ko" | "en",
      role: (profile.role as ProfileRole | null) ?? null,
    },
    workspaceRoles,
    workspaces,
    currentWorkspaceId: workspaces[0]?.id ?? null,
  };
}
