import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { WorkspaceForm } from "./workspace-form";
import { TeamPanel } from "./team-panel";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const ctx = await fetchAppContext();
  if (!ctx) redirect({ href: "/", locale });

  const tab = sp.tab === "workspace" || sp.tab === "team" ? sp.tab : "profile";

  if (tab === "profile") {
    const supabase = await createSupabaseServer();
    let avatarSignedUrl: string | null = null;
    if (ctx!.profile.avatar_url) {
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(ctx!.profile.avatar_url, 3600);
      avatarSignedUrl = data?.signedUrl ?? null;
    }
    // G6: fetch extended profile fields (bio, instagram_handle).
    // Phase 4.x sub_04 — handle is no longer user-editable from /settings,
    // so handle_changed_at is no longer fetched here.
    const { data: extended } = await supabase
      .from("profiles")
      .select("bio, instagram_handle")
      .eq("id", ctx!.userId)
      .maybeSingle();
    return (
      <ProfileForm
        profile={ctx!.profile}
        avatarSignedUrl={avatarSignedUrl}
        userId={ctx!.userId}
        bio={extended?.bio ?? null}
        instagramHandle={extended?.instagram_handle ?? null}
      />
    );
  }

  // workspace + team tabs require workspace_admin
  if (!ctx!.workspaceRoles.includes("workspace_admin")) {
    redirect({ href: "/app/settings", locale });
  }

  const workspaceId = ctx!.currentWorkspaceId;
  if (!workspaceId) redirect({ href: "/app", locale });

  if (tab === "workspace") {
    const supabase = await createSupabaseServer();
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name, slug, tax_id, tax_invoice_email")
      .eq("id", workspaceId!)
      .maybeSingle();
    if (!ws) redirect({ href: "/app", locale });
    return <WorkspaceForm workspace={ws!} />;
  }

  // tab === "team"
  return <TeamPanel workspaceId={workspaceId!} />;
}
