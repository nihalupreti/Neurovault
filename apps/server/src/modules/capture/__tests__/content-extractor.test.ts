import { describe, it, expect } from "vitest";
import { extractArticle, extractMeta } from "../capture.extractor.js";

const SAMPLE_ARTICLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Article Title</title>
  <meta property="og:description" content="A great article about testing.">
</head>
<body>
  <header><nav>Navigation</nav></header>
  <article>
    <h1>Test Article Title</h1>
    <p>This is the first paragraph of the article with substantial content that should be extracted by readability.</p>
    <p>This is the second paragraph with more meaningful content that adds to the article length so readability considers it worth extracting.</p>
    <p>And a third paragraph to ensure we have enough textual content for the readability algorithm to work with properly.</p>
  </article>
  <footer>Footer stuff</footer>
</body>
</html>
`;

const SAMPLE_BOOKMARK_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Cool Video - YouTube</title>
  <meta property="og:title" content="Cool Video">
  <meta property="og:description" content="Watch this cool video about programming">
  <meta name="description" content="A cool video fallback description">
</head>
<body><div id="app"></div></body>
</html>
`;

describe("extractArticle", () => {
  it("extracts title and text content from article HTML", () => {
    const result = extractArticle(SAMPLE_ARTICLE_HTML);
    expect(result.title).toBe("Test Article Title");
    expect(result.content.length).toBeGreaterThan(50);
    expect(result.content).toContain("first paragraph");
  });

  it("returns empty content for non-article HTML", () => {
    const result = extractArticle("<html><body><div>tiny</div></body></html>");
    expect(result.content.length).toBeLessThan(50);
  });
});

describe("extractMeta", () => {
  it("extracts og:title and og:description", () => {
    const result = extractMeta(SAMPLE_BOOKMARK_HTML);
    expect(result.title).toBe("Cool Video");
    expect(result.description).toBe("Watch this cool video about programming");
  });

  it("falls back to <title> when no og:title", () => {
    const html = `<html><head><title>Page Title</title></head><body></body></html>`;
    const result = extractMeta(html);
    expect(result.title).toBe("Page Title");
  });

  it("falls back to meta name=description when no og:description", () => {
    const html = `<html><head><title>X</title><meta name="description" content="fallback desc"></head><body></body></html>`;
    const result = extractMeta(html);
    expect(result.description).toBe("fallback desc");
  });

  it("returns empty strings for HTML with no meta", () => {
    const result = extractMeta("<html><head></head><body></body></html>");
    expect(result.title).toBe("");
    expect(result.description).toBe("");
  });
});
