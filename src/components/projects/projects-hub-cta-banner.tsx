import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowUpRight } from "lucide-react";

// Phase 2.9 G_B9_F — bottom CTA banner on /app/projects.
// Black band with 3-col desktop layout (headline / sub / white pill).
// Mobile stacks vertically; CTA full-width.

type Props = { locale: string };

export async function ProjectsHubCtaBanner({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "projects" });

  // Phase 2.9 hotfix-2 Task 3.3 — closing destination banner. Larger
  // top padding + softer rounded-3xl + subtle gradient (zinc-950 →
  // zinc-900) gives the band editorial depth so it reads as a moment
  // of arrival, not a footer chrome.
  return (
    <section className="rounded-3xl px-8 py-16 lg:px-16 lg:py-20 mt-16 lg:mt-20 bg-gradient-to-br from-zinc-950 to-zinc-900 text-background">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 lg:gap-12 items-center">
        <h2 className="font-suit text-3xl lg:text-4xl font-bold leading-[1.1] tracking-[-0.01em] whitespace-pre-line keep-all">
          {t("cta_banner_title")}
        </h2>
        <p className="text-base text-background/70 leading-relaxed whitespace-pre-line keep-all">
          {t("cta_banner_sub")}
        </p>
        <Link
          href="/app/projects/new"
          className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-background text-foreground text-[15px] font-semibold whitespace-nowrap hover:scale-[1.02] transition-transform"
        >
          {t("hero_cta")}
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
