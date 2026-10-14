/**
 * Lightweight, in-memory sliding-window rate limiter for serverless API routes.
 * Defends against brute-force authentication attacks and API flooding.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number; // Unix timestamp ms
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupIntervalMs = 60 * 1000; // clean expired entries every 1 min
  private lastCleanup = Date.now();

  constructor() {
    // Periodic garbage collection of expired keys
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), this.cleanupIntervalMs).unref?.();
    }
  }

  /**
   * Checks if an identifier exceeds the rate limit.
   * @param key Unique identifier (e.g. `login_${ip}` or `ai_${userId}`)
   * @param maxRequests Maximum requests allowed within the window
   * @param windowMs Window duration in milliseconds
   */
  public check(
    key: string,
    maxRequests: number,
    windowMs: number
  ): {
    allowed: boolean;
    remaining: number;
    resetMs: number;
    totalLimit: number;
  } {
    const now = Date.now();
    this.maybeCleanup(now);

    const record = this.store.get(key);

    if (!record || now >= record.resetAt) {
      // New or expired window
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetMs: windowMs,
        totalLimit: maxRequests,
      };
    }

    if (record.count >= maxRequests) {
      // Limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, record.resetAt - now),
        totalLimit: maxRequests,
      };
    }

    // Increment request count within active window
    record.count++;
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - record.count),
      resetMs: Math.max(0, record.resetAt - now),
      totalLimit: maxRequests,
    };
  }

  /**
   * Resets rate limit for a specific key (e.g. after successful authentication).
   */
  public reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clears the entire store (useful for automated testing).
   */
  public clear(): void {
    this.store.clear();
  }

  private maybeCleanup(now: number): void {
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup();
      this.lastCleanup = now;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

export const rateLimiter = new InMemoryRateLimiter();

/**
 * Extracts client IP from standard reverse-proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

