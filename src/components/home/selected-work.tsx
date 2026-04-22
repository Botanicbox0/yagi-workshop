import { getTranslations } from "next-intl/server";
import { allPosts } from "content-collections";
import { Link } from "@/i18n/routing";
import { renderTitleWithEmphasis } from "@/components/home/title-emphasis";

type Props = {
  locale: "ko" | "en";
};

export async function SelectedWork({ locale }: Props) {
  const t = await getTranslations("home");
  const isDev = process.env.NODE_ENV === "development";

  const caseStudies = allPosts
    .filter((p) => p.locale === locale)
    .filter((p) => isDev || !p.draft)
    .filter((p) => p.tags.includes("case-study"))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 5);

  const hasCaseStudies = caseStudies.length > 0;

  const placeholderKeys = [
    "work_placeholder_1",
    "work_placeholder_2",
    "work_placeholder_3",
  ] as const;

  return (
    <section
      aria-labelledby="work-title"
      className="border-t border-black/5 py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="mb-16 md:mb-24 max-w-3xl">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="label-caps text-muted-foreground/70 tabular-nums">
              04 — Work
            </span>
          </div>
          <h2
            id="work-title"
            className="font-display keep-all text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]"
          >
            {renderTitleWithEmphasis(
              t("work_title"),
              t("work_title_emphasis"),
            )}
          </h2>
        </div>

        <div className="border-t border-black/10">
          {hasCaseStudies
            ? caseStudies.map((post, i) => {
                const year = new Date(post.publishedAt).getFullYear();
                const ordinal = String(i + 1).padStart(2, "0");
                return (
                  <Link
                    key={`${post.locale}-${post.slug}`}
                    href={`/journal/${post.slug}`}
                    className="group flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 md:gap-8 py-10 md:py-12 border-b border-black/10 transition-colors hover:bg-black/[0.02] -mx-4 px-4"
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-4">
                      <div className="flex items-baseline gap-3">
                        <span className="label-caps text-muted-foreground/60 tabular-nums">
                          {ordinal}
                        </span>
                      </div>
                      <h3 className="keep-all font-display text-2xl md:text-3xl lg:text-4xl tracking-tight leading-[1.1] group-hover:italic transition-all">
                        {post.title}
                      </h3>
                      {post.subtitle ? (
                        <p className="keep-all text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
                          {post.subtitle}
                        </p>
                      ) : null}
                      <span
                        aria-hidden
                        className="block h-px w-6 bg-black/20 mt-2"
                      />
                    </div>
                    <div className="shrink-0 label-caps text-muted-foreground/70 tabular-nums md:text-right">
                      {year}
                    </div>
                  </Link>
                );
              })
            : placeholderKeys.map((key, i) => {
                const ordinal = String(i + 1).padStart(2, "0");
                return (
                  <div
                    key={key}
                    className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 md:gap-8 py-10 md:py-12 border-b border-black/10"
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-4">
                      <div className="flex items-baseline gap-3">
                        <span className="label-caps text-muted-foreground/60 tabular-nums">
                          {ordinal}
                        </span>
                      </div>
                      <h3 className="keep-all font-display text-2xl md:text-3xl lg:text-4xl tracking-tight leading-[1.1] text-foreground/70">
                        {t(key)}
                      </h3>
                      <span
                        aria-hidden
                        className="block h-px w-6 bg-black/20 mt-2"
                      />
                    </div>
                    <div
                      aria-hidden
                      className="shrink-0 label-caps text-muted-foreground/40 tabular-nums md:text-right"
                    >
                      ——
                    </div>
                  </div>
                );
              })}
        </div>

        {!hasCaseStudies ? (
          <p className="keep-all mt-8 text-sm text-muted-foreground italic font-display">
            <em>{t("work_placeholder_note")}</em>
          </p>
        ) : null}
      </div>
    </section>
  );
}
