// Phase 6 Wave A.3 — /admin/artists
//
// Shows the full 소속 아티스트 list with status column:
//   ⏳ 초대 발송  — magic-link sent but email_confirmed_at IS NULL
//   ⏳ 온보딩 중  — email confirmed but instagram_handle IS NULL
//   ✅ 활성       — email confirmed + instagram_handle set
//
// Status column tonality: stays inside the yagi-design-system v1.0
// sage-only accent rule. invite_pending = muted-foreground (gray);
// onboarding = foreground/70 (dim); active = sage. No amber/blue/etc.
//
// Page-level auth gate: notFound() for any non-yagi_admin caller.
// The parent admin/layout.tsx already redirects non-admins, but we
// add an explicit notFound() here as a defence-in-depth layer (per spec).

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { InviteArtistSection } from "./_components/invite-artist-section";

type Props = {
  params: Promise<{ locale: string }>;
};

type ArtistRow = {
  workspaceId: string;
  workspaceName: string;
  displayName: string | null;
  email: string;
  instagramHandle: string | null;
  createdAt: string;
  emailConfirmedAt: string | null;
};

function statusKey(row: ArtistRow): "invite_pending" | "onboarding" | "active" {
  if (!row.emailConfirmedAt) return "invite_pending";
  if (!row.instagramHandle) return "onboarding";
  return "active";
}

export default async function AdminArtistsPage({ params }: Props) {
  const { locale } = await params;

  // Auth gate — notFound for non-yagi_admin
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");

  if (!roles || roles.length === 0) notFound();

  const t = await getTranslations("admin_artists");

  // Fetch all artist workspaces + profiles via service-role client
  // (artist_profile has RLS SELECT gated to workspace_members + yagi_admin;
  //  yagi_admin check uses is_yagi_admin RLS function. Using service-role
  //  here avoids the RPC function call overhead in a list query.)
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
  const sbAny = sbAdmin as any;

  const { data: profileRows, error: profileErr } = await sbAny
    .from("artist_profile")
    .select(
      `
      workspace_id,
      display_name,
      instagram_handle,
      created_at,
      workspace:workspaces(id, name),
      member:workspace_members(user_id)
    `
    )
    .order("created_at", { ascending: false });

  if (profileErr) {
    console.error("[AdminArtistsPage] artist_profile fetch error:", profileErr);
  }

  type RawProfile = {
    workspace_id: string;
    display_name: string | null;
    instagram_handle: string | null;
    created_at: string;
    workspace: { id: string; name: string } | null;
    member: { user_id: string }[] | null;
  };

  const profiles: RawProfile[] = profileRows ?? [];

  // Collect user_ids for auth lookup
  const userIds = profiles
    .map((p) => p.member?.[0]?.user_id)
    .filter((id): id is string => typeof id === "string");

  // Fetch auth users in bulk to get email + email_confirmed_at
  const authUserMap = new Map<
    string,
    { email: string; email_confirmed_at: string | null }
  >();

  if (userIds.length > 0) {
    const { data: usersPage, error: usersErr } =
      await sbAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (usersErr) {
      console.error("[AdminArtistsPage] auth.admin.listUsers error:", usersErr);
    } else {
      for (const u of usersPage.users) {
        if (userIds.includes(u.id)) {
          authUserMap.set(u.id, {
            email: u.email ?? "",
            email_confirmed_at: u.email_confirmed_at ?? null,
          });
        }
      }
    }
  }

  // Build display rows
  const artists: ArtistRow[] = profiles.map((p) => {
    const userId = p.member?.[0]?.user_id ?? "";
    const authInfo = authUserMap.get(userId);
    return {
      workspaceId: p.workspace_id,
      workspaceName: p.workspace?.name ?? p.display_name ?? "—",
      displayName: p.display_name,
      email: authInfo?.email ?? "—",
      instagramHandle: p.instagram_handle,
      createdAt: p.created_at,
      emailConfirmedAt: authInfo?.email_confirmed_at ?? null,
    };
  });

  return (
    <div className="px-10 py-12 max-w-5xl space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-semibold tracking-display-ko text-4xl md:text-5xl tracking-tight leading-[1.05] mb-1 keep-all">
          {t("title")}
        </h1>
      </div>

      {/* Invite section */}
      <InviteArtistSection t_invite_cta={t("invite_cta")} />

      {/* Artist table */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("table_heading")}
        </h2>

        {artists.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("table_empty")}</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("column_name")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {t("column_email")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    {t("column_instagram")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {t("column_joined_at")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("column_status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {artists.map((artist) => {
                  const sk = statusKey(artist);
                  return (
                    <tr
                      key={artist.workspaceId}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium keep-all">
                        {artist.displayName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-[12px]">
                        {artist.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-[12px]">
                        {artist.instagramHandle ? `@${artist.instagramHandle}` : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[12px] text-muted-foreground hidden md:table-cell">
                        {new Intl.DateTimeFormat(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(artist.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        {sk === "invite_pending" && (
                          <span className="text-muted-foreground">
                            {t("status_invite_pending")}
                          </span>
                        )}
                        {sk === "onboarding" && (
                          <span className="text-foreground/70">
                            {t("status_onboarding")}
                          </span>
                        )}
                        {sk === "active" && (
                          <span className="text-[#71D083]">
                            {t("status_active")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
