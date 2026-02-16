import { describe, it, expect } from "vitest";
import { formatArticleNote, formatBookmarkNote, formatRawNote, generateFilename } from "../note-formatter.js";

describe("formatArticleNote", () => {
  it("generates markdown with frontmatter for article", () => {
    const result = formatArticleNote({
      source: "https://example.com/post",
      title: "My Article",
      content: "This is the article body.",
      captured: "2025-03-20T10:30:00Z",
    });
    expect(result).toContain("---");
    expect(result).toContain("source: https://example.com/post");
    expect(result).toContain('title: "My Article"');
    expect(result).toContain("type: article");
    expect(result).toContain("# My Article");
    expect(result).toContain("This is the article body.");
  });
});

describe("formatBookmarkNote", () => {
  it("generates markdown with frontmatter for bookmark", () => {
    const result = formatBookmarkNote({
      source: "https://youtube.com/watch?v=abc",
      title: "Cool Video",
      description: "A video about things",
      captured: "2025-03-20T10:30:00Z",
    });
    expect(result).toContain("---");
    expect(result).toContain("source: https://youtube.com/watch?v=abc");
    expect(result).toContain('title: "Cool Video"');
    expect(result).toContain("type: bookmark");
    expect(result).toContain("# Cool Video");
    expect(result).toContain("[Source](https://youtube.com/watch?v=abc)");
    expect(result).toContain("> A video about things");
  });

  it("handles missing description gracefully", () => {
    const result = formatBookmarkNote({
      source: "https://x.com/user/status/123",
      title: "A Tweet",
      description: "",
      captured: "2025-03-20T10:30:00Z",
    });
    expect(result).toContain("# A Tweet");
    expect(result).not.toContain("> ");
  });
});

describe("formatRawNote", () => {
  it("wraps raw text as markdown without frontmatter", () => {
    const result = formatRawNote("This is a quick thought I had.");
    expect(result).toBe("This is a quick thought I had.");
  });

  it("preserves markdown formatting", () => {
    const input = "# Heading\n\nSome **bold** text.";
    expect(formatRawNote(input)).toBe(input);
  });
});

describe("generateFilename", () => {
  it("generates filename from title", () => {
    const result = generateFilename("My Article Title");
    expect(result).toBe("My Article Title.md");
  });

  it("truncates long titles to 50 chars", () => {
    const long = "A".repeat(80);
    const result = generateFilename(long);
    expect(result.length).toBeLessThanOrEqual(53); // 50 + .md
    expect(result).toMatch(/\.md$/);
  });

  it("sanitizes special characters", () => {
    const result = generateFilename("File: with/slashes & <special>");
    expect(result).not.toContain("/");
    expect(result).not.toContain(":");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("falls back to timestamp-based name for empty title", () => {
    const result = generateFilename("");
    expect(result).toMatch(/^capture-\d+\.md$/);
  });
});
