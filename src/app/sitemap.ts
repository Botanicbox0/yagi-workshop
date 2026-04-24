import type { MetadataRoute } from "next";

import { allPosts } from "content-collections";
import { createSupabaseService } from "@/lib/supabase/service";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

const LOCALES = ["ko", "en"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const landingEntries: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1.0,
  }));

  const journalIndexEntries: MetadataRoute.Sitemap = LOCALES.map(
    (locale) => ({
      url: `${SITE_URL}/${locale}/journal`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    }),
  );

  const workIndexEntries: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}/work`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const publishedPosts = allPosts
    .filter((post) => !post.draft)
    .filter((post) => !post.tags.includes("guide"));

  const postEntries: MetadataRoute.Sitemap = publishedPosts.map((post) => {
    // Build per-post hreflang map only for sibling locales that actually exist.
    const languages: Record<string, string> = {};
    for (const otherLocale of LOCALES) {
      if (
        publishedPosts.some(
          (p) => p.locale === otherLocale && p.slug === post.slug,
        )
      ) {
        languages[otherLocale] = `${SITE_URL}/${otherLocale}/journal/${post.slug}`;
      }
    }
    return {
      url: `${SITE_URL}/${post.locale}/journal/${post.slug}`,
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages },
    };
  });

  // Landing + journal-index pages also get hreflang alternates so search
  // engines understand the ko/en pair as the same content.
  const landingLangs = Object.fromEntries(
    LOCALES.map((l) => [l, `${SITE_URL}/${l}`]),
  );
  const journalLangs = Object.fromEntries(
    LOCALES.map((l) => [l, `${SITE_URL}/${l}/journal`]),
  );
  const workLangs = Object.fromEntries(
    LOCALES.map((l) => [l, `${SITE_URL}/${l}/work`]),
  );
  const landingWithAlts = landingEntries.map((e) => ({
    ...e,
    alternates: { languages: landingLangs },
  }));
  const journalWithAlts = journalIndexEntries.map((e) => ({
    ...e,
    alternates: { languages: journalLangs },
  }));
  const workWithAlts = workIndexEntries.map((e) => ({
    ...e,
    alternates: { languages: workLangs },
  }));

  // Per-showcase entries — locale-free at `/showcase/{slug}`. Best-effort:
  // if Supabase env is missing or the query fails, we just omit them rather
  // than breaking the whole sitemap build.
  let showcaseEntries: MetadataRoute.Sitemap = [];
  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const svc = createSupabaseService();
      const { data: showcases } = await svc
        .from("showcases")
        .select("slug, published_at, updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1000);
      showcaseEntries = (showcases ?? []).map((s) => ({
        url: `${SITE_URL}/showcase/${s.slug}`,
        lastModified: new Date(s.updated_at ?? s.published_at ?? now),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error("[sitemap] showcase query failed:", err);
  }

  const challengeIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/challenges`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  let challengeDetailEntries: MetadataRoute.Sitemap = [];
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const svc = createSupabaseService();
      const { data: challenges } = await svc
        .from("challenges")
        .select("slug, state, announce_at, updated_at")
        .in("state", ["open", "closed_announced"])
        .limit(1000);
      challengeDetailEntries = (challenges ?? []).map((c) => ({
        url: `${SITE_URL}/challenges/${c.slug}`,
        lastModified: new Date(c.updated_at ?? c.announce_at ?? now),
        changeFrequency: c.state === "open" ? ("daily" as const) : ("monthly" as const),
        priority: c.state === "open" ? 0.8 : 0.7,
      }));
    }
  } catch (err) {
    console.error("[sitemap] challenges query failed:", err);
  }

  return [
    ...landingWithAlts,
    ...journalWithAlts,
    ...workWithAlts,
    ...postEntries,
    ...showcaseEntries,
    ...challengeIndexEntry,
    ...challengeDetailEntries,
  ];
}
