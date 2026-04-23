import { validateHost } from "@/lib/ip-classify";

export type OgData = {
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
};

/**
 * Decodes common HTML entities in a string.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, dec) =>
      String.fromCharCode(parseInt(dec, 10))
    );
}

const MAX_BODY_BYTES = 500_000;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 5000;
const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];

// Phase 2.1 G7 H1 Pass 3 — private-IP classification + host validation
// moved to src/lib/ip-classify.ts so the SSRF guard lives in one place
// and can't drift between the two unfurl walkers. See that file for the
// binary IPv6 parser that closes the hex-form / mixed-compression /
// zero-padded IPv4-mapped bypass surface.

/**
 * Performs a single fetch with no redirect following, hard timeout, and
 * a streamed body capped at MAX_BODY_BYTES. Used to walk the redirect
 * chain manually so each hop can be re-validated.
 */
async function fetchOneHop(
  url: string,
  signal: AbortSignal
): Promise<
  | { kind: "redirect"; location: string }
  | { kind: "ok"; body: string; finalUrl: string }
  | { kind: "skip" }
> {
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "YagiWorkshop/1.0", Accept: "text/html" },
    redirect: "manual",
  });

  // 3xx with Location → caller re-validates and recurses
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) return { kind: "skip" };
    try {
      const next = new URL(location, url).href;
      return { kind: "redirect", location: next };
    } catch {
      return { kind: "skip" };
    }
  }

  if (!res.ok) return { kind: "skip" };

  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.some((t) => ctype.startsWith(t))) {
    return { kind: "skip" };
  }

  // Pre-check declared length
  const declared = Number(res.headers.get("content-length") || "0");
  if (declared > MAX_BODY_BYTES * 4) return { kind: "skip" };

  // Stream body with hard byte cap
  if (!res.body) return { kind: "skip" };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (received < MAX_BODY_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
  }

  // Concatenate up to the cap
  const merged = new Uint8Array(Math.min(received, MAX_BODY_BYTES));
  let offset = 0;
  for (const c of chunks) {
    if (offset >= merged.byteLength) break;
    const take = Math.min(c.byteLength, merged.byteLength - offset);
    merged.set(c.subarray(0, take), offset);
    offset += take;
  }

  const body = new TextDecoder("utf-8", { fatal: false }).decode(merged);
  return { kind: "ok", body, finalUrl: res.url || url };
}

/**
 * Extracts OG metadata from a URL.
 * Never throws. Returns empty object on any error or block.
 */
export async function unfurl(url: string): Promise<OgData> {
  try {
    let current = url;
    let body = "";
    let finalUrl = url;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      let resolved = false;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const validated = await validateHost(current);
        if (!validated) return {};

        const result = await fetchOneHop(validated.href, controller.signal);
        if (result.kind === "skip") return {};
        if (result.kind === "redirect") {
          current = result.location;
          continue;
        }
        body = result.body;
        finalUrl = result.finalUrl;
        resolved = true;
        break;
      }
      if (!resolved) return {};
    } finally {
      clearTimeout(timer);
    }

    const result: OgData = {};

    const ogTitleMatch =
      body.match(
        /<meta\s+(?:[^>]*?\s+)?(?:property|name)=["']og:title["']\s+(?:[^>]*?\s+)?content=["']([^"']+)["']/i
      ) ||
      body.match(
        /<meta\s+(?:[^>]*?\s+)?content=["']([^"']+)["']\s+(?:[^>]*?\s+)?(?:property|name)=["']og:title["']/i
      );

    if (ogTitleMatch) {
      result.og_title = decodeHtmlEntities(ogTitleMatch[1]);
    }

    const ogDescMatch =
      body.match(
        /<meta\s+(?:[^>]*?\s+)?(?:property|name)=["']og:description["']\s+(?:[^>]*?\s+)?content=["']([^"']+)["']/i
      ) ||
      body.match(
        /<meta\s+(?:[^>]*?\s+)?content=["']([^"']+)["']\s+(?:[^>]*?\s+)?(?:property|name)=["']og:description["']/i
      );

    if (ogDescMatch) {
      result.og_description = decodeHtmlEntities(ogDescMatch[1]);
    }

    const ogImageMatch =
      body.match(
        /<meta\s+(?:[^>]*?\s+)?(?:property|name)=["']og:image["']\s+(?:[^>]*?\s+)?content=["']([^"']+)["']/i
      ) ||
      body.match(
        /<meta\s+(?:[^>]*?\s+)?content=["']([^"']+)["']\s+(?:[^>]*?\s+)?(?:property|name)=["']og:image["']/i
      );

    if (ogImageMatch) {
      const imageUrl = ogImageMatch[1];
      try {
        result.og_image_url = new URL(imageUrl, finalUrl).href;
      } catch {
        result.og_image_url = imageUrl;
      }
    }

    if (!result.og_title) {
      const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) {
        result.og_title = decodeHtmlEntities(titleMatch[1].trim());
      }
    }

    if (!result.og_image_url) {
      const imgMatch = body.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
      if (imgMatch) {
        const imageUrl = imgMatch[1];
        try {
          result.og_image_url = new URL(imageUrl, finalUrl).href;
        } catch {
          result.og_image_url = imageUrl;
        }
      }
    }

    return result;
  } catch {
    return {};
  }
}
