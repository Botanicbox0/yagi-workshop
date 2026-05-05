// Phase 7 Wave B.2 — /admin/campaigns/[id]/review
//
// Admin reviews a sponsor-submitted campaign request. Shows the request
// payload (request_metadata) + sponsor identity + decision history, and
// renders the 4-action ReviewActions client component.
//
// Auth gate: notFound for non-yagi_admin (defense-in-depth on top of layout).

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { ReviewActions } from "./review-actions";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type ReferenceAsset = { url: string; label: string };
type RequestMetadataShape = {
  contact_phone?: string;
  schedule_intent?: string;
  sponsorship_intent?: string;
  compensation_intent?: string;
  compensation_fixed_fee_per_creator?: number;
  notes?: string;
};
type DecisionHistoryEntry = {
  at: string;
  by: string;
  action: string;
  comment: string | null;
};
type DecisionMetadataShape = {
  history?: DecisionHistoryEntry[];
  note?: string | null;
};

function fmtDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fieldRow(
  label: string,
  value: React.ReactNode,
): React.ReactNode {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 py-3 border-b border-border last:border-0">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-foreground keep-all leading-relaxed whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  );
}

export default async function AdminCampaignReviewPage({ params }: Props) {
  const { id, locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
  if (!isAdmin) notFound();

  const t = await getTranslations("admin_campaigns");

  // Fetch campaign + sponsor workspace via service-role
  const sbAdmin = createSupabaseService();
  const { data: campaign, error } = await sbAdmin
    .from("campaigns")
    .select(
      `id, title, brief, status, created_at, reference_assets,
       sponsor_workspace_id, request_metadata, decision_metadata,
       sponsor_workspace:workspaces!sponsor_workspace_id(id, name, kind)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !campaign) notFound();

  const isRequestStage =
    campaign.status === "requested" ||
    campaign.status === "in_review" ||
    campaign.status === "declined";

  const reqMeta = (campaign.request_metadata ?? null) as RequestMetadataShape | null;
  const decisionMeta = (campaign.decision_metadata ?? null) as DecisionMetadataShape | null;
  const refAssets = Array.isArray(campaign.reference_assets)
    ? (campaign.reference_assets as unknown as ReferenceAsset[])
    : [];
  const sponsor = (campaign as { sponsor_workspace?: { name?: string; kind?: string } | null })
    .sponsor_workspace ?? null;

  function compensationLabel(intent?: string): string {
    if (intent === "exposure_only") return t("review.compensation_exposure_only");
    if (intent === "fixed_fee") return t("review.compensation_fixed_fee");
    return t("review.no_metadata");
  }

  function sponsorshipLabel(intent?: string): string {
    if (intent === "self") return t("review.sponsorship_self");
    if (intent === "co_sponsor") return t("review.sponsorship_co_sponsor");
    if (intent === "yagi_assist") return t("review.sponsorship_yagi_assist");
    return t("review.no_metadata");
  }

  return (
    <div className="px-6 md:px-10 py-12 max-w-3xl space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/app/admin/campaigns?status=requested"
          className="text-xs text-muted-foreground hover:underline underline-offset-2"
        >
          {t("review.back_to_list")}
        </Link>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] keep-all">
          {t("review.page_title")}
        </h1>
      </div>

      {!isRequestStage && (
        <div className="rounded-[24px] border border-border bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground keep-all leading-relaxed">
            {t("review.guard_not_request_stage")}
          </p>
          <Link
            href={`/app/admin/campaigns/${campaign.id}`}
            className="text-sm text-foreground hover:underline underline-offset-2 mt-3 inline-block"
          >
            {t("edit_cta")} →
          </Link>
        </div>
      )}

      {/* Request payload */}
      <section className="rounded-[24px] border border-border bg-card p-6 md:p-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          {t("review.request_metadata_title")}
        </h2>
        <dl>
          {fieldRow(t("review.field_title"), campaign.title)}
          {fieldRow(
            t("review.field_brief"),
            campaign.brief ?? t("review.no_metadata"),
          )}
          {fieldRow(
            t("review.field_sponsor"),
            sponsor?.name ?? t("sponsor_self_host"),
          )}
          {fieldRow(
            t("review.field_contact_phone"),
            reqMeta?.contact_phone ?? t("review.no_metadata"),
          )}
          {fieldRow(
            t("review.field_schedule_intent"),
            reqMeta?.schedule_intent ?? t("review.no_metadata"),
          )}
          {fieldRow(
            t("review.field_sponsorship_intent"),
            sponsorshipLabel(reqMeta?.sponsorship_intent),
          )}
          {fieldRow(
            t("review.field_compensation_intent"),
            compensationLabel(reqMeta?.compensation_intent),
          )}
          {reqMeta?.compensation_intent === "fixed_fee" && reqMeta.compensation_fixed_fee_per_creator
            ? fieldRow(
                t("review.field_compensation_fixed_fee"),
                new Intl.NumberFormat(locale).format(
                  reqMeta.compensation_fixed_fee_per_creator,
                ) + " KRW",
              )
            : null}
          {fieldRow(
            t("review.field_notes"),
            reqMeta?.notes ?? t("review.no_metadata"),
          )}
          {fieldRow(
            t("review.field_reference_assets"),
            refAssets.length === 0 ? (
              t("review.no_metadata")
            ) : (
              <ul className="space-y-1">
                {refAssets.map((a, idx) => (
                  <li key={idx}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:underline underline-offset-2 break-all"
                    >
                      {a.label || a.url}
                    </a>
                  </li>
                ))}
              </ul>
            ),
          )}
          {fieldRow(t("review.field_created_at"), fmtDateTime(campaign.created_at, locale))}
        </dl>
      </section>

      {/* Decision history */}
      {decisionMeta?.history && decisionMeta.history.length > 0 && (
        <section className="rounded-[24px] border border-border bg-card p-6 md:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {t("review.field_decision_history")}
          </h2>
          <ol className="space-y-3">
            {decisionMeta.history.map((entry, idx) => (
              <li
                key={idx}
                className="border-l-2 border-border pl-4 py-1 space-y-1"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {entry.action}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {fmtDateTime(entry.at, locale)}
                  </span>
                </div>
                {entry.comment && (
                  <p className="text-sm text-muted-foreground keep-all leading-relaxed whitespace-pre-wrap">
                    {entry.comment}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Actions */}
      {isRequestStage && (
        <ReviewActions campaignId={campaign.id} status={campaign.status} />
      )}
    </div>
  );
}
