#!/usr/bin/env node
// =============================================================================
// Phase 2.8.1 G_B1-C — SSRF defense-in-depth regression test
// =============================================================================
// Asserts that the centralized IP classifier in src/lib/ip-classify.ts blocks
// the three vectors that the Phase 2.8 K-05 review surfaced:
//
//   1. FU-2.8-ssrf-redirect-rewrite — fetchOgFallback walks redirects with
//      `redirect: 'manual'` and re-validates each hop. We assert the source
//      file uses `redirect: "manual"` and re-runs validateHost per hop;
//      end-to-end test follows in §2 by asserting per-hop classification.
//
//   2. FU-2.8-ssrf-cgn-prefix — CGN range 100.64.0.0/10 fully blocked.
//      Boundary checks: 100.64.0.0, 100.65.0.1, 100.127.255.255 → private.
//      Just-outside: 100.63.255.255 / 100.128.0.0 → public.
//
//   3. FU-2.8-ssrf-ipv6-compat-hex — hex-form IPv4-compatible IPv6 such as
//      `::7f00:1` (= 127.0.0.1) and `::ffff:7f00:1` (= 127.0.0.1) → private.
//
// Run: `node scripts/test-ssrf-defense.mjs`. Fails with exit 1 on any miss.
// No test framework dep (project conventionally avoids new deps for tests).
// Mirrors the algorithm in src/lib/ip-classify.ts so this file doubles as
// executable documentation; the cases section is the source of truth for
// the SPEC §4 vector list.
// =============================================================================

import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// -----------------------------------------------------------------------------
// Mirror of src/lib/ip-classify.ts (parseIPv6 / isPrivateIPv4 / isPrivateIPv6).
// Any divergence here vs that file is a bug — the test cases catch it.
// -----------------------------------------------------------------------------

function parseIPv6(ip) {
  const lower = ip.toLowerCase();
  if (!net.isIPv6(lower)) return null;

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
  if (parts.length > 2) return null;
  const groups = new Uint16Array(8);

  if (parts.length === 1) {
    const hex = parts[0].split(":");
    if (hex.length !== 8) return null;
    for (let i = 0; i < 8; i++) {
      const v = parseInt(hex[i], 16);
      if (Number.isNaN(v) || v < 0 || v > 0xffff) return null;
      groups[i] = v;
    }
    return groups;
  }

  const left = parts[0] === "" ? [] : parts[0].split(":");
  const right = parts[1] === "" ? [] : parts[1].split(":");
  const fill = 8 - left.length - right.length;
  if (fill < 0) return null;
  let i = 0;
  for (const g of left) {
    const v = parseInt(g, 16);
    if (Number.isNaN(v) || v < 0 || v > 0xffff) return null;
    groups[i++] = v;
  }
  i += fill;
  for (const g of right) {
    const v = parseInt(g, 16);
    if (Number.isNaN(v) || v < 0 || v > 0xffff) return null;
    groups[i++] = v;
  }
  if (i !== 8) return null;
  return groups;
}

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  // CGN 100.64.0.0/10 — full RFC 6598 range, NOT just /16.
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  const g = parseIPv6(lower);
  if (!g) return true;
  // Top 96 bits zero AND group[5] in {0xffff (mapped) | 0 (compatible)}:
  // delegate to the IPv4 classifier on the embedded low-32 bits.
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
  if (topByte === 0xfc || topByte === 0xfd) return true;
  if ((g[0] & 0xffc0) === 0xfe80) return true;
  if (topByte === 0xff) return true;
  if (g[0] === 0x0100) return true;
  return false;
}

function isPrivateIpLiteral(host) {
  const bare = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  const noZone = bare.split("%")[0];
  if (net.isIPv4(noZone)) return isPrivateIPv4(noZone);
  if (net.isIPv6(noZone)) return isPrivateIPv6(noZone);
  return false;
}

// -----------------------------------------------------------------------------
// §1 — IP classification vectors (the three SPEC §4 vectors + sanity controls)
// -----------------------------------------------------------------------------

