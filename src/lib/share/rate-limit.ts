import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Distributed rate limiter for public share endpoints, backed by Upstash Redis.
 * Replaces the previous per-instance in-memory map. Fixed 1-hour window,
 * keyed by `${ip}:${action}`. Fail-open on Redis errors so a transient outage
 * cannot lock out legitimate share traffic.
 */

let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

const limiters = new Map<number, Ratelimit>();
function limiterFor(limitPerHour: number): Ratelimit {
  let limiter = limiters.get(limitPerHour);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(limitPerHour, "1 h"),
      prefix: "share-ratelimit",
      analytics: false,
    });
    limiters.set(limitPerHour, limiter);
  }
  return limiter;
}

export async function checkRateLimit(
  key: string,
  limitPerHour: number,
): Promise<{ ok: boolean; remaining: number }> {
  try {
    const { success, remaining } = await limiterFor(limitPerHour).limit(key);
    return { ok: success, remaining };
  } catch (err) {
    console.error("[rate-limit] upstash unreachable, allowing request:", err);
    return { ok: true, remaining: limitPerHour };
  }
}

export function getClientIp(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0]?.trim() || "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
