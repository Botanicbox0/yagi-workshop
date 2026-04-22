import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { SiteFooter } from "@/components/home/site-footer";

// Re-validate this list at most every 5min to avoid hammering Supabase
// Storage for fresh signed URLs on every request.
export const revalidate = 300;

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

type ShowcaseRow = {
  id: string;
  slug: string;
  title: string;
  client_name_public: string | null;
  published_at: string | null;
  cover_media_type: string | null;
  cover_media_storage_path: string | null;
  cover_media_external_url: string | null;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: "ko" | "en" = rawLocale === "en" ? "en" : "ko";
  const t = await getTranslations({ locale, namespace: "showcase" });

  const title = `${t("work_index_title")} — YAGI Workshop`;
  const description = t("work_index_subtitle");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `/${locale}/work`,
      languages: {
        ko: `/ko/work`,
        en: `/en/work`,
        "x-default": `/ko/work`,
      },
    },
  };
}

export default async function WorkIndexPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const locale: "ko" | "en" = rawLocale === "en" ? "en" : "ko";
  const sp = await searchParams;

  const t = await getTranslations({ locale, namespace: "showcase" });

  const rawPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const svc = createSupabaseService();

  const { data: rows, count, error } = await svc
    .from("showcases")
    .select(
      "id, slug, title, client_name_public, published_at, cover_media_type, cover_media_storage_path, cover_media_external_url",
      { count: "exact" },
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[work-index] query error:", error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const showcases: ShowcaseRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    client_name_public: r.client_name_public,
    published_at: r.published_at,
    cover_media_type: r.cover_media_type,
    cover_media_storage_path: r.cover_media_storage_path,
    cover_media_external_url: r.cover_media_external_url,
  }));

  const coverPaths = showcases
    .map((s) => s.cover_media_storage_path)
    .filter((p): p is string => Boolean(p));
  const coverUrlMap: Record<string, string> = {};
  if (coverPaths.length > 0) {
    const { data: signed } = await svc.storage
      .from("showcase-media")
      .createSignedUrls(coverPaths, 3600);
    for (const row of signed ?? []) {
      if (row.path && row.signedUrl) {
        coverUrlMap[row.path] = row.signedUrl;
      }
    }
  }

  const fmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    timeZone: "Asia/Seoul",
  });

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const prevHref = `/${locale}/work?page=${page - 1}`;
  const nextHref = `/${locale}/work?page=${page + 1}`;

  return (
    <main className="min-h-dvh">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <header className="py-32">
          <h1 className="font-display italic keep-all text-5xl md:text-6xl lg:text-7xl leading-[1.03] tracking-[-0.03em] mb-6 max-w-2xl">
            {t("work_index_title")}
          </h1>
          <p className="keep-all text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t("work_index_subtitle")}
          </p>
        </header>

        {showcases.length === 0 ? (
          <p className="keep-all text-muted-foreground py-16 border-t border-black/5">
            {t("work_index_empty")}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 md:gap-y-14 pb-16 md:pb-20">
              {showcases.map((s) => {
                const coverUrl =
                  s.cover_media_storage_path &&
                  coverUrlMap[s.cover_media_storage_path]
                    ? coverUrlMap[s.cover_media_storage_path]
                    : s.cover_media_external_url ?? null;
                const publishedLabel = s.published_at
                  ? fmt.format(new Date(s.published_at))
                  : null;
                return (
                  <a
                    key={s.id}
                    href={`/showcase/${s.slug}`}
                    className="group flex flex-col gap-3"
                  >
                    <div className="relative w-full aspect-video overflow-hidden bg-black/[0.03]">
                      {coverUrl && s.cover_media_type !== "video_embed" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverUrl}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2 className="keep-all font-display text-lg md:text-xl tracking-tight leading-tight group-hover:italic transition-all">
                        {s.title}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 tabular-nums">
                        {s.client_name_public ? (
                          <span className="label-caps">
                            {s.client_name_public}
                          </span>
                        ) : null}
                        {s.client_name_public && publishedLabel ? (
                          <span aria-hidden>·</span>
                        ) : null}
                        {publishedLabel ? (
                          <span className="label-caps">{publishedLabel}</span>
                        ) : null}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-between border-t border-black/10 py-8 mb-24"
              >
                {hasPrev ? (
                  <a
                    href={prevHref}
                    className="label-caps text-foreground hover:text-foreground/70 transition-colors"
                  >
                    ← {t("work_index_prev")}
                  </a>
                ) : (
                  <span className="label-caps text-muted-foreground/40">
                    ← {t("work_index_prev")}
                  </span>
                )}

                <span className="label-caps text-muted-foreground tabular-nums">
                  {t("work_index_pagination", {
                    current: page,
                    total: totalPages,
                  })}
                </span>

                {hasNext ? (
                  <a
                    href={nextHref}
                    className="label-caps text-foreground hover:text-foreground/70 transition-colors"
                  >
                    {t("work_index_next")} →
                  </a>
                ) : (
                  <span className="label-caps text-muted-foreground/40">
                    {t("work_index_next")} →
                  </span>
                )}
              </nav>
            ) : null}
          </>
        )}
      </div>
      <SiteFooter locale={locale} pathname="/work" />
    </main>
  );
}
