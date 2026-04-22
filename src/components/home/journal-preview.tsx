import { getTranslations } from "next-intl/server";
import { allPosts } from "content-collections";
import { Link } from "@/i18n/routing";
import { renderTitleWithEmphasis } from "@/components/home/title-emphasis";

type Props = {
  locale: "ko" | "en";
};

function formatDate(locale: "ko" | "en", iso: string): string {
  const d = new Date(iso);
  if (locale === "ko") {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export async function JournalPreview({ locale }: Props) {
  const t = await getTranslations("home");
  const isDev = process.env.NODE_ENV === "development";

  const posts = allPosts
    .filter((p) => p.locale === locale)
    .filter((p) => isDev || !p.draft)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 3);

  return (
    <section
      aria-labelledby="journal-preview-title"
      className="border-t border-black/5 py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="mb-16 md:mb-20 max-w-3xl">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="label-caps text-muted-foreground/70 tabular-nums">
              05 — Journal
            </span>
          </div>
          <h2
            id="journal-preview-title"
            className="font-display keep-all text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]"
          >
            {renderTitleWithEmphasis(
              t("journal_preview_title"),
              t("journal_preview_title_emphasis"),
            )}
          </h2>
        </div>

        {posts.length > 0 ? (
          <ul className="border-t border-black/10">
            {posts.map((post, i) => {
              const ordinal = String(i + 1).padStart(2, "0");
              return (
                <li
                  key={`${post.locale}-${post.slug}`}
                  className="border-b border-black/10"
                >
                  <Link
                    href={`/journal/${post.slug}`}
                    className="group grid grid-cols-12 items-baseline gap-4 md:gap-8 py-8 md:py-10 transition-colors hover:bg-black/[0.02] -mx-4 px-4"
                  >
                    <span className="col-span-2 md:col-span-1 label-caps text-muted-foreground/60 tabular-nums">
                      {ordinal}
                    </span>
                    <span className="col-span-10 md:col-span-3 label-caps text-muted-foreground/70 tabular-nums">
                      {formatDate(locale, post.publishedAt)}
                    </span>
                    <span className="col-span-12 md:col-span-8 keep-all font-display text-xl md:text-2xl lg:text-3xl tracking-tight leading-[1.15] group-hover:italic transition-all">
                      {post.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-10 md:mt-12 flex justify-end">
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 rounded-full border border-black/20 px-6 py-3 text-sm tracking-tight transition-colors hover:bg-black hover:text-white"
          >
            {t("journal_preview_view_all")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
