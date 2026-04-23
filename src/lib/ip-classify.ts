// Phase 2.1 G7 H1 Pass 3 — shared IP classifier + host validator.
//
// Single source of truth for private-range detection used by both the
// generic OG unfurl walker (src/lib/og-unfurl.ts) and the video-platform
// oEmbed walker (src/lib/og-video-unfurl.ts). Replaces the prior
// duplicated implementations (~2x isPrivateIPv4 / isPrivateIPv6 /
// isPrivateIpLiteral / validateHost copies kept in sync by comment).
//
// IPv6 classification uses a binary parser (parseIPv6) that expands any
// RFC 5952-valid textual form to an 8-group Uint16Array before testing
// private-range membership. This closes the hex-form / zero-padded /
// mixed-compression / IPv4-mapped-vs-compatible bypass surface that
// text-regex-based classifiers miss.

import { promises as dns } from "node:dns";
import net from "node:net";

/**
 * RFC 5952-aware IPv6 expansion into an 8-group Uint16Array.
 * Handles: compressed (`::`), uncompressed, zero-padded, mixed compression,
 * and dotted-quad IPv4 suffixes (`::ffff:127.0.0.1`).
 * Returns null on invalid input (falls through `net.isIPv6` validation first).
 */
export function parseIPv6(ip: string): Uint16Array | null {
  const lower = ip.toLowerCase();
  if (!net.isIPv6(lower)) return null;

  // Expand dotted-quad suffix (e.g. `::ffff:127.0.0.1`) to hex groups
  // (`::ffff:7f00:1`) before the main split-on-`::` pass. The embedded
  // v4 is always the LAST component per RFC 4291.
  let normalized = lower;
  const dq = lower.match(/^(.*:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dq) {
    const [a, b, c, d] = dq[2].split(".").map(Number);
    if ([a, b, c, d].some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
    const hi = (((a << 8) | b) >>> 0).toString(16);
    const lo = (((c << 8) | d) >>> 0).toString(16);
    normalized = (dq[1] ?? "") + `${hi}:${lo}`;
  }

  const parts = normalized.split("::");
  if (parts.length > 2) return null; // at most one `::` compression
  const groups = new Uint16Array(8);

  if (parts.length === 1) {
    // Uncompressed: exactly 8 groups required.
    const hex = parts[0].split(":");
    if (hex.length !== 8) return null;
    for (let i = 0; i < 8; i++) {
      const v = parseInt(hex[i], 16);
      if (Number.isNaN(v) || v < 0 || v > 0xffff) return null;
      groups[i] = v;
    }
    return groups;
  }

  // Compressed: left + zero-fill + right = 8.
  const left = parts[0] === "" ? [] : parts[0].split(":");
  const right = parts[1] === "" ? [] : parts[1].split(":");
  const fill = 8 - left.length - right.length;
  if (fill < 0) return null; // too many groups even with `::` as zero
  let i = 0;
  for (const g of left) {
    const v = parseInt(g, 16);
    if (Number.isNaN(v) || v < 0 || v > 0xffff) return null;
    groups[i++] = v;
  }
  i += fill; // zero-fill from `::`
  for (const g of right) {
    const v = parseInt(g, 16);
    if (Number.isNaN(v) || v < 0 || v > 0xffff) return null;
    groups[i++] = v;
  }
  if (i !== 8) return null;
  return groups;
}

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8 private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // 192.0.0/24, 192.0.2/24
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/**
 * Private-range classifier for IPv6, binary-based (RFC 5952 variant-safe).
 * Fail-closed: unparseable input returns true (treat as private/block).
 *
 * Categories classified as private:
 *   - `::`, `::1` (unspecified / loopback) — early string match
 *   - IPv4-mapped (`::ffff:x:x`) AND IPv4-compatible (`::x:x`, deprecated):
 *     top 80 bits zero, groups[5] ∈ {0xffff, 0x0000}; low 32 bits delegated
 *     to `isPrivateIPv4` via dotted-quad reconstruction
 *   - Unique-local `fc00::/7`
 *   - Link-local `fe80::/10`
 *   - Multicast `ff00::/8`
 *   - Discard-scope `100::/?` — preserves prior `startsWith("100:")` scope
 *     (matches any groups[0] === 0x0100 regardless of lower bits)
 */
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;

  const g = parseIPv6(lower);
  if (!g) return true; // fail-closed on parse failure

  // IPv4-mapped (`::ffff:*`) or IPv4-compatible (`::*`, top 96 bits zero):
  // defer to the IPv4 classifier on the embedded low-32-bit value. This
  // unifies all textual representations — every form that resolves to a
  // private IPv4 address is classified private regardless of how it was
  // written.
  if (
    g[0] === 0 && g[1] === 0 && g[2] === 0 &&
    g[3] === 0 && g[4] === 0 &&
    (g[5] === 0xffff || g[5] === 0)
  ) {
    const hi = g[6];
    const lo = g[7];
    const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateIPv4(dotted);
  }

  const topByte = g[0] >> 8;
  if (topByte === 0xfc || topByte === 0xfd) return true; // ULA fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if (topByte === 0xff) return true; // multicast ff00::/8
  if (g[0] === 0x0100) return true; // discard 100::/? (preserved scope)

  return false;
}

export function isPrivateIpLiteral(ip: string): boolean {
  const bare = ip.startsWith("[") && ip.endsWith("]") ? ip.slice(1, -1) : ip;
  const noZone = bare.split("%")[0];
  if (net.isIPv4(noZone)) return isPrivateIPv4(noZone);
  if (net.isIPv6(noZone)) return isPrivateIPv6(noZone);
  return false;
}

/**
 * Validates the URL host before a network fetch: parses the URL, checks
 * protocol, resolves DNS, and blocks any private/reserved address on ANY
 * resolved record. Returns null if the host should be blocked, or the
 * parsed URL if safe. Used by og-unfurl + og-video-unfurl walkers per hop.
 */
export async function validateHost(rawUrl: string): Promise<URL | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost") return null;

  if (net.isIP(host)) {
    if (isPrivateIpLiteral(host)) return null;
    return parsed;
  }

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
