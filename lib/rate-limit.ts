/**
 * /lib/rate-limit.ts — High-Performance In-Memory Sliding Window Rate Limiter
 *
 * Protects AI generation, authentication, and creation endpoints against
 * brute-force attacks, denial-of-service, and quota exhaustion.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 300000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check and record a request under the sliding window rate limiter.
 *
 * @param key Unique identifier (e.g., `ip + ':' + endpoint` or `userId`)
 * @param limit Max allowed requests within windowMs
 * @param windowMs Time window in milliseconds (default: 60,000ms / 1 min)
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within the rolling window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestTimestamp);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Record current request
  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Helper to extract client IP address from Next.js request headers.
 *
 * x-forwarded-for is client-controlled unless a trusted reverse proxy
 * overwrites it, so it is only honoured when env TRUSTED_PROXY=1.
 * Otherwise falls back to x-real-ip, then the constant 'unknown'.
 */
export function getClientIp(request: Request): string {
  if (process.env.TRUSTED_PROXY === '1') {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const first = forwardedFor?.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

