import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allPosts } from "content-collections";
import { MDXContent } from "@content-collections/mdx/react";
import { Link } from "@/i18n/routing";
import { SiteFooter } from "@/components/home/site-footer";
import { journalTypographyComponents } from "@/components/journal/journal-typography";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function isGuide(post: { tags: readonly string[] }): boolean {
  return post.tags.includes("guide");
}

function findGuide(locale: string, slug: string, includeDrafts: boolean) {
  return allPosts.find(
    (p) =>
      p.locale === locale &&
      p.slug === slug &&
      isGuide(p) &&
      (includeDrafts || !p.draft),
  );
}

export async function generateStaticParams() {
  return allPosts
    .filter((p) => !p.draft && isGuide(p))
    .map((p) => ({ locale: p.locale, slug: p.slug }));
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const isDev = process.env.NODE_ENV === "development";
  const post = findGuide(locale, slug, isDev);

  if (!post) {
    return { title: "Not found" };
  }

  const description =
    post.subtitle ??
    (post.content ?? "").trim().slice(0, 160).replace(/\s+/gu, " ");

  return {
    title: `${post.title} — YAGI Workshop`,
    description,
    alternates: {
      canonical: `/${locale}/journal/guide/${slug}`,
    },
    robots: { index: false, follow: true },
  };
}

export default async function GuideArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const isDev = process.env.NODE_ENV === "development";
  const post = findGuide(locale, slug, isDev);

  if (!post) notFound();

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <article className="max-w-[680px] mx-auto px-6 md:px-8 pt-24 md:pt-36 pb-24">
        <header className="mb-10">
          <div className="flex items-center gap-2 label-caps text-muted-foreground/70 mb-6">
            <Link
              href="/app"
              className="underline-offset-4 hover:underline hover:text-foreground transition-colors"
            >
              App
            </Link>
            <span aria-hidden="true">·</span>
            <span>Guide</span>
          </div>
          <h1 className="font-display keep-all text-3xl md:text-5xl tracking-tight leading-[1.1]">
            {post.title}
          </h1>
          {post.subtitle ? (
            <p className="text-lg md:text-xl text-foreground/60 keep-all mt-3 leading-[1.3]">
              {post.subtitle}
            </p>
          ) : null}
          <div className="h-px w-16 bg-foreground/30 my-8" aria-hidden="true" />
        </header>

        <div className="journal-article-body">
          <MDXContent
            code={post.mdx_body}
            components={journalTypographyComponents}
          />
        </div>
      </article>

      <SiteFooter
        locale={locale === "en" ? "en" : "ko"}
        pathname={`/journal/guide/${slug}`}
      />
    </main>
  );
}
