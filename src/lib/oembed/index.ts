// =============================================================================
// Phase 3.0 — oEmbed client with caching
//
// Supports YouTube + Vimeo only. Never throws — returns null on any error.
// Cache: @vercel/kv if env vars present, else module-scoped Map fallback.
// Cache key: oembed:v1:<sha256(url)> — hashed to avoid PII leak from query params.
// TTL: 30 days.
// =============================================================================

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OEmbedResult = {
  provider: "youtube" | "vimeo";
  title: string;
  thumbnailUrl: string;
  durationSeconds?: number;
};

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

type CacheEntry = {
  value: OEmbedResult | null;
  expiresAt: number;
};

// Module-scoped fallback cache (in-memory Map). Shared across requests within
// the same server process lifetime. On access we evict expired entries lazily.
const _mapCache = new Map<string, CacheEntry>();

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cacheKey(url: string): string {
  return `oembed:v1:${createHash("sha256").update(url).digest("hex")}`;
}

// @vercel/kv type shim — used only if the package is present at runtime.
// We avoid a hard import so the module doesn't fail when kv isn't installed.
type KvClient = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
};

async function tryGetKvClient(): Promise<KvClient | null> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- optional dep not in package.json
    const mod = await (Function('return import("@vercel/kv")')() as Promise<any>);
    return (mod.kv as KvClient) ?? null;
  } catch {
    return null;
  }
}

async function cacheGet(key: string): Promise<OEmbedResult | null | undefined> {
  const kv = await tryGetKvClient();
  if (kv) {
    try {
      const stored = await kv.get<OEmbedResult | null>(key);
      if (stored !== undefined) return stored;
    } catch {
      // kv read failure — fall through to map cache
    }
  }

  // Map fallback
  const entry = _mapCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    _mapCache.delete(key);
    return undefined;
  }
  return entry.value;
}

async function cacheSet(key: string, value: OEmbedResult | null): Promise<void> {
  const kv = await tryGetKvClient();
  if (kv) {
    try {
      const ttlSeconds = Math.floor(TTL_MS / 1000);
      await kv.set(key, value, { ex: ttlSeconds });
      return;
    } catch {
      // fall through to map cache
    }
  }

  // Map fallback — also prune stale entries on write (keep memory bounded)
  if (_mapCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of _mapCache) {
      if (now > v.expiresAt) _mapCache.delete(k);
    }
  }
  _mapCache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

const YOUTUBE_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
const VIMEO_RE = /^(https?:\/\/)?(www\.)?vimeo\.com\//;

// ---------------------------------------------------------------------------
// oEmbed fetch helpers
// ---------------------------------------------------------------------------

type RawYouTubeOEmbed = {
  title?: string;
  thumbnail_url?: string;
  // YouTube does not include duration in the oEmbed response
};

type RawVimeoOEmbed = {
  title?: string;
  thumbnail_url?: string;
  duration?: number; // seconds
};

async function fetchYouTube(url: string): Promise<OEmbedResult | null> {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(3000),
    headers: { "User-Agent": "YagiWorkshop/1.0" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RawYouTubeOEmbed;
  if (!json.title || !json.thumbnail_url) return null;
  return {
    provider: "youtube",
    title: json.title,
    thumbnailUrl: json.thumbnail_url,
    // durationSeconds not available from YouTube oEmbed
  };
}

async function fetchVimeo(url: string): Promise<OEmbedResult | null> {
  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(3000),
    headers: { "User-Agent": "YagiWorkshop/1.0" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RawVimeoOEmbed;
  if (!json.title || !json.thumbnail_url) return null;
  return {
    provider: "vimeo",
    title: json.title,
    thumbnailUrl: json.thumbnail_url,
    durationSeconds: typeof json.duration === "number" ? json.duration : undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch video metadata via oEmbed for a YouTube or Vimeo URL.
 *
 * - Returns null for unsupported providers, network errors, timeouts, or
 *   malformed responses. Never throws.
 * - Results are cached for 30 days using @vercel/kv (if env vars are set)
 *   or a module-scoped Map.
 */
export async function fetchVideoMetadata(
  url: string,
): Promise<OEmbedResult | null> {
  // Validate it looks like a URL before doing anything
  let normalised: string;
  try {
    normalised = new URL(url).href;
  } catch {
    return null;
  }

  const isYouTube = YOUTUBE_RE.test(normalised);
  const isVimeo = VIMEO_RE.test(normalised);
  if (!isYouTube && !isVimeo) return null;

  const key = cacheKey(normalised);

  try {
    const cached = await cacheGet(key);
    if (cached !== undefined) return cached;
  } catch {
    // cache read failure — continue to live fetch
  }

  try {
    const result = isYouTube
      ? await fetchYouTube(normalised)
      : await fetchVimeo(normalised);

    try {
      await cacheSet(key, result);
    } catch {
      // cache write failure — non-fatal
    }

    return result;
  } catch {
    // network error, timeout, JSON parse error — all return null per spec
    return null;
  }
}
