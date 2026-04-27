import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

// Phase 2.8.2 G_B2_A — empty-state hero on /app/projects.
// Shown only when the user has zero projects (handled by caller).
// Layout follows the founder-referenced "self-campaign" pattern:
//   - Left column: 3 value props + primary CTA
//   - Right column: 1-2 sample case cards (placeholder until real cases exist)
//   - Bottom row: 4-step workflow flow

type Props = {
  locale: string;
};

export async function ProjectsHubHero({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "projects" });

  return (
    <section className="rounded-2xl border border-border bg-card p-8 md:p-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1fr] gap-10">
        {/* Left — value props + primary CTA */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] keep-all">
              <em>{t("hero_title")}</em>
            </h2>
            <p className="text-sm text-muted-foreground keep-all">
              {t("hero_sub")}
            </p>
          </div>

          <ul className="space-y-3">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-medium leading-snug keep-all">
                    {t(`hero_value_${i}_title` as "hero_value_1_title")}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed keep-all">
                    {t(`hero_value_${i}_body` as "hero_value_1_body")}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/app/projects/new"
            className="inline-flex items-center rounded-full uppercase tracking-[0.12em] px-6 py-3 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
          >
            {t("hero_cta")}
          </Link>
        </div>

        {/* Right — sample case cards (placeholder until real cases exist) */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {t("hero_sample_label")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="border border-border rounded-lg p-4 bg-muted/20"
              >
                <div className="aspect-[16/10] rounded-md bg-muted/50 mb-3" aria-hidden />
                <p className="text-sm font-medium leading-snug keep-all">
                  {t(`hero_sample_${i}_title` as "hero_sample_1_title")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 keep-all">
                  {t(`hero_sample_${i}_sub` as "hero_sample_1_sub")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom — 4-step workflow flow */}
      <div className="mt-10 pt-6 border-t border-border">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mb-4">
          {t("hero_workflow_label")}
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className="border border-border rounded-lg p-4 space-y-1.5"
            >
              <span
                aria-hidden
                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-foreground text-background text-xs font-semibold tabular-nums"
              >
                {i}
              </span>
              <p className="text-sm font-medium leading-snug keep-all">
                {t(`hero_step_${i}_title` as "hero_step_1_title")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed keep-all">
                {t(`hero_step_${i}_body` as "hero_step_1_body")}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
