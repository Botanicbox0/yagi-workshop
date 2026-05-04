// =============================================================================
// Phase 5 Wave B task_05 v3 sub_5 — oembed proxy (allowlist-only)
//
// Briefing Canvas Step 2 reference column posts a URL → this endpoint
// returns { provider, thumbnail_url?, oembed_html?, title? } for client
// rendering.
//
// SSRF posture (post-K-05 LOOP 1, F1 fix):
//   The route now uses a strict provider ALLOWLIST. The previous generic
//   OG-meta scrape path (safeFetchHtml + parseMeta) was removed because
//   `assertSafeUrl()` resolved DNS up-front but the subsequent `fetch()`
//   performed its own DNS lookup again — leaving a DNS-rebinding window
//   between the resolve and the actual socket. Pinning the validated IP
//   into the request requires an undici dispatcher with a custom lookup
//   per hop (FU-Phase5-3). Until that lands, only YouTube/Vimeo (which
//   call the provider's official oembed endpoint via lib/oembed) and
//   Instagram (bare provider tag, no fetch) are supported.
//
//   Non-allowlisted hosts return { provider: "generic", thumbnail_url:
//   null, ... }. The client persists the URL with no thumbnail; the row
//   still renders cleanly via the link icon fallback.
//
// Input validation:
//   - http(s) scheme only
//   - Reject .local / .internal / localhost
//   - URL length <= 2000
// =============================================================================

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const YOUTUBE_RE = /(?:^|\.)(?:youtube\.com|youtu\.be)$/i;
const VIMEO_RE = /(?:^|\.)vimeo\.com$/i;
const INSTAGRAM_RE = /(?:^|\.)(?:instagram\.com|cdninstagram\.com)$/i;

// ---------------------------------------------------------------------------
// Input validator (no DNS — allowlist makes resolution unnecessary)
// ---------------------------------------------------------------------------

function validateUrlShape(rawUrl: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return null;
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

type OembedResult = {
  provider: "youtube" | "vimeo" | "instagram" | "generic";
  thumbnail_url: string | null;
  oembed_html: string | null;
  title: string | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl || rawUrl.length === 0 || rawUrl.length > 2000) {
    return NextResponse.json(
      { error: "missing or invalid url" },
      { status: 400 },
    );
  }

  const parsed = validateUrlShape(rawUrl);
  if (!parsed) {
    return NextResponse.json({ error: "url rejected" }, { status: 400 });
  }
  const host = parsed.hostname.toLowerCase();

  // YouTube + Vimeo — call the provider's trusted oembed endpoint via
  // lib/oembed (fetchVideoMetadata). Lazy-imported so the route file
  // surface stays minimal.
  if (YOUTUBE_RE.test(host) || VIMEO_RE.test(host)) {
    try {
      const { fetchVideoMetadata } = await import("@/lib/oembed");
      const meta = await fetchVideoMetadata(parsed.toString());
      if (meta) {
        const result: OembedResult = {
          provider: meta.provider,
          thumbnail_url: meta.thumbnailUrl,
          oembed_html: null,
          title: meta.title,
        };
        return NextResponse.json(result);
      }
    } catch {
      // fall through to bare provider tag
    }
    return NextResponse.json(
      {
        provider: YOUTUBE_RE.test(host) ? "youtube" : "vimeo",
        thumbnail_url: null,
        oembed_html: null,
        title: null,
      } satisfies OembedResult,
    );
  }

  // Instagram — Meta requires API key for oEmbed; bare provider tag.
  if (INSTAGRAM_RE.test(host)) {
    return NextResponse.json(
      {
        provider: "instagram",
        thumbnail_url: null,
        oembed_html: null,
        title: null,
      } satisfies OembedResult,
    );
  }

  // Non-allowlisted host — return generic with no thumbnail. Client
  // persists URL only. Generic OG scraping is FU-Phase5-3 (requires
  // undici dispatcher with IP-pinning lookup to be SSRF-safe).
  return NextResponse.json(
    {
      provider: "generic",
      thumbnail_url: null,
      oembed_html: null,
      title: null,
    } satisfies OembedResult,
  );
}
