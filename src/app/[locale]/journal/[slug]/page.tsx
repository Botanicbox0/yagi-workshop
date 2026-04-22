import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { allPosts } from "content-collections";
import { MDXContent } from "@content-collections/mdx/react";
import { Link } from "@/i18n/routing";
import { SiteFooter } from "@/components/home/site-footer";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function formatDate(locale: string, iso: string): string {
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

const typographyComponents: Record<
  string,
  (props: { children?: ReactNode }) => ReactNode
> = {
  h2: ({ children }) => (
    <h2 className="text-3xl md:text-4xl font-display mt-16 mb-6 keep-all tracking-tight leading-[1.15]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl md:text-2xl font-display mt-12 mb-4 keep-all tracking-tight leading-[1.2]">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-base md:text-lg leading-relaxed text-foreground/85 mb-6 keep-all">
      {children}
    </p>
  ),
  a: ({ children, ...rest }: { children?: ReactNode; href?: string }) => (
    <a
      {...rest}
      className="underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-black/30 pl-6 italic font-display text-xl text-foreground/70 my-8 keep-all">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="font-mono text-sm bg-black/[0.03] px-1.5 py-0.5 rounded">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="font-mono text-sm bg-black/[0.03] p-4 rounded overflow-x-auto my-6">
      {children}
    </pre>
  ),
  ul: ({ children }) => (
    <ul className="pl-6 mb-6 space-y-2 list-disc marker:text-foreground/40">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="pl-6 mb-6 space-y-2 list-decimal marker:text-foreground/40">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-base md:text-lg leading-relaxed text-foreground/85 keep-all">
      {children}
    </li>
  ),
  hr: () => <hr className="border-t border-black/10 my-12" />,
};

function findPost(locale: string, slug: string, includeDrafts: boolean) {
  return allPosts.find(
    (p) =>
      p.locale === locale &&
      p.slug === slug &&
      (includeDrafts || !p.draft),
  );
}

export async function generateStaticParams() {
  return allPosts
    .filter((p) => !p.draft)
    .map((p) => ({ locale: p.locale, slug: p.slug }));
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const isDev = process.env.NODE_ENV === "development";
  const post = findPost(locale, slug, isDev);

  if (!post) {
    return { title: "Not found" };
  }

  const description =
    post.subtitle ??
    (post.content ?? "").trim().slice(0, 160).replace(/\s+/gu, " ");

  const ogUrl = `/api/og?slug=${encodeURIComponent(post.slug)}&locale=${encodeURIComponent(post.locale)}`;

  // Build hreflang languages map only for sibling locales that actually exist.
  // Avoids declaring a translation that 404s, which Google penalises.
  const languages: Record<string, string> = {
    [locale]: `/${locale}/journal/${slug}`,
  };
  for (const otherLocale of ["ko", "en"] as const) {
    if (otherLocale === locale) continue;
    if (allPosts.some((p) => p.locale === otherLocale && p.slug === slug && !p.draft)) {
      languages[otherLocale] = `/${otherLocale}/journal/${slug}`;
    }
  }
  // x-default points at the Korean version when present, else the current.
  languages["x-default"] = languages.ko ?? languages[locale];

  return {
    title: `${post.title} — YAGI Workshop`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogUrl],
    },
    alternates: {
      canonical: `/${locale}/journal/${slug}`,
      languages,
    },
  };
}

export default async function JournalArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const isDev = process.env.NODE_ENV === "development";
  const post = findPost(locale, slug, isDev);

  if (!post) {
    notFound();
  }

  const t = await getTranslations("journal");
  const minutesSuffix = t("read_minutes_suffix");
  const formattedDate = formatDate(locale, post.publishedAt);

  // Three most recent OTHER posts in same locale, excluding current.
  const otherPosts = allPosts
    .filter((p) => p.locale === locale)
    .filter((p) => isDev || !p.draft)
    .filter((p) => p.slug !== post.slug)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime(),
    )
    .slice(0, 3);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <article className="max-w-[680px] mx-auto px-6 md:px-8 pt-32 md:pt-48 pb-24">
        {/* Header */}
        <header className="mb-12">
          {/* Eyebrow row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 label-caps text-muted-foreground/70 tabular-nums mb-8">
            <Link
              href="/journal"
              className="underline-offset-4 hover:underline hover:text-foreground transition-colors"
            >
              {t("article_eyebrow")}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <span>
              {post.read_minutes} {minutesSuffix}
            </span>
            {post.tags.length > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="flex flex-wrap items-center gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/journal?tag=${encodeURIComponent(tag)}`}
                      className="underline-offset-4 hover:underline hover:text-foreground transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </span>
              </>
            ) : null}
          </div>

          {post.draft ? (
            <span className="label-caps text-xs text-muted-foreground/60 mb-4 inline-block">
              Draft
            </span>
          ) : null}

          <h1 className="font-display keep-all text-4xl md:text-6xl tracking-tight leading-[1.05]">
            {post.title}
          </h1>

          {post.subtitle ? (
            <p className="text-xl md:text-2xl text-foreground/60 keep-all mt-4 leading-[1.3]">
              {post.subtitle}
            </p>
          ) : null}

          <div className="h-px w-24 bg-foreground/30 my-10" aria-hidden="true" />
        </header>

        {/* Body */}
        <div className="journal-article-body">
          <MDXContent code={post.mdx_body} components={typographyComponents} />
        </div>

        {/* Footer */}
        <footer className="mt-24">
          <div className="h-px w-24 bg-foreground/30 mb-10" aria-hidden="true" />

          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 label-caps text-muted-foreground/70 tabular-nums">
            <span>
              {t("posted_in")}{" "}
              <Link
                href="/journal"
                className="underline-offset-4 hover:underline hover:text-foreground transition-colors"
              >
                {t("journal_section")}
              </Link>
            </span>
            <span>{formattedDate}</span>
          </div>

          {otherPosts.length > 0 ? (
            <section
              aria-labelledby="more-from-journal"
              className="mt-20 border-t border-black/10 pt-12"
            >
              <h2
                id="more-from-journal"
                className="label-caps text-muted-foreground/70 tabular-nums mb-8"
              >
                {t("more_from_journal")}
              </h2>
              <ul className="border-t border-black/10">
                {otherPosts.map((p, i) => {
                  const ordinal = String(i + 1).padStart(2, "0");
                  return (
                    <li
                      key={`${p.locale}-${p.slug}`}
                      className="border-b border-black/10"
                    >
                      <Link
                        href={`/journal/${p.slug}`}
                        className="group grid grid-cols-12 items-baseline gap-4 py-6 transition-colors hover:bg-black/[0.02] -mx-4 px-4"
                      >
                        <span className="col-span-2 label-caps text-muted-foreground/60 tabular-nums">
                          {ordinal}
                        </span>
                        <span className="col-span-10 keep-all font-display text-lg md:text-xl tracking-tight leading-[1.2] group-hover:italic transition-all">
                          {p.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </footer>
      </article>

      <SiteFooter
        locale={locale === "en" ? "en" : "ko"}
        pathname={`/journal/${slug}`}
      />
    </main>
  );
}
