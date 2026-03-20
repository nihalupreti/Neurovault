const MAX_PER_HOUR = 50;

let count = 0;
let windowStart = Date.now();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function checkEmailRateLimit(): RateLimitResult {
  const now = Date.now();
  if (now - windowStart >= 3600 * 1000) {
    count = 0;
    windowStart = now;
  }

  if (count >= MAX_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  count++;
  return { allowed: true, remaining: MAX_PER_HOUR - count };
}

export function resetForTesting(): void {
  count = 0;
  windowStart = Date.now();
}
