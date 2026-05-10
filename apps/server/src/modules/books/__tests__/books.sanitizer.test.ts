import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../books.sanitizer.js";

describe("sanitizeHtml", () => {
  it("strips script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe("<p>Hello</p>");
  });

  it("strips event handlers", () => {
    const input = '<img src="x.png" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
    expect(result).toContain("src");
  });

  it("strips style tags (CSS handled separately)", () => {
    const input = "<style>body{color:red}</style><p>Text</p>";
    expect(sanitizeHtml(input)).toBe("<p>Text</p>");
  });

  it("strips iframe and object tags", () => {
    const input = '<iframe src="evil.com"></iframe><object data="x"></object><p>Safe</p>';
    expect(sanitizeHtml(input)).toBe("<p>Safe</p>");
  });

  it("strips javascript: URIs", () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("strips data: attributes", () => {
    const input = '<div data-evil="payload">Content</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("data-evil");
    expect(result).toContain("Content");
  });

  it("preserves allowed tags and attributes", () => {
    const input = '<p class="intro"><strong>Bold</strong> <a href="https://x.com">Link</a></p>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("preserves SVG elements", () => {
    const input = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3"/></svg>';
    const result = sanitizeHtml(input);
    expect(result).toContain("<svg");
    expect(result).toContain("<circle");
  });

  it("preserves img tags with safe src", () => {
    const input = '<img src="/api/books/123/assets/img.png" alt="test">';
    const result = sanitizeHtml(input);
    expect(result).toContain('src="/api/books/123/assets/img.png"');
  });
});
