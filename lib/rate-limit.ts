/**
 * In-memory token-bucket rate limiter.
 * Designed for 10k+ users/hour throughput.
 * Replace with Redis (e.g. @upstash/ratelimit) for multi-instance deployments.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    /** Maximum burst capacity */
    private maxTokens: number,
    /** Tokens replenished per second */
    private refillRate: number,
  ) {
    // Prune stale entries every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60_000);
    // Don't keep the process alive just for cleanup
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /** Try to consume one token. Returns true if allowed, false if rate-limited. */
  consume(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) {
      this.buckets.set(key, { tokens: this.maxTokens - 1, lastRefill: now });
      return true;
    }

    // Refill based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsed * this.refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  remaining(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.maxTokens;
    const elapsed = (Date.now() - bucket.lastRefill) / 1000;
    return Math.min(this.maxTokens, Math.floor(bucket.tokens + elapsed * this.refillRate));
  }

  private cleanup() {
    const now = Date.now();
    // If a bucket has been idle long enough to fully refill, drop it
    const staleMs = (this.maxTokens / this.refillRate) * 1000 * 2;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > staleMs) {
        this.buckets.delete(key);
      }
    }
  }
}

/* ── Pre-configured limiters for 10 000 users / hour ── */

// Per-user: 30 burst, refills 0.5 /sec → steady 30 msgs/min
export const userLimiter = new RateLimiter(30, 0.5);

// Global: 500 burst, refills ~55 /sec → ≈ 200 000 msgs/hour ceiling
export const globalLimiter = new RateLimiter(500, 55);
