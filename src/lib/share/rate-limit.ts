/**
 * In-memory rate limiter for public share endpoints.
 *
 * Uses a simple sliding-window-per-hour approach keyed by
 * `${ip}:${action}` (e.g. `"1.2.3.4:reactions"`).
 *
 * NOTE: This is per-instance only — a horizontally scaled deployment
 * (Vercel Edge with multiple regions) will not deduplicate across instances.
 * Replace buckets with a Redis INCR + EXPIRE call when cross-region dedup
 * is required.
 */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  limitPerHour: number,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const w = buckets.get(key);

  if (!w || w.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 3_600_000 });
    return { ok: true, remaining: limitPerHour - 1 };
  }

  if (w.count >= limitPerHour) {
    return { ok: false, remaining: 0 };
  }

  w.count++;
  return { ok: true, remaining: limitPerHour - w.count };
}

/**
 * Extract the client IP from an incoming Next.js Request.
 *
 * Prefers Vercel's platform-set `x-vercel-forwarded-for` header (the only
 * value the runtime guarantees is set by the edge and not user-controlled).
 * On non-Vercel hosts, falls back to the platform's first-hop x-real-ip.
 *
 * IMPORTANT: Caller-supplied `x-forwarded-for` is intentionally NOT consulted
 * — clients can spoof it, which would let attackers rotate the rate-limit key.
 */
export function getClientIp(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0]?.trim() || "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
