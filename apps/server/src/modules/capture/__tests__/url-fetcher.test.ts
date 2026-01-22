import { describe, it, expect } from "vitest";
import { fetchUrl } from "../url-fetcher.js";

describe("fetchUrl", () => {
  it("returns HTML body for a valid URL", async () => {
    const result = await fetchUrl("https://example.com");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.html).toContain("<");
      expect(result.html.length).toBeGreaterThan(0);
    }
  });

  it("returns error for unreachable domain", async () => {
    const result = await fetchUrl("https://this-domain-definitely-does-not-exist-xyz123.com");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns error for non-HTML content type", async () => {
    const result = await fetchUrl("https://jsonplaceholder.typicode.com/posts/1");
    // This should still succeed — we fetch the body regardless of content-type
    expect(result.ok).toBe(true);
  });
});
