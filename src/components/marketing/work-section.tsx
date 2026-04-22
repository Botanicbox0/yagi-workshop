import { getTranslations } from "next-intl/server";
import { createSupabaseService } from "@/lib/supabase/service";

type Props = {
  locale: "ko" | "en";
};

type ShowcaseCard = {
  id: string;
  slug: string;
  title: string;
  client_name_public: string | null;
  cover_media_type: string | null;
  cover_media_storage_path: string | null;
  cover_media_external_url: string | null;
};

export async function WorkSection({ locale }: Props) {
  const t = await getTranslations("showcase");

  const svc = createSupabaseService();

  const { data: rows, error } = await svc
    .from("showcases")
    .select(
      "id, slug, title, client_name_public, cover_media_type, cover_media_storage_path, cover_media_external_url",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[work-section] query error:", error.message);
  }

  const showcases: ShowcaseCard[] = (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    client_name_public: r.client_name_public,
    cover_media_type: r.cover_media_type,
    cover_media_storage_path: r.cover_media_storage_path,
    cover_media_external_url: r.cover_media_external_url,
  }));

  // Resolve signed URLs for private storage covers.
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

  type Resolved = ShowcaseCard & { coverUrl: string | null };

  const withCovers: Resolved[] = showcases.map((s) => {
    const coverUrl =
      s.cover_media_storage_path && coverUrlMap[s.cover_media_storage_path]
        ? coverUrlMap[s.cover_media_storage_path]
        : s.cover_media_external_url ?? null;
    return { ...s, coverUrl };
  });

  // Skip cards without any cover image.
  const visible = withCovers.filter((s) => Boolean(s.coverUrl));

  return (
    <section
      aria-labelledby="work-section-title"
      className="border-t border-black/5 py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="mb-16 md:mb-20 max-w-3xl">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="label-caps text-muted-foreground/70 tabular-nums">
              {t("landing_work_eyebrow")}
            </span>
          </div>
          <h2
            id="work-section-title"
            className="font-display keep-all text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]"
          >
            <em className="italic">{t("landing_work_title")}</em>
          </h2>
          <p className="mt-6 keep-all text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t("landing_work_subtitle")}
          </p>
        </div>

        {visible.length === 0 ? (
          <p className="keep-all text-sm md:text-base text-muted-foreground italic font-display py-16 border-t border-black/10">
            <em>{t("landing_work_empty")}</em>
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 md:gap-y-16">
              {visible.map((s) => (
                <a
                  key={s.id}
                  href={`/showcase/${s.slug}`}
                  className="group flex flex-col gap-4"
                >
                  <div className="relative w-full aspect-video overflow-hidden bg-black/[0.03]">
                    {s.coverUrl && s.cover_media_type !== "video_embed" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.coverUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="keep-all font-display text-xl md:text-2xl tracking-tight leading-tight group-hover:italic transition-all">
                      {s.title}
                    </h3>
                    {s.client_name_public ? (
                      <p className="label-caps text-muted-foreground/80 tabular-nums">
                        {s.client_name_public}
                      </p>
                    ) : null}
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-16 md:mt-20 flex items-center">
              <a
                href={`/${locale}/work`}
                className="inline-flex items-center gap-2 label-caps text-foreground hover:text-foreground/70 transition-colors"
              >
                {t("landing_work_view_all")}
                <span aria-hidden>→</span>
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
