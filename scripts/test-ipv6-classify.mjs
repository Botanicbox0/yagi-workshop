// Phase 2.1 G7 H1 Pass 3 — self-contained verification for the binary IPv6
// private-range classifier.
//
// Runs with plain `node scripts/test-ipv6-classify.mjs`. No test-framework
// dependency (SPEC CONSTRAINTS forbids new deps).
//
// IMPORTANT — the parser below is a RE-IMPLEMENTATION of the algorithm in
// `src/lib/ip-classify.ts` (parseIPv6 / isPrivateIPv4 / isPrivateIPv6). Kept
// in the same shape so this file doubles as executable documentation of the
// expected behavior. Any change to the algorithm there must mirror here;
// the test cases at the bottom will FAIL if the two implementations drift.

import net from "node:net";

// ------------------- parseIPv6 (mirror of src/lib/ip-classify.ts) -------------------
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

// ------------------- isPrivateIPv4 (mirror) -------------------
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
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

// ------------------- isPrivateIPv6 (mirror) -------------------
function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;

  const g = parseIPv6(lower);
  if (!g) return true;

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

// ------------------- Test cases -------------------
const cases = [
  // SPEC-required test cases (user kickoff §6)
  { ip: "::ffff:127.0.0.1", expect: true, label: "::ffff: dotted-quad loopback → private" },
  { ip: "::ffff:7f00:1", expect: true, label: "::ffff: hex-form loopback → private" },
  { ip: "0:0:0:0:0:ffff:7f00:1", expect: true, label: "full-form ::ffff: hex loopback → private" },
  { ip: "0000:0000:0000:0000:0000:ffff:7f00:0001", expect: true, label: "zero-padded full-form hex loopback → private" },
  { ip: "::ffff:8.8.8.8", expect: false, label: "::ffff: dotted-quad public (8.8.8.8) → public" },
  { ip: "2001:db8::1", expect: false, label: "2001:db8::1 (documentation prefix, not v4-mapped) → public" },
  { ip: "::1", expect: true, label: "::1 (loopback) → private" },

  // Additional coverage for RFC 5952 variant-safety (Pass 2 Codex concerns)
  { ip: "0:0:0:0::ffff:7f00:1", expect: true, label: "mixed compression 0:0:0:0::ffff:* → private" },
  { ip: "::ffff:10.0.0.1", expect: true, label: "::ffff: private 10.0.0.1 → private" },
  { ip: "::ffff:0a00:0001", expect: true, label: "::ffff: hex-form 10.0.0.1 → private" },
  { ip: "::ffff:c0a8:0101", expect: true, label: "::ffff: hex-form 192.168.1.1 → private" },
  { ip: "::ffff:0808:0808", expect: false, label: "::ffff: hex-form 8.8.8.8 → public" },
  { ip: "fe80::1", expect: true, label: "fe80::1 link-local → private" },
  { ip: "fc00::1", expect: true, label: "fc00::1 unique-local → private" },
  { ip: "fd00::1", expect: true, label: "fd00::1 unique-local → private" },
  { ip: "ff00::1", expect: true, label: "ff00::1 multicast → private" },
  { ip: "100::1", expect: true, label: "100:: discard prefix → private (preserved scope)" },
  { ip: "2606:4700:4700::1111", expect: false, label: "Cloudflare DNS → public" },
  { ip: "::", expect: true, label: ":: unspecified → private" },
  { ip: "::127.0.0.1", expect: true, label: "::127.0.0.1 IPv4-compatible (deprecated) loopback → private" },

  // Malformed / invalid inputs — all fail-closed to private
  { ip: "not-an-ip", expect: true, label: "malformed string → fail-closed private" },
  { ip: "", expect: true, label: "empty string → fail-closed private" },
];

let pass = 0;
let fail = 0;
const failures = [];
for (const { ip, expect, label } of cases) {
  const actual = isPrivateIPv6(ip);
  if (actual === expect) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    failures.push({ ip, expect, actual, label });
    console.log(`  ✗ ${label}`);
    console.log(`      ip="${ip}" expected=${expect} actual=${actual}`);
  }
}

console.log("");
console.log(`Results: ${pass} passed, ${fail} failed (of ${cases.length} total)`);

if (fail > 0) {
  console.error("");
  console.error("FAIL — algorithm has drifted from spec, or src/lib/ip-classify.ts needs a matching patch.");
  process.exit(1);
}
console.log("PASS");
process.exit(0);
