import { promises as dns } from "node:dns";
import net from "node:net";

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

/**
 * Returns true if the IP literal falls in a reserved/private range.
 * Catches IPv4 loopback/private/link-local/0.0.0.0 and IPv6
 * loopback/unspecified/link-local/unique-local plus IPv4-mapped IPv6.
 */
function isPrivateIpLiteral(ip: string): boolean {
  // Strip IPv6 brackets
  const bare = ip.startsWith("[") && ip.endsWith("]") ? ip.slice(1, -1) : ip;
  // Drop zone-id (fe80::1%eth0)
  const noZone = bare.split("%")[0];

  if (net.isIPv4(noZone)) {
    return isPrivateIPv4(noZone);
  }
  if (net.isIPv6(noZone)) {
    return isPrivateIPv6(noZone);
  }
  return false;
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8 private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // 192.0.0/24, 192.0.2/24 (TEST-NET-1)
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;

  // Phase 2.1 G7 H1 — normalize full-form IPv4-mapped prefix so a single
  // regex matches BOTH `::ffff:*` compressed and `0:0:0:0:0:ffff:*`
  // uncompressed textual styles. Without this, an attacker could submit
  // `0:0:0:0:0:ffff:7f00:1` (= 127.0.0.1) and slip past the prior regex
  // anchored at `^::ffff:`. Both forms are RFC-valid for the same address.
  // (Mirrors og-video-unfurl.ts walker — keep in sync.)
  const normalized = lower.replace(/^0:0:0:0:0:ffff:/, "::ffff:");

  // IPv4-mapped IPv6 — hex low-word form first, dotted-quad second. Both
  // resolve to the same IPv4 space and must be classified identically.
  const v4Mapped = normalized.match(
    /^::ffff:(?:([0-9a-f]{1,4}):([0-9a-f]{1,4})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))$/
  );
  if (v4Mapped) {
    if (v4Mapped[3]) {
      // dotted-quad
      return net.isIPv4(v4Mapped[3]) ? isPrivateIPv4(v4Mapped[3]) : true;
    }
    // hex low-word → reconstruct dotted quad from the two 16-bit groups.
    const hi = parseInt(v4Mapped[1], 16);
    const lo = parseInt(v4Mapped[2], 16);
    const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateIPv4(dotted);
  }

  // Unique-local fc00::/7  → first byte 0xfc or 0xfd
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
  // Link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  // Multicast ff00::/8
  if (lower.startsWith("ff")) return true;
  // Discard-only 100::/64
  if (lower.startsWith("100:")) return true;
  return false;
}

/**
 * Validates the URL host: parses, checks protocol, resolves DNS, and
 * blocks any private/reserved address. Returns null if blocked, or the
 * parsed URL if safe.
 */
async function validateHost(rawUrl: string): Promise<URL | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  // Strip brackets from IPv6 literal hostnames before checking.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");

  if (host === "localhost") return null;

  // If the hostname is itself an IP literal, validate directly.
  if (net.isIP(host)) {
    if (isPrivateIpLiteral(host)) return null;
    return parsed;
  }

  // DNS-resolve and reject if ANY resolved address is private.
  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (records.length === 0) return null;
    for (const r of records) {
      if (isPrivateIpLiteral(r.address)) return null;
    }
  } catch {
    return null;
  }

  return parsed;
}

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
