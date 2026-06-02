import {
  ArrowRight,
  Coffee,
  Compass,
  CreditCard,
  FolderOpen,
  Megaphone,
  Plus,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  created_at: string;
};

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  updated_at: string;
  submission_close_at: string | null;
};

const ACTIVE_CAMPAIGN_STATUSES = [
  "requested",
  "in_review",
  "draft",
  "published",
  "submission_closed",
  "distributing",
];

export default async function ExplorePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("explore_dashboard");
  const navT = await getTranslations("nav");
  const projectT = await getTranslations("projects");

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const active = await resolveActiveWorkspace(user.id);
  if (!active) {
    redirect({ href: "/onboarding", locale });
    return null;
  }

  const [projectsResult, campaignsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, status, updated_at, created_at")
      .eq("workspace_id", active.id)
      .eq("project_type", "direct_commission")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(3),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaigns types regen pending
    (supabase as any)
      .from("campaigns")
      .select("id, slug, title, status, updated_at, submission_close_at")
      .eq("sponsor_workspace_id", active.id)
      .in("status", ACTIVE_CAMPAIGN_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  if (projectsResult.error) {
    console.error("[ExplorePage] projects query failed:", projectsResult.error);
  }
  if (campaignsResult.error) {
    console.error("[ExplorePage] campaigns query failed:", campaignsResult.error);
  }

  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const campaigns = (campaignsResult.data ?? []) as CampaignRow[];
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
            <Compass className="h-4 w-4" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <div className="max-w-3xl">
            <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
              {t("description")}
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app/projects/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-on transition-colors hover:bg-brand/90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("actions.new_project")}
            </Link>
            <Link
              href="/app/americano"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 bg-surface-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/60"
            >
              <Coffee className="h-4 w-4 text-gold" aria-hidden="true" />
              {t("actions.americano")}
            </Link>
          </div>
        </div>

        <CreditPanel
          title={t("credit.title")}
          balance={navT("credit_balance")}
          description={t("credit.description")}
          cta={t("credit.cta")}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardSection
          title={t("recent_projects.title")}
          href="/app/projects"
          cta={t("recent_projects.view_all")}
          icon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
        >
          {projects.length > 0 ? (
            <div className="grid gap-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  className="group rounded-lg border border-border/70 bg-surface-card p-4 transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {project.title}
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(project.updated_at))}
                      </p>
                    </div>
                    <StatusPill label={projectStatusLabel(project.status, projectT)} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("recent_projects.empty_title")}
              description={t("recent_projects.empty_description")}
              href="/app/projects/new"
              cta={t("recent_projects.empty_cta")}
            />
          )}
        </DashboardSection>

        <DashboardSection
          title={t("campaigns.title")}
          href="/app/campaigns"
          cta={t("campaigns.view_all")}
          icon={<Megaphone className="h-4 w-4" aria-hidden="true" />}
        >
          {campaigns.length > 0 ? (
            <div className="grid gap-3">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href="/app/campaigns"
                  className="group rounded-lg border border-border/70 bg-surface-card p-4 transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {campaign.title}
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {campaign.submission_close_at
                          ? t("campaigns.closes", {
                              date: dateFormatter.format(
                                new Date(campaign.submission_close_at),
                              ),
                            })
                          : dateFormatter.format(new Date(campaign.updated_at))}
                      </p>
                    </div>
                    <StatusPill label={campaignStatusLabel(campaign.status, t)} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("campaigns.empty_title")}
              description={t("campaigns.empty_description")}
              href="/app/campaigns"
              cta={t("campaigns.empty_cta")}
            />
          )}
        </DashboardSection>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <DashboardSection
          title={t("quick_actions.title")}
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction
              href="/app/projects/new"
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              title={t("quick_actions.new_project_title")}
              description={t("quick_actions.new_project_description")}
              accent="brand"
            />
            <QuickAction
              href="/app/americano"
              icon={<Coffee className="h-4 w-4" aria-hidden="true" />}
              title={t("quick_actions.americano_title")}
              description={t("quick_actions.americano_description")}
              accent="gold"
            />
          </div>
        </DashboardSection>

        <DashboardSection
          title={t("references.title")}
          icon={<Compass className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {["music_video", "campaign_visual", "fashion_lookbook"].map((key) => (
              <div
                key={key}
                className="min-h-36 rounded-lg border border-border/70 bg-surface-card p-4"
              >
                <div className="mb-4 h-16 rounded-md border border-edge-subtle bg-surface-card-deep" />
                <p className="text-xs font-semibold uppercase tracking-label text-gold">
                  {t(`references.items.${key}.tag`)}
                </p>
                <h3 className="mt-2 text-sm font-semibold text-foreground keep-all">
                  {t(`references.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground keep-all">
                  {t(`references.items.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </DashboardSection>
      </section>
    </main>
  );
}

function DashboardSection({
  title,
  href,
  cta,
  icon,
  children,
}: {
  title: string;
  href?: string;
  cta?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-surface-card text-foreground">
            {icon}
          </span>
          <h2 className="truncate text-base font-semibold text-foreground">
            {title}
          </h2>
        </div>
        {href && cta && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {cta}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function CreditPanel({
  title,
  balance,
  description,
  cta,
}: {
  title: string;
  balance: string;
  description: string;
  cta: string;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5">
      <div className="flex h-full flex-col justify-between gap-6">
        <div>
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-gold-soft text-gold">
            <WalletCards className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-normal text-foreground">
            {balance}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground keep-all">
            {description}
          </p>
        </div>
        <Link
          href="/app/billing"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 bg-surface-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent/60"
        >
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          {cta}
        </Link>
      </div>
    </section>
  );
}

function EmptyState({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-surface-card-deep p-5">
      <h3 className="text-sm font-semibold text-foreground keep-all">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
        {description}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  accent: "brand" | "gold";
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-border/70 bg-surface-card p-4 transition-colors hover:bg-accent/60"
    >
      <div
        className={cn(
          "mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md",
          accent === "brand" ? "bg-brand-soft text-brand" : "bg-gold-soft text-gold",
        )}
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground keep-all">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-muted-foreground keep-all">
        {description}
      </p>
    </Link>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full border border-border/70 bg-surface-card-deep px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      {label}
    </span>
  );
}

function projectStatusLabel(
  status: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  return t(`status_${status}` as Parameters<typeof t>[0]);
}

function campaignStatusLabel(
  status: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  return t(`campaign_status.${status}` as Parameters<typeof t>[0]);
}
