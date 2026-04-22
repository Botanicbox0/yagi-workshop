import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { resolveShowcaseLocale } from "./resolve-locale";
import { ShowcasePasswordPrompt } from "./password-prompt";
import { incrementShowcaseView } from "./actions";

// Public brand surface — don't cache forever, but do allow short edge
// caching for traffic spikes. `dynamic = force-dynamic` keeps auth-free
// cookie reads (password unlock) accurate per-request.
export const dynamic = "force-dynamic";

const MEDIA_BUCKET = "showcase-media";
const SIGNED_URL_TTL = 3600; // 1h — matches Phase 1.4/1.8 project convention

type Props = { params: Promise<{ slug: string }> };

type ShowcaseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  narrative_md: string | null;
  cover_media_storage_path: string | null;
  cover_media_external_url: string | null;
  cover_media_type: string | null;
  credits_md: string | null;
  client_name_public: string | null;
  status: string;
  made_with_yagi: boolean;
  badge_removal_approved_at: string | null;
  is_password_protected: boolean;
  published_at: string | null;
};

type ShowcaseMediaRow = {
  id: string;
  sort_order: number;
  media_type: string;
  storage_path: string | null;
  external_url: string | null;
  embed_provider: string | null;
  caption: string | null;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trimEnd()}…`;
}

async function loadShowcaseBySlug(
  slug: string,
): Promise<ShowcaseRow | null> {
  try {
    const svc = createSupabaseService();
    const { data, error } = await svc
      .from("showcases")
      .select(
        "id, slug, title, subtitle, narrative_md, cover_media_storage_path, cover_media_external_url, cover_media_type, credits_md, client_name_public, status, made_with_yagi, badge_removal_approved_at, is_password_protected, published_at",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("[showcase/page] lookup error", error);
      return null;
    }
    return (data as ShowcaseRow) ?? null;
  } catch (err) {
    console.error("[showcase/page] service client threw", err);
    return null;
  }
}

async function loadShowcaseMedia(
  showcaseId: string,
): Promise<ShowcaseMediaRow[]> {
  try {
    const svc = createSupabaseService();
    const { data, error } = await svc
      .from("showcase_media")
      .select(
        "id, sort_order, media_type, storage_path, external_url, embed_provider, caption",
      )
      .eq("showcase_id", showcaseId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("[showcase/page] media load error", error);
      return [];
    }
    return (data as ShowcaseMediaRow[]) ?? [];
  } catch (err) {
    console.error("[showcase/page] media client threw", err);
    return [];
  }
}

async function signStoragePaths(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  try {
    const svc = createSupabaseService();
    const { data, error } = await svc.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL);
    if (error || !data) {
      console.error("[showcase/page] sign error", error);
      return {};
    }
    const out: Record<string, string> = {};
    for (const entry of data) {
      if (entry.path && entry.signedUrl) {
        out[entry.path] = entry.signedUrl;
      }
    }
    return out;
  } catch (err) {
    console.error("[showcase/page] sign threw", err);
    return {};
  }
}

function buildEmbedUrl(
  provider: string | null | undefined,
  externalUrl: string,
): string | null {
  if (!provider) return null;
  const p = provider.toLowerCase();
  if (p === "youtube") {
    // Phase 2.0 G6 #L4 (Phase 1.9 L4) — map /shorts/{id} to /embed/{id}.
    // Shorts URLs render a standalone mobile-first player that refuses to
    // embed as-is; the /embed/ variant works with the same video id.
    return externalUrl
      .replace("watch?v=", "embed/")
      .replace(/\/shorts\//, "/embed/")
      .replace("youtu.be/", "www.youtube.com/embed/");
  }
  if (p === "vimeo") {
    const id = externalUrl.split("/").filter(Boolean).pop();
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  // tiktok / instagram have oEmbed endpoints; inline iframe isn't reliable
  // for them, so we render a thumbnail+link fallback in the component.
  return null;
}

// Minimal, dependency-free markdown renderer. Supports paragraphs, bold
// (**text**), italic (*text* / _text_), inline code (`code`), links
// ([text](url)), and headings (# / ## / ###). Everything else renders as
// plain text. If react-markdown gets added to deps later, swap this.
function renderMarkdown(md: string): React.ReactNode {
  const escapeHtml = (s: string): string =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const inline = (raw: string): string => {
    let s = escapeHtml(raw);
    // links
    s = s.replace(
      /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
      (_m, text: string, url: string) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:no-underline">${text}</a>`,
    );
    // inline code
    s = s.replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-neutral-100 px-1 py-0.5 text-sm">$1</code>',
    );
    // bold
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // italic (simple — avoid greedy)
    s = s.replace(/(^|\s)\*([^*]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/(^|\s)_([^_]+)_/g, "$1<em>$2</em>");
    return s;
  };

  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.length === 0) return null;
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1]!.length;
      const content = inline(heading[2]!);
      const className =
        level === 1
          ? "font-[family-name:var(--font-fraunces)] text-2xl italic font-semibold keep-all mt-8"
          : level === 2
            ? "font-[family-name:var(--font-fraunces)] text-xl italic font-semibold keep-all mt-6"
            : "text-base font-semibold keep-all mt-4";
      const Tag = (`h${level}`) as "h1" | "h2" | "h3";
      return (
        <Tag
          key={i}
          className={className}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    // Convert single newlines inside a block to <br>
    const html = inline(trimmed).replace(/\n/g, "<br />");
    return (
      <p
        key={i}
        className="text-base leading-relaxed keep-all text-neutral-800"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

// ─── metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const showcase = await loadShowcaseBySlug(slug);
  if (!showcase) {
    return {
      title: "YAGI Workshop",
      robots: { index: false },
    };
  }

  const descriptionSource = showcase.narrative_md
    ? stripMarkdown(showcase.narrative_md)
    : showcase.subtitle ?? "";
  const description = truncate(descriptionSource, 160);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
  const ogImageUrl = `${siteUrl}/api/showcases/${showcase.id}/og`;

  return {
    title: `${showcase.title} — YAGI Workshop`,
    description: description || undefined,
    openGraph: {
      title: `${showcase.title} — YAGI Workshop`,
      description: description || undefined,
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${showcase.title} — YAGI Workshop`,
      description: description || undefined,
      images: [ogImageUrl],
    },
    robots:
      showcase.status === "published"
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function ShowcasePage({ params }: Props) {
  const { slug } = await params;
  const locale = await resolveShowcaseLocale();
  const t = await getTranslations({ locale, namespace: "showcase" });

  const showcase = await loadShowcaseBySlug(slug);
  if (!showcase) {
    notFound();
  }

  // Password gate check. If protected, the session cookie must be set.
  if (showcase.is_password_protected) {
    const store = await cookies();
    const unlocked = store.get(`sc_unlock_${showcase.id}`)?.value === "1";
    if (!unlocked) {
      return (
        <ShowcasePasswordPrompt
          showcaseId={showcase.id}
          slug={showcase.slug}
        />
      );
    }
  }

  // Fire-and-forget view count increment (wrapped in try/catch inside the
  // action itself — safe not to await).
  void incrementShowcaseView(showcase.id);

  // Load media + pre-sign all storage-backed URLs in one batch.
  const media = await loadShowcaseMedia(showcase.id);
  const storagePaths: string[] = [];
  for (const m of media) {
    if (m.storage_path) storagePaths.push(m.storage_path);
  }
  if (showcase.cover_media_storage_path) {
    storagePaths.push(showcase.cover_media_storage_path);
  }
  const signedByPath = await signStoragePaths(
    Array.from(new Set(storagePaths)),
  );

  // Resolve hero source
  const heroStoragePath = showcase.cover_media_storage_path;
  const heroExternalUrl = showcase.cover_media_external_url;
  const heroType = showcase.cover_media_type;
  const heroSignedUrl = heroStoragePath
    ? signedByPath[heroStoragePath] ?? null
    : null;

  const showBadge =
    showcase.made_with_yagi && !showcase.badge_removal_approved_at;

  return (
    <main className="min-h-dvh bg-white text-black">
      {/* ── Hero ── */}
      <section className="w-full">
        {heroType === "video_upload" && heroSignedUrl ? (
          <video
            src={heroSignedUrl}
            controls
            playsInline
            className="w-full max-h-[85vh] object-cover bg-black"
          />
        ) : heroType === "video_embed" && heroExternalUrl ? (
          <HeroEmbed externalUrl={heroExternalUrl} />
        ) : heroType === "image" && heroSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroSignedUrl}
            alt={showcase.title}
            className="w-full max-h-[85vh] object-cover"
          />
        ) : heroExternalUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroExternalUrl}
            alt={showcase.title}
            className="w-full max-h-[85vh] object-cover"
          />
        ) : (
          <div className="w-full aspect-[16/9] bg-neutral-100" />
        )}
      </section>

      {/* ── Title block ── */}
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-10 space-y-4">
        {showcase.client_name_public ? (
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 keep-all">
            {locale === "ko"
              ? `${showcase.client_name_public}을(를) 위해`
              : `For ${showcase.client_name_public}`}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl md:text-5xl italic font-semibold leading-[1.05] keep-all">
          {showcase.title}
        </h1>
        {showcase.subtitle ? (
          <p className="font-[family-name:var(--font-fraunces)] text-xl md:text-2xl italic font-light text-neutral-600 leading-snug keep-all">
            {showcase.subtitle}
          </p>
        ) : null}
      </section>

      {/* ── Narrative ── */}
      {showcase.narrative_md && showcase.narrative_md.trim().length > 0 ? (
        <section className="mx-auto max-w-2xl px-6 pb-16 space-y-5">
          {renderMarkdown(showcase.narrative_md)}
        </section>
      ) : null}

      {/* ── Media grid ── */}
      {media.length > 0 ? (
        <section className="mx-auto max-w-5xl px-6 pb-16">
          <MediaGrid items={media} signedByPath={signedByPath} />
        </section>
      ) : null}

      {/* ── Credits ── */}
      {showcase.credits_md && showcase.credits_md.trim().length > 0 ? (
        <section className="mx-auto max-w-2xl px-6 pb-16 space-y-5 border-t border-neutral-200 pt-12">
          <h2 className="text-xs uppercase tracking-[0.18em] text-neutral-500 keep-all">
            {t("viewer_credits_heading")}
          </h2>
          <div className="space-y-3">{renderMarkdown(showcase.credits_md)}</div>
        </section>
      ) : null}

      {/* ── Made with YAGI badge ── */}
      {showBadge ? (
        <footer className="mx-auto max-w-3xl px-6 pb-16 pt-4 flex justify-center">
          <Link
            href={`https://yagiworkshop.xyz/?ref=showcase-${showcase.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2 text-xs uppercase tracking-[0.14em] text-neutral-600 hover:border-black hover:text-black transition-colors"
          >
            {t("viewer_made_with_yagi")}
          </Link>
        </footer>
      ) : (
        <div className="h-16" />
      )}
    </main>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function HeroEmbed({ externalUrl }: { externalUrl: string }) {
  const lower = externalUrl.toLowerCase();
  let provider: "youtube" | "vimeo" | null = null;
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    provider = "youtube";
  } else if (lower.includes("vimeo.com")) {
    provider = "vimeo";
  }
  const embedUrl = provider ? buildEmbedUrl(provider, externalUrl) : null;
  if (!embedUrl) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-sm underline underline-offset-4"
        >
          {externalUrl}
        </a>
      </div>
    );
  }
  return (
    <div className="relative w-full bg-black" style={{ paddingTop: "56.25%" }}>
      <iframe
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

function MediaGrid({
  items,
  signedByPath,
}: {
  items: ShowcaseMediaRow[];
  signedByPath: Record<string, string>;
}) {
  // Partition: videos always full-width, images in 2-col on md+.
  const rendered: React.ReactNode[] = [];
  let imageRun: ShowcaseMediaRow[] = [];

  const flushImageRun = () => {
    if (imageRun.length === 0) return;
    rendered.push(
      <div
        key={`img-run-${rendered.length}`}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {imageRun.map((m) => (
          <ImageItem key={m.id} item={m} signedByPath={signedByPath} />
        ))}
      </div>,
    );
    imageRun = [];
  };

  for (const m of items) {
    if (m.media_type === "image") {
      imageRun.push(m);
      continue;
    }
    flushImageRun();
    if (m.media_type === "video_upload") {
      rendered.push(
        <VideoUploadItem key={m.id} item={m} signedByPath={signedByPath} />,
      );
    } else if (m.media_type === "video_embed") {
      rendered.push(<VideoEmbedItem key={m.id} item={m} />);
    }
  }
  flushImageRun();

  return <div className="space-y-10">{rendered}</div>;
}

function Caption({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <p className="mt-3 text-sm italic text-neutral-500 keep-all">{text}</p>
  );
}

function ImageItem({
  item,
  signedByPath,
}: {
  item: ShowcaseMediaRow;
  signedByPath: Record<string, string>;
}) {
  const url = item.storage_path
    ? signedByPath[item.storage_path]
    : item.external_url ?? undefined;
  if (!url) return null;
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={item.caption ?? ""}
        className="w-full h-auto object-cover"
        loading="lazy"
      />
      <Caption text={item.caption} />
    </figure>
  );
}

