import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { removeMember } from "./actions";
import { InviteForm } from "./invite-form";

async function removeMemberAction(formData: FormData): Promise<void> {
  "use server";
  await removeMember(formData);
}

type TeamPanelProps = { workspaceId: string };

export async function TeamPanel({ workspaceId }: TeamPanelProps) {
  const supabase = await createSupabaseServer();
  const t = await getTranslations("settings");

  const { data: members } = await supabase
    .from("workspace_members")
    .select(
      `
      user_id, role, joined_at,
      profile:profiles!workspace_members_user_id_fkey(id, display_name, handle, avatar_url)
    `
    )
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });

  return (
    <div className="space-y-4">
      <InviteForm workspaceId={workspaceId} />
      <ul className="divide-y divide-border border border-border rounded-lg">
        {(members ?? []).map((m) => {
          const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
          return (
            <li key={m.user_id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {profile?.display_name ?? profile?.handle ?? m.user_id.slice(0, 8)}
                </div>
                <div className="text-xs text-muted-foreground">
                  @{profile?.handle ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {m.role === "workspace_admin"
                    ? t("team_role_admin")
                    : t("team_role_member")}
                </span>
                <form action={removeMemberAction}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="userId" value={m.user_id} />
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("team_remove")}
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
