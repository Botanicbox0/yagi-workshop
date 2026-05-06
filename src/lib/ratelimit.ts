import "server-only";

// Wave C v2 — Upstash Ratelimit primitives for the public submit + presign
// surfaces. Per SPEC §3 HIGH-1 + §4 MED-3.
//
// Buckets:
//   - submitByIp:        per-IP 5 / hour  (HIGH-1, blocks spam at the edge)
//   - submitByEmail:     per-email 3 / hour (HIGH-1, blocks per-victim invite spam)
//   - submitByCampaignIp:per-(campaign,IP) 3 / hour (HIGH-1, per-campaign throttle)
//   - presignByIp:       per-IP 10 / hour (MED-3, R2 storage abuse)
//
// All buckets share one Upstash Redis instance configured via env. If env is
// missing we noop (dev-mode friendly) — production must have UPSTASH_*
// configured per Vercel project setup.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
let initAttempted = false;

function getRedis(): Redis | null {
  if (initAttempted) return redis;
  initAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing — rate limiting disabled (dev-mode).",
    );
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

// Lazy-instantiate each limiter so cold-start cost is paid once per bucket
// the first time it's used.
let _submitByIp: Ratelimit | null = null;
let _submitByEmail: Ratelimit | null = null;
let _submitByCampaignIp: Ratelimit | null = null;
let _presignByIp: Ratelimit | null = null;

function buildLimiter(prefix: string, max: number, windowSec: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
    prefix,
    analytics: false,
  });
}

function submitByIp(): Ratelimit | null {
  if (_submitByIp) return _submitByIp;
  _submitByIp = buildLimiter("rl:wave-c-v2:submit:ip", 5, 3600);
  return _submitByIp;
}

function submitByEmail(): Ratelimit | null {
  if (_submitByEmail) return _submitByEmail;
  _submitByEmail = buildLimiter("rl:wave-c-v2:submit:email", 3, 3600);
  return _submitByEmail;
}

function submitByCampaignIp(): Ratelimit | null {
  if (_submitByCampaignIp) return _submitByCampaignIp;
  _submitByCampaignIp = buildLimiter("rl:wave-c-v2:submit:campaign-ip", 3, 3600);
  return _submitByCampaignIp;
}

function presignByIp(): Ratelimit | null {
  if (_presignByIp) return _presignByIp;
  _presignByIp = buildLimiter("rl:wave-c-v2:presign:ip", 10, 3600);
  return _presignByIp;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; reason: "ip" | "email" | "campaign_ip" };

export async function checkSubmitLimits(args: {
  ip: string;
  email: string;
  campaignId: string;
}): Promise<RateLimitResult> {
  const ipLim = submitByIp();
  const emailLim = submitByEmail();
  const campIpLim = submitByCampaignIp();

  // If any limiter is null (dev/no-env), short-circuit allow. In production,
  // env must be present so the early `getRedis()` warning surfaces a misconfig.
  if (!ipLim || !emailLim || !campIpLim) return { ok: true };

  const ipResult = await ipLim.limit(args.ip);
  if (!ipResult.success) {
    return {
      ok: false,
      reason: "ip",
      retryAfterSeconds: secondsUntilReset(ipResult.reset),
    };
  }
  const emailResult = await emailLim.limit(args.email.toLowerCase());
  if (!emailResult.success) {
    return {
      ok: false,
      reason: "email",
      retryAfterSeconds: secondsUntilReset(emailResult.reset),
    };
  }
  const campIpResult = await campIpLim.limit(`${args.campaignId}:${args.ip}`);
  if (!campIpResult.success) {
    return {
      ok: false,
      reason: "campaign_ip",
      retryAfterSeconds: secondsUntilReset(campIpResult.reset),
    };
  }
  return { ok: true };
}

export async function checkPresignLimit(args: {
  ip: string;
}): Promise<RateLimitResult> {
  const lim = presignByIp();
  if (!lim) return { ok: true };
  const result = await lim.limit(args.ip);
  if (!result.success) {
    return {
      ok: false,
      reason: "ip",
      retryAfterSeconds: secondsUntilReset(result.reset),
    };
  }
  return { ok: true };
}

function secondsUntilReset(resetEpochMs: number): number {
  const diffMs = resetEpochMs - Date.now();
  return Math.max(1, Math.ceil(diffMs / 1000));
}
