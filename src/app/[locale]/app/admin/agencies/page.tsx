import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import {
  InviteAgencySection,
  RosterLinkForm,
  UnlinkRosterButton,
  type AgencyOption,
  type ArtistOption,
} from "./_components/agency-admin-forms";

type Props = {
  params: Promise<{ locale: string }>;
};

type AgencyRow = {
  workspaceId: string;
  name: string;
  email: string;
  createdAt: string;
};

type RosterRow = {
  id: string;
  agencyName: string;
  artistName: string;
  note: string | null;
  createdAt: string;
};

export default async function AdminAgenciesPage({ params }: Props) {
  const { locale } = await params;

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

  const t = await getTranslations("admin_agencies");
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind and new roster schema can lag generated types
  const sbAny = sbAdmin as any;

  const { data: agencyRows, error: agencyErr } = await sbAny
    .from("workspaces")
    .select("id, name, created_at, member:workspace_members(user_id)")
    .eq("kind", "agency")
    .order("created_at", { ascending: false });

  if (agencyErr) {
    console.error("[AdminAgenciesPage] agency fetch error:", agencyErr);
  }

  const { data: artistRows, error: artistErr } = await sbAny
    .from("artist_profile")
    .select("workspace_id, display_name, workspace:workspaces(id, name)")
    .order("created_at", { ascending: false });

  if (artistErr) {
    console.error("[AdminAgenciesPage] artist fetch error:", artistErr);
  }

  const { data: rosterRows, error: rosterErr } = await sbAny
    .from("agency_artist_roster")
    .select(
      `
      id,
      note,
      created_at,
      agency:workspaces!agency_artist_roster_agency_workspace_id_fkey(id, name),
      artist:workspaces!agency_artist_roster_artist_workspace_id_fkey(id, name)
    `,
    )
    .order("created_at", { ascending: false });

  if (rosterErr) {
    console.error("[AdminAgenciesPage] roster fetch error:", rosterErr);
  }

  type RawAgency = {
    id: string;
    name: string;
    created_at: string;
    member: { user_id: string }[] | null;
  };
  type RawArtist = {
    workspace_id: string;
    display_name: string | null;
    workspace: { id: string; name: string } | null;
  };
  type RawRoster = {
    id: string;
    note: string | null;
    created_at: string;
    agency: { id: string; name: string } | null;
    artist: { id: string; name: string } | null;
  };

  const rawAgencies: RawAgency[] = agencyRows ?? [];
  const userIds = rawAgencies
    .map((row) => row.member?.[0]?.user_id)
    .filter((id): id is string => typeof id === "string");

  const authUserMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersPage, error: usersErr } =
      await sbAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) {
      console.error("[AdminAgenciesPage] auth.admin.listUsers error:", usersErr);
    } else {
      for (const authUser of usersPage.users) {
        if (userIds.includes(authUser.id)) {
          authUserMap.set(authUser.id, authUser.email ?? "");
        }
      }
    }
  }

  const agencies: AgencyRow[] = rawAgencies.map((agency) => {
    const userId = agency.member?.[0]?.user_id ?? "";
    return {
      workspaceId: agency.id,
      name: agency.name,
      email: authUserMap.get(userId) ?? "—",
      createdAt: agency.created_at,
    };
  });

  const agencyOptions: AgencyOption[] = agencies.map((agency) => ({
    id: agency.workspaceId,
    name: agency.name,
  }));

  const artistOptions: ArtistOption[] = ((artistRows ?? []) as RawArtist[]).map(
    (artist) => ({
      id: artist.workspace_id,
      name: artist.display_name ?? artist.workspace?.name ?? "—",
    }),
  );

  const roster: RosterRow[] = ((rosterRows ?? []) as RawRoster[]).map((row) => ({
    id: row.id,
    agencyName: row.agency?.name ?? "—",
    artistName: row.artist?.name ?? "—",
    note: row.note,
    createdAt: row.created_at,
  }));

  const labels = {
    inviteCta: t("invite_cta"),
    inviteTitle: t("invite_title"),
    inviteHelper: t("invite_helper"),
    email: t("form_email"),
    agencyName: t("form_agency_name"),
    agencyNamePlaceholder: t("form_agency_name_ph"),
    note: t("form_note"),
    optional: t("optional"),
    send: t("form_submit"),
    sending: t("form_submitting"),
    linkTitle: t("roster_link_title"),
    linkHelper: t("roster_link_helper"),
    agency: t("column_agency"),
    artist: t("column_artist"),
    selectAgency: t("select_agency"),
    selectArtist: t("select_artist"),
    linkCta: t("link_cta"),
    linking: t("linking"),
    unlink: t("unlink"),
    successInvite: t("invite_success"),
    successLink: t("link_success"),
    successUnlink: t("unlink_success"),
    errorValidation: t("error_validation"),
    errorForbidden: t("error_forbidden"),
    errorInvite: t("error_invite"),
    errorDb: t("error_db"),
  };

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-label text-brand">
          {t("eyebrow")}
        </p>
        <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
          {t("description")}
        </p>
      </header>

      <InviteAgencySection labels={labels} />

      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-label text-muted-foreground">
          {t("table_heading")}
        </h2>
        {agencies.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t("table_empty")}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-surface-card">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-label text-muted-foreground">
                    {t("column_agency")}
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-label text-muted-foreground md:table-cell">
                    {t("column_email")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-label text-muted-foreground">
                    {t("column_joined_at")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency) => (
                  <tr
                    key={agency.workspaceId}
                    className="border-b border-border/70 last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3 font-medium keep-all">{agency.name}</td>
                    <td className="hidden px-4 py-3 text-[12px] text-muted-foreground md:table-cell">
                      {agency.email}
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(agency.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RosterLinkForm
        labels={labels}
        agencies={agencyOptions}
        artists={artistOptions}
      />

      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-label text-muted-foreground">
          {t("roster_heading")}
        </h2>
        {roster.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t("roster_empty")}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-surface-card">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-label text-muted-foreground">
                    {t("column_agency")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-label text-muted-foreground">
                    {t("column_artist")}
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-label text-muted-foreground lg:table-cell">
                    {t("form_note")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-label text-muted-foreground">
                    {t("column_action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/70 last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3 font-medium keep-all">{row.agencyName}</td>
                    <td className="px-4 py-3 text-muted-foreground keep-all">
                      {row.artistName}
                    </td>
                    <td className="hidden px-4 py-3 text-[12px] text-muted-foreground lg:table-cell">
                      {row.note ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UnlinkRosterButton rosterId={row.id} labels={labels} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
