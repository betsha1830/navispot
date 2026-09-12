export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 30, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  private cleanup(): void {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
  }

  async acquire(): Promise<void> {
    this.cleanup();

    while (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.cleanup();
    }

    this.requests.push(Date.now());
  }

  getRemainingRequests(): number {
    this.cleanup();
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }
}

// Foreground: user-visible requests (playlist/track fetches, exports).
// Spotify does not publish exact rolling-window numbers, but development-mode
// quota buckets are small, so we stay conservative.
export const spotifyRateLimiter = new RateLimiter(30, 60000);

// Background: non-critical enrichment (playlist created dates) via the
// getPlaylistCreatedDate endpoint. Deliberately slower than the foreground
// limiter so background fetches cannot starve or trip rate limits for
// user-initiated work. Dates are cached, so the slower pace is fine.
export const backgroundRateLimiter = new RateLimiter(20, 60000);
