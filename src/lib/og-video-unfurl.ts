import { validateHost } from "@/lib/ip-classify";

/**
 * Server-side oEmbed resolver for common video platforms.
 * Used by the reference uploader URL tab before falling back to the
 * generic OG unfurl. Never throws.
 *
 * Runs on the Node runtime (ip-classify uses node:dns / node:net).
 */

export type VideoProvider = "youtube" | "vimeo" | "tiktok" | "instagram";

export type VideoUnfurlResult = {
  provider: VideoProvider;
  video_id?: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  canonical_url: string;
};

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 200_000;

// Phase 2.1 G7 H1 Pass 3 — private-IP classification + host validation
// moved to src/lib/ip-classify.ts so the SSRF guard lives in one place
// and can't drift between the two unfurl walkers. See that file for the
// binary IPv6 parser that closes the hex-form / mixed-compression /
// zero-padded IPv4-mapped bypass surface.

// ---------------- Provider detection ----------------

function detectProvider(hostname: string): VideoProvider | null {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  if (
    h === "youtube.com" ||
    h === "m.youtube.com" ||
    h === "youtu.be" ||
    h === "music.youtube.com"
  ) {
    return "youtube";
  }
  if (h === "vimeo.com" || h === "player.vimeo.com") return "vimeo";
  if (h === "tiktok.com" || h === "vm.tiktok.com" || h === "m.tiktok.com") {
    return "tiktok";
  }
  if (h === "instagram.com" || h === "instagr.am") return "instagram";
  return null;
}

// ---------------- Fetch with per-hop SSRF revalidation (walker) ----------------
//
// Phase 2.1 G5 FIX_NOW #1 — previously fetchJson() used redirect:"follow",
// which silently trusted Location headers returned by oEmbed endpoints.
// A redirect chain could reach a private IP through DNS-rebinding windows
// or attacker-influenced provider behavior without ever re-validating the
// destination. Port the manual-walk pattern from og-unfurl.ts so every hop
// is re-checked against the private-IP blocklist before the next fetch.
//
// Mirrors og-unfurl.ts walker — keep in sync.

const MAX_REDIRECTS = 5;

async function fetchJsonOneHop(
  url: string,
  signal: AbortSignal,
): Promise<
  | { kind: "redirect"; location: string }
  | { kind: "ok"; body: unknown }
  | { kind: "skip" }
> {
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "YagiWorkshop/1.0", Accept: "application/json" },
    redirect: "manual",
  });

  // 3xx with Location → caller re-validates and recurses.
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
  if (!ctype.includes("json")) return { kind: "skip" };

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
  const merged = new Uint8Array(Math.min(received, MAX_BODY_BYTES));
  let offset = 0;
  for (const c of chunks) {
    if (offset >= merged.byteLength) break;
    const take = Math.min(c.byteLength, merged.byteLength - offset);
    merged.set(c.subarray(0, take), offset);
    offset += take;
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(merged);
  try {
    return { kind: "ok", body: JSON.parse(text) };
  } catch {
    return { kind: "skip" };
  }
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const validated = await validateHost(current);
    if (!validated) return null;
    const result = await fetchJsonOneHop(validated.href, signal);
    if (result.kind === "skip") return null;
    if (result.kind === "redirect") {
      current = result.location;
      continue;
    }
    return result.body;
  }
  return null;
}

function asRecord(x: unknown): Record<string, unknown> | null {
  if (x && typeof x === "object" && !Array.isArray(x)) {
    return x as Record<string, unknown>;
  }
  return null;
}

function asString(x: unknown): string | null {
  return typeof x === "string" && x.length > 0 ? x : null;
}

function asNumber(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ---------------- Provider-specific extractors ----------------

function youtubeVideoId(u: URL): string | undefined {
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\/+/, "").split("/")[0];
    return id || undefined;
  }
  if (u.pathname.startsWith("/watch")) {
    const v = u.searchParams.get("v");
    return v ?? undefined;
  }
  const shortsMatch = u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/);
  if (shortsMatch) return shortsMatch[1];
  return undefined;
}

function vimeoVideoId(u: URL): string | undefined {
  const m = u.pathname.match(/\/(\d+)(?:\/|$)/);
  return m ? m[1] : undefined;
}

async function resolveYoutube(
  url: URL,
  signal: AbortSignal
): Promise<VideoUnfurlResult | null> {
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    url.href
  )}&format=json`;
  const json = asRecord(await fetchJson(oembed, signal));
  if (!json) return null;
  const title = asString(json.title);
  const thumb = asString(json.thumbnail_url);
  if (!title || !thumb) return null;
  return {
    provider: "youtube",
    video_id: youtubeVideoId(url),
    title,
    thumbnail_url: thumb,
    duration_seconds: null,
    canonical_url: url.href,
  };
}

async function resolveVimeo(
  url: URL,
  signal: AbortSignal
): Promise<VideoUnfurlResult | null> {
  const oembed = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
    url.href
  )}`;
  const json = asRecord(await fetchJson(oembed, signal));
  if (!json) return null;
  const title = asString(json.title);
  const thumb = asString(json.thumbnail_url);
  if (!title || !thumb) return null;
  return {
    provider: "vimeo",
    video_id: vimeoVideoId(url),
    title,
    thumbnail_url: thumb,
    duration_seconds: asNumber(json.duration),
    canonical_url: url.href,
  };
}

async function resolveTiktok(
  url: URL,
  signal: AbortSignal
): Promise<VideoUnfurlResult | null> {
  const oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(
    url.href
  )}`;
  const json = asRecord(await fetchJson(oembed, signal));
  if (!json) return null;
  const title = asString(json.title);
  const thumb = asString(json.thumbnail_url);
  if (!title || !thumb) return null;
  return {
    provider: "tiktok",
    title,
    thumbnail_url: thumb,
    duration_seconds: null,
    canonical_url: url.href,
  };
}

async function resolveInstagram(
  url: URL,
  signal: AbortSignal
): Promise<VideoUnfurlResult | null> {
  const token = process.env.INSTAGRAM_OEMBED_TOKEN;
  if (!token) return null;
  const oembed = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(
    url.href
  )}&access_token=${encodeURIComponent(token)}`;
  const json = asRecord(await fetchJson(oembed, signal));
  if (!json) return null;
  const title = asString(json.title) ?? asString(json.author_name);
  const thumb = asString(json.thumbnail_url);
  if (!title || !thumb) return null;
  return {
    provider: "instagram",
    title,
    thumbnail_url: thumb,
    duration_seconds: null,
    canonical_url: url.href,
  };
}

/**
 * Attempts to resolve a video-platform URL via its oEmbed endpoint.
 * Returns null on any failure (unknown host, SSRF block, fetch error,
 * bad JSON, missing required fields, or Instagram with no token).
 * Never throws.
 */
export async function unfurlVideoUrl(
  url: string
): Promise<VideoUnfurlResult | null> {
  try {
    const validated = await validateHost(url);
    if (!validated) return null;

    const provider = detectProvider(validated.hostname);
    if (!provider) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      switch (provider) {
        case "youtube":
          return await resolveYoutube(validated, controller.signal);
        case "vimeo":
          return await resolveVimeo(validated, controller.signal);
        case "tiktok":
          return await resolveTiktok(validated, controller.signal);
        case "instagram":
          return await resolveInstagram(validated, controller.signal);
        default:
          return null;
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
