import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkEmailRateLimit, resetForTesting } from "../capture.email-rate-limiter.js";

describe("checkEmailRateLimit", () => {
  beforeEach(() => {
    resetForTesting();
  });

  it("allows requests under the limit", () => {
    const result = checkEmailRateLimit();
    expect(result.allowed).toBe(true);
  });

  it("tracks count correctly", () => {
    for (let i = 0; i < 10; i++) {
      checkEmailRateLimit();
    }
    const result = checkEmailRateLimit();
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(39); // 50 - 11
  });

  it("rejects when limit is reached", () => {
    for (let i = 0; i < 50; i++) {
      checkEmailRateLimit();
    }
    const result = checkEmailRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after an hour", () => {
    for (let i = 0; i < 50; i++) {
      checkEmailRateLimit();
    }
    expect(checkEmailRateLimit().allowed).toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 3600 * 1000 + 1);

    const result = checkEmailRateLimit();
    expect(result.allowed).toBe(true);

    vi.useRealTimers();
  });
});
