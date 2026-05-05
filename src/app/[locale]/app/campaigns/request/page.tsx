// Phase 7 Wave B.1 — /app/campaigns/request
//
// Sponsor (brand or artist workspace member) submits a campaign request.
// Server Component:
//   - Resolves active workspace + verifies kind IN ('brand', 'artist')
//   - Fetches the user's own past requests (RLS: campaigns_select_sponsor)
//   - Renders the client form with the active workspace pre-bound
// Creator workspace + admin workspace are not sponsor-eligible — show a
// guard message instead of the form.

import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { RequestCampaignForm } from "./request-form";
import { OwnRequestsList, type OwnRequestRow } from "./own-requests-list";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CampaignRequestPage({ params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/signin?next=/${locale}/app/campaigns/request`);

  const active = await resolveActiveWorkspace(user.id);
  if (!active) notFound();

  const t = await getTranslations("campaign_request");

  // Guard: only brand + artist workspaces can host a campaign request.
  // 'yagi_admin' workspaces use /admin/campaigns/new (Route A self-host).
  // 'creator' workspaces (Phase 7 Wave C) cannot sponsor — they participate.
  const isSponsorEligible = active.kind === "brand" || active.kind === "artist";

  if (!isSponsorEligible) {
    return (
      <div className="px-10 py-12 max-w-2xl space-y-6">
        <h1 className="font-display text-3xl tracking-tight leading-[1.1] keep-all">
          {t("title")}
        </h1>
        <div className="rounded-[24px] border border-border bg-card p-8">
          <p className="text-sm text-muted-foreground keep-all leading-relaxed">
            {t("guard_not_eligible")}
          </p>
        </div>
      </div>
    );
  }

  // Fetch own past requests via session client. The campaigns_select_sponsor
  // RLS policy scopes naturally to the active workspace's memberships.
  const { data: ownRows } = await supabase
    .from("campaigns")
    .select(
      "id, title, status, created_at, request_metadata, decision_metadata",
    )
    .eq("sponsor_workspace_id", active.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const own = (ownRows ?? []) as OwnRequestRow[];

  return (
    <div className="px-6 md:px-10 py-12 max-w-2xl space-y-12">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] keep-all">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground keep-all leading-relaxed">
          {t("intro")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("requester_label")}: <span className="font-medium text-foreground">{active.name}</span>
        </p>
      </div>

      {/* Form */}
      <RequestCampaignForm workspaceId={active.id} />

      {/* Own requests list */}
      <OwnRequestsList rows={own} locale={locale} />
    </div>
  );
}