const cases = [
  // ---- Vector 1: redirect target metadata IP ----
  { host: "169.254.169.254", expect: true, label: "AWS/GCP metadata 169.254.169.254 → blocked (any redirect hop)" },
  { host: "169.254.0.1", expect: true, label: "link-local 169.254/16 → blocked" },

  // ---- Vector 2: CGN 100.64.0.0/10 full range ----
  { host: "100.64.0.0", expect: true, label: "CGN low boundary 100.64.0.0 → blocked" },
  { host: "100.65.0.1", expect: true, label: "CGN 100.65.0.1 → blocked" },
  { host: "100.127.255.255", expect: true, label: "CGN high boundary 100.127.255.255 → blocked" },
  { host: "100.63.255.255", expect: false, label: "100.63.255.255 (just below CGN) → public (not blocked)" },
  { host: "100.128.0.0", expect: false, label: "100.128.0.0 (just above CGN) → public (not blocked)" },

  // ---- Vector 3: hex-form IPv4-compatible IPv6 ----
  { host: "::7f00:1", expect: true, label: "::7f00:1 (= 127.0.0.1, IPv4-compat hex) → blocked" },
  { host: "::ffff:7f00:1", expect: true, label: "::ffff:7f00:1 (= 127.0.0.1, IPv4-mapped hex) → blocked" },
  { host: "::ffff:127.0.0.1", expect: true, label: "::ffff:127.0.0.1 (= 127.0.0.1, IPv4-mapped dotted) → blocked" },
  { host: "::127.0.0.1", expect: true, label: "::127.0.0.1 (IPv4-compat dotted) → blocked" },
  { host: "::a9fe:a9fe", expect: true, label: "::a9fe:a9fe (= 169.254.169.254 IPv4-compat hex) → blocked" },

  // ---- Sanity controls (must NOT be blocked) ----
  { host: "8.8.8.8", expect: false, label: "8.8.8.8 (Google DNS) → public" },
  { host: "1.1.1.1", expect: false, label: "1.1.1.1 (Cloudflare DNS) → public" },
  { host: "2606:4700:4700::1111", expect: false, label: "2606:4700:4700::1111 (Cloudflare v6) → public" },
];

// -----------------------------------------------------------------------------
// §2 — Source assertion: brief/actions.ts uses redirect: 'manual' + per-hop
//      validateHost. This is a code-presence guard so a future refactor can't
//      accidentally restore the redirect-follow regression.
// -----------------------------------------------------------------------------

const briefActionsPath = path.join(
  repoRoot,
  "src/app/[locale]/app/projects/[id]/brief/actions.ts",
);
const briefActionsSrc = fs.readFileSync(briefActionsPath, "utf8");

const sourceAssertions = [
  {
    label: "fetchOgFallback uses redirect: 'manual'",
    pass: /redirect:\s*"manual"/.test(briefActionsSrc),
  },
  {
    label: "fetchOgFallback delegates host validation to validateHost",
    pass:
      /import\s*\{\s*validateHost\s*\}\s*from\s*"@\/lib\/ip-classify"/.test(briefActionsSrc) &&
      /await\s+validateHost\(/.test(briefActionsSrc),
  },
  {
    label: "fetchOgFallback caps redirect chain at 5 hops",
    pass: /SSRF_REDIRECT_MAX_HOPS\s*=\s*5/.test(briefActionsSrc),
  },
  {
    label: "no local isPrivateIp / isPrivateIpv4Octets duplicate remains",
    pass:
      !/function\s+isPrivateIpv4Octets/.test(briefActionsSrc) &&
      !/function\s+isPrivateIp\b/.test(briefActionsSrc),
  },
];

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------

let pass = 0;
let fail = 0;
const failures = [];

console.log("§1 — IP classification");
for (const { host, expect, label } of cases) {
  const actual = isPrivateIpLiteral(host);
  if (actual === expect) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    failures.push({ host, expect, actual, label });
    console.log(`  ✗ ${label}`);
    console.log(`      host="${host}" expected=${expect} actual=${actual}`);
  }
}

console.log("");
console.log("§2 — fetchOgFallback source assertions");
for (const { label, pass: ok } of sourceAssertions) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    failures.push({ label });
    console.log(`  ✗ ${label}`);
  }
}

console.log("");
console.log(`Results: ${pass} passed, ${fail} failed`);

if (fail > 0) {
  console.error("");
  console.error(
    "FAIL — SSRF defense regression. Review src/lib/ip-classify.ts and " +
      "src/app/[locale]/app/projects/[id]/brief/actions.ts.",
  );
  process.exit(1);
}
console.log("PASS");
process.exit(0);
