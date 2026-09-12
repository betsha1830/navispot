import { describe, it, expect } from 'vitest';
import { RateLimiter, spotifyRateLimiter, backgroundRateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  it('allows up to maxRequests within the window', async () => {
    const limiter = new RateLimiter(3, 10_000);
    // Should not block or throw for the first 3 acquisitions.
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.getRemainingRequests()).toBe(0);
  });

  it('reports remaining requests and reset time', async () => {
    const limiter = new RateLimiter(2, 60_000);
    await limiter.acquire();
    expect(limiter.getRemainingRequests()).toBe(1);
    const reset = limiter.getResetTime();
    expect(reset).toBeGreaterThan(0);
    expect(reset).toBeLessThanOrEqual(60_000);
  });

  it('background limiter is slower than the foreground limiter', () => {
    // Regression guard: background enrichment (playlist created dates) must
    // never be allowed a higher request rate than foreground user-initiated
    // work. Previously background was 50/30s (100/min) vs foreground 30/min.
    const perMinute = (l: RateLimiter) =>
      (l['maxRequests'] / l['windowMs']) * 60_000;
    expect(perMinute(backgroundRateLimiter)).toBeLessThanOrEqual(
      perMinute(spotifyRateLimiter),
    );
  });
});
