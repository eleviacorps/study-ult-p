/**
 * Best-effort in-memory token bucket rate limiter.
 *
 * ⚠️  Vercel Edge Functions are ephemeral — this state resets on cold starts.
 *     For production-grade rate limiting, integrate @upstash/ratelimit with Redis.
 *
 * Usage:
 *   import { checkRateLimit } from "@/lib/rate-limiter";
 *
 *   const result = checkRateLimit(userId, { maxRequests: 20, windowMs: 60_000 });
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: "rate_limited" }, { status: 429 });
 *   }
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 300_000;
let lastCleanup = Date.now();

function cleanupStale(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > CLEANUP_INTERVAL * 2) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 20, windowMs: 60_000 }
): { allowed: boolean; remaining: number; resetMs: number } {
  cleanupStale();

  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxRequests, lastRefill: now };
    buckets.set(key, bucket);
    return { allowed: true, remaining: bucket.tokens, resetMs: config.windowMs };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const refillTokens = Math.floor((elapsed / config.windowMs) * config.maxRequests);
  if (refillTokens > 0) {
    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + refillTokens);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    const resetMs = config.windowMs - (now - bucket.lastRefill);
    return { allowed: false, remaining: 0, resetMs: Math.max(1, resetMs) };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens, resetMs: config.windowMs - (now - bucket.lastRefill) };
}
