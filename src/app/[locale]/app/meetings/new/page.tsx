import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NewMeetingForm } from "@/components/meetings/new-meeting-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export type MeetingProject = {
  id: string;
  title: string;
  workspace_id: string;
};

export type WorkspaceMember = {
  userId: string;
  email: string;
  displayName: string;
};

export default async function NewMeetingPage({ params }: Props) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: "meetings" });

  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const uid = user.id;

  // Fetch all workspace memberships for this user to determine admin workspaces
  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", uid);

  const workspaceIds = (memberRows ?? []).map((r) => r.workspace_id);

  // Check which workspaces the user is an admin of (or is yagi_admin)
  const [{ data: adminRoles }, { data: isYagiAdmin }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("workspace_id")
      .eq("user_id", uid)
      .eq("role", "workspace_admin"),
    supabase.rpc("is_yagi_admin", { uid }),
  ]);

  const adminWorkspaceIds = new Set(
    (adminRoles ?? []).map((r) => r.workspace_id).filter(Boolean) as string[]
  );

  // If yagi_admin, all workspaces are accessible
  const accessibleWorkspaceIds =
    isYagiAdmin
      ? workspaceIds
      : workspaceIds.filter((id) => adminWorkspaceIds.has(id));

  // Fetch projects in those workspaces
  let projects: MeetingProject[] = [];
  if (accessibleWorkspaceIds.length > 0) {
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, title, workspace_id")
      .in("workspace_id", accessibleWorkspaceIds)
      .order("title", { ascending: true });
    projects = (projectsData ?? []) as MeetingProject[];
  }

  // Fetch workspace members for each accessible workspace, joining profiles for email
  const membersByWorkspace: Record<string, WorkspaceMember[]> = {};

  if (accessibleWorkspaceIds.length > 0) {
    const { data: membersData } = await supabase
      .from("workspace_members")
      .select(
        `
        user_id,
        workspace_id,
        profile:profiles!workspace_members_user_id_fkey(display_name, id)
      `
      )
      .in("workspace_id", accessibleWorkspaceIds);

    // We need emails — join via auth is not possible via RLS, so we use profiles
    // display_name from profiles; email from auth.users is not exposed via RLS.
    // We'll use a sub-query via workspace_invitations to get email fallback.
    // The safest approach: fetch from workspace_invitations for accepted members.
    const { data: invitationsData } = await supabase
      .from("workspace_invitations")
      .select("email, workspace_id")
      .in("workspace_id", accessibleWorkspaceIds)
      .not("accepted_at", "is", null);

    // Build email map from invitations: user joined via invitation
    // Also include current user's email
    const inviteEmailMap: Record<string, string> = {};
    for (const inv of invitationsData ?? []) {
      // Map workspace_id + rough email lookup
      // We'll store by email directly for attendee pre-population
      inviteEmailMap[inv.email] = inv.workspace_id;
    }

    // Build membersByWorkspace using profile data + invitation emails
    for (const wsId of accessibleWorkspaceIds) {
      const wsMembers = (membersData ?? []).filter(
        (m) => m.workspace_id === wsId
      );

      // For each member, try to find email from invitations
      const wsInviteEmails = (invitationsData ?? [])
        .filter((inv) => inv.workspace_id === wsId)
        .map((inv) => inv.email);

      // Build member list: use invitation email matched by position if counts match
      // Better: use display_name from profile, email from invitation where available
      const members: WorkspaceMember[] = [];

      for (const member of wsMembers) {
        const profile = member.profile as
          | { display_name: string; id: string }
          | null;
        if (!profile) continue;

        // Try to find email from workspace_invitations (best effort)
        // Since we can't join auth.users, we use a known email if user_id matches
        const emailMatch =
          member.user_id === uid ? user.email ?? "" : undefined;

        members.push({
          userId: member.user_id,
          email: emailMatch ?? "",
          displayName: profile.display_name,
        });
      }

      // Also add any workspace invitation emails as standalone entries
      // (for members who were invited but may not have a profile yet)
      for (const invEmail of wsInviteEmails) {
        if (!members.some((m) => m.email === invEmail)) {
          members.push({
            userId: "",
            email: invEmail,
            displayName: invEmail.split("@")[0],
          });
        }
      }

      membersByWorkspace[wsId] = members;
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          <em>{t("new_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8 keep-all">
          {t("new_description")}
        </p>
      </div>

      <NewMeetingForm
        locale={locale}
        projects={projects}
        membersByWorkspace={membersByWorkspace}
      />
    </div>
  );
}
