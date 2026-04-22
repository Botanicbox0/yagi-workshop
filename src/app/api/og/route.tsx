import { ImageResponse } from "@vercel/og";
import { allPosts } from "content-collections";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Theme = "default" | "accent" | "quote";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

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

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // Split on ". " — fall back to first 180 chars.
  const idx = trimmed.indexOf(". ");
  if (idx === -1) return trimmed.slice(0, 180);
  return trimmed.slice(0, idx + 1);
}

/**
 * Fetch Google Fonts webfonts as ArrayBuffers for satori.
 * Returns empty array on any failure — ImageResponse falls back to a
 * default sans-serif and still produces a valid PNG.
 */
async function loadFonts(): Promise<
  {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: "normal" | "italic";
  }[]
> {
  const cssUrls = [
    // Fraunces italic 700 — display face for titles.
    {
      url: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,72,700&display=swap",
      name: "Fraunces",
      weight: 700 as const,
      style: "italic" as const,
    },
    // Inter 700 — Pretendard substitute for body / wordmark.
    {
      url: "https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap",
      name: "Inter",
      weight: 700 as const,
      style: "normal" as const,
    },
    // Inter 400 — muted metadata lines.
    {
      url: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap",
      name: "Inter",
      weight: 400 as const,
      style: "normal" as const,
    },
  ];

  const fonts: {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: "normal" | "italic";
  }[] = [];

  for (const entry of cssUrls) {
    try {
      const cssRes = await fetch(entry.url, {
        headers: {
          // Pretend to be a modern browser so Google returns woff2 URLs.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!cssRes.ok) continue;
      const css = await cssRes.text();
      const match = css.match(/src:\s*url\((https:[^)]+\.woff2)\)/u);
      if (!match?.[1]) continue;
      const fontRes = await fetch(match[1]);
      if (!fontRes.ok) continue;
      const data = await fontRes.arrayBuffer();
      fonts.push({
        name: entry.name,
        data,
        weight: entry.weight,
        style: entry.style,
      });
    } catch (err) {
      console.warn(`[og] failed to load ${entry.name}`, err);
    }
  }

  return fonts;
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const localeParam = searchParams.get("locale") ?? "ko";
  const themeParam = (searchParams.get("theme") ?? "default") as Theme;
  const theme: Theme =
    themeParam === "accent" || themeParam === "quote"
      ? themeParam
      : "default";

  const fonts = await loadFonts();

  const post = slug
    ? allPosts.find(
        (p) => p.slug === slug && p.locale === localeParam,
      )
    : undefined;

  const bg = theme === "accent" ? "#000000" : "#ffffff";
  const fg = theme === "accent" ? "#ffffff" : "#000000";
  const muted =
    theme === "accent" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const hairline =
    theme === "accent" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";

  // Fallback: no post → wordmark-only card.
  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: bg,
            color: fg,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 28,
                letterSpacing: 8,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              YAGI WORKSHOP
            </div>
            <div
              style={{
                width: 96,
                height: 1,
                backgroundColor: hairline,
              }}
            />
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontStyle: "italic",
                fontSize: 48,
                fontWeight: 700,
              }}
            >
              a small workshop, a long breath.
            </div>
          </div>
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: fonts.length > 0 ? fonts : undefined,
      },
    );
  }

  const dateLabel = formatDate(post.locale, post.publishedAt);
  const firstTag = post.tags[0];

  // Build the three compositions. They share the wordmark top-left and
  // metadata bottom-right; the center changes per theme.
  const wordmark = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 22,
          letterSpacing: 6,
          fontWeight: 700,
          textTransform: "uppercase",
          fontFamily: "Inter, sans-serif",
        }}
      >
        YAGI WORKSHOP
      </div>
    </div>
  );

  const bottomMeta = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          color: muted,
          fontFamily: "Inter, sans-serif",
          fontSize: 22,
          maxWidth: 800,
        }}
      >
        {theme === "quote" ? (
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontStyle: "italic",
              fontSize: 28,
              fontWeight: 700,
              color: fg,
            }}
          >
            {post.title}
          </div>
        ) : post.subtitle ? (
          <div
            style={{
              fontSize: 26,
              color: muted,
              lineHeight: 1.3,
              wordBreak: "keep-all",
            }}
          >
            {post.subtitle}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 20,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {dateLabel}
        </div>
      </div>
      {firstTag ? (
        <div
          style={{
            border: `1px solid ${hairline}`,
            borderRadius: 9999,
            padding: "8px 20px",
            fontSize: 18,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: fg,
            fontFamily: "Inter, sans-serif",
            display: "flex",
            alignItems: "center",
          }}
        >
          #{firstTag}
        </div>
      ) : null}
    </div>
  );

  let center;
  if (theme === "quote") {
    const quote = firstSentence(post.content ?? "");
    center = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 64,
            lineHeight: 1.1,
            color: fg,
            letterSpacing: "-0.02em",
            wordBreak: "keep-all",
          }}
        >
          “{quote}”
        </div>
      </div>
    );
  } else {
    center = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 88,
            lineHeight: 1.03,
            color: fg,
            letterSpacing: "-0.03em",
            wordBreak: "keep-all",
          }}
        >
          {post.title}
        </div>
      </div>
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: bg,
          color: fg,
          padding: "64px 72px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {wordmark}
        {center}
        {bottomMeta}
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
