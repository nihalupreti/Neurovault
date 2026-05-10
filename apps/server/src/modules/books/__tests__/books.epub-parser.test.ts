import { describe, it, expect, beforeAll } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { parseEpub } from "../books.epub-parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, "fixtures/test.epub");

describe("parseEpub", () => {
  let result: Awaited<ReturnType<typeof parseEpub>>;

  beforeAll(async () => {
    if (!existsSync(FIXTURE_PATH)) {
      throw new Error("Run create-test-epub.ts first");
    }
    result = await parseEpub(FIXTURE_PATH, "test-book-id");
  });

  it("extracts metadata", () => {
    expect(result.metadata.title).toBe("Test EPUB Book");
    expect(result.metadata.author).toBe("Test Author");
    expect(result.metadata.publisher).toBe("Test Publisher");
    expect(result.metadata.description).toBe("A test book for unit testing");
    expect(result.metadata.language).toBe("en");
  });

  it("extracts chapters in spine order", () => {
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]!.title).toBe("Introduction");
    expect(result.chapters[1]!.title).toBe("Advanced Topics");
  });

  it("extracts chapter HTML content", () => {
    expect(result.chapters[0]!.htmlContent).toContain("Welcome to the test book");
    expect(result.chapters[0]!.htmlContent).toContain("<p>");
  });

  it("extracts plain text per chapter", () => {
    expect(result.chapters[0]!.plainText).toContain("Welcome to the test book");
    expect(result.chapters[0]!.plainText).not.toContain("<p>");
  });

  it("extracts sections with anchors", () => {
    expect(result.chapters[0]!.sections).toEqual([
      { anchor: "intro", title: "Introduction", level: 1 },
      { anchor: "setup", title: "Getting Started", level: 2 },
    ]);
  });

  it("extracts and scopes CSS per chapter", () => {
    expect(result.chapters[0]!.scopedCss).toContain(".epub-content");
    expect(result.chapters[0]!.scopedCss).not.toContain("body {");
  });

  it("rewrites image src to asset endpoint", () => {
    expect(result.chapters[0]!.htmlContent).toContain(
      "/api/books/test-book-id/assets/images/cover.png",
    );
  });

  it("extracts cover image info", () => {
    expect(result.assets.coverFilename).toMatch(/cover\.png/);
  });

  it("extracts image assets", () => {
    expect(result.assets.images.length).toBeGreaterThanOrEqual(1);
    expect(result.assets.images[0]!.filename).toContain("cover.png");
    expect(result.assets.images[0]!.data).toBeInstanceOf(Buffer);
  });
});