function VideoUploadItem({
  item,
  signedByPath,
}: {
  item: ShowcaseMediaRow;
  signedByPath: Record<string, string>;
}) {
  const url = item.storage_path
    ? signedByPath[item.storage_path]
    : undefined;
  if (!url) return null;
  return (
    <figure>
      <video
        src={url}
        controls
        playsInline
        className="w-full bg-black"
        preload="metadata"
      />
      <Caption text={item.caption} />
    </figure>
  );
}

function VideoEmbedItem({ item }: { item: ShowcaseMediaRow }) {
  if (!item.external_url) return null;
  const embedUrl = buildEmbedUrl(item.embed_provider, item.external_url);
  if (!embedUrl) {
    // TikTok / Instagram fallback: render link card (no inline iframe).
    return (
      <figure>
        <a
          href={item.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full aspect-video bg-neutral-100 flex items-center justify-center text-neutral-600 text-sm underline underline-offset-4 hover:text-black"
        >
          {item.embed_provider ?? "external"} →
        </a>
        <Caption text={item.caption} />
      </figure>
    );
  }
  return (
    <figure>
      <div
        className="relative w-full bg-black"
        style={{ paddingTop: "56.25%" }}
      >
        <iframe
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <Caption text={item.caption} />
    </figure>
  );
}
