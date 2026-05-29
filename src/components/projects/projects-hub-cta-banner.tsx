import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowUpRight } from "lucide-react";

// Phase 2.9 G_B9_F — bottom CTA banner on /app/projects.
// Dark v1.2 band with 3-col desktop layout (headline / sub / brand pill).
// Mobile stacks vertically; CTA full-width.

type Props = { locale: string };

export async function ProjectsHubCtaBanner({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "projects" });

  // §AP follow-up — keep the closing banner on canonical v1.2 tokens.
  // The previous text-background on a dark band made copy nearly invisible.
  return (
    <section className="rounded-3xl border border-border bg-surface-raised px-8 py-16 lg:px-16 lg:py-20 mt-16 lg:mt-20 text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 lg:gap-12 items-center">
        <h2 className="font-display text-3xl lg:text-4xl font-bold leading-[1.1] tracking-[-0.01em] whitespace-pre-line keep-all">
          {t("cta_banner_title")}
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line keep-all">
          {t("cta_banner_sub")}
        </p>
        <Link
          href="/app/projects/new"
          className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-brand text-brand-on text-[15px] font-semibold whitespace-nowrap hover:bg-brand/90 transition-colors"
        >
          {t("hero_cta")}
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
