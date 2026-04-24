import { getTranslations } from "next-intl/server";
import { allPosts } from "content-collections";
import { Link } from "@/i18n/routing";
import { SiteFooter } from "@/components/home/site-footer";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tag?: string }>;
};

export default async function JournalListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tag } = await searchParams;
  const t = await getTranslations("journal");

  const isDev = process.env.NODE_ENV === "development";

  const posts = allPosts
    .filter((p) => p.locale === locale)
    .filter((p) => isDev || !p.draft)
    .filter((p) => !p.tags.includes("guide"))
    .filter((p) => (tag ? p.tags.includes(tag) : true))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

  // Group by year, descending.
  const grouped = new Map<number, typeof posts>();
  for (const post of posts) {
    const year = new Date(post.publishedAt).getFullYear();
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year)!.push(post);
  }
  const years = Array.from(grouped.keys()).sort((a, b) => b - a);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const minutesLabel = locale === "ko" ? "분" : "min";
  const defaultAuthors = new Set(["야기", "YAGI"]);

  return (
    <main className="min-h-dvh">
      <div className="max-w-4xl mx-auto px-8">
        <header className="py-32">
          <h1 className="font-display italic keep-all text-5xl md:text-6xl lg:text-7xl leading-[1.03] tracking-[-0.03em] mb-6 max-w-2xl">
            {t("list_title")}
          </h1>
          <p className="keep-all text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t("list_intro")}
          </p>

          {tag ? (
            <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
              <span>#{tag}</span>
              <span aria-hidden="true">·</span>
              <Link
                href="/journal"
                className="underline-offset-4 hover:underline hover:text-foreground transition-colors"
              >
                {t("clear_filter")}
              </Link>
            </div>
          ) : null}
        </header>

        {posts.length === 0 ? (
          <p className="keep-all text-muted-foreground py-16">
            {t("empty_state")}
          </p>
        ) : (
          <div className="pb-32">
            {years.map((year) => (
              <section key={year} className="mb-16">
                <h2 className="font-display text-6xl tracking-tight opacity-20 mb-4 tabular-nums">
                  {year}
                </h2>
                <ul className="border-t border-black/5">
                  {grouped.get(year)!.map((post) => {
                    const showAuthor = !defaultAuthors.has(post.author);
                    return (
                      <li
                        key={`${post.locale}-${post.slug}`}
                        className="border-b border-black/5"
                      >
                        <Link
                          href={`/journal/${post.slug}`}
                          className="group flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-8 py-8 transition-colors hover:bg-black/[0.02] -mx-4 px-4 rounded-sm"
                        >
                          <div className="flex-1 min-w-0">
                            {post.draft ? (
                              <span className="label-caps text-xs text-muted-foreground/60 mb-2 inline-block">
                                Draft
                              </span>
                            ) : null}
                            <h3 className="keep-all text-xl md:text-2xl tracking-tight leading-snug group-hover:italic transition-all">
                              {post.title}
                            </h3>
                            {post.subtitle ? (
                              <p className="keep-all text-base text-muted-foreground mt-2 leading-relaxed">
                                {post.subtitle}
                              </p>
                            ) : null}
                            {post.tags.length > 0 || showAuthor ? (
                              <div className="mt-4 flex flex-wrap items-center gap-2">
                                {post.tags.map((tagName) => (
                                  <span
                                    key={tagName}
                                    className="bg-black/5 text-xs px-2 py-0.5 rounded-full text-muted-foreground"
                                  >
                                    #{tagName}
                                  </span>
                                ))}
                                {showAuthor ? (
                                  <span className="text-xs text-muted-foreground">
                                    {t("article_by")} {post.author}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-sm text-muted-foreground md:text-right tabular-nums leading-relaxed">
                            <div>{dateFormatter.format(new Date(post.publishedAt))}</div>
                            <div className="text-xs opacity-70 mt-1">
                              {post.read_minutes} {minutesLabel}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      <SiteFooter
        locale={locale === "en" ? "en" : "ko"}
        pathname="/journal"
      />
    </main>
  );
}
