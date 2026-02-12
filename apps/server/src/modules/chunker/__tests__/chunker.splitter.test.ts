import { describe, it, expect } from "vitest";
import { flattenSections, splitSectionIntoChunks } from "../chunker.splitter.js";
import type { ContentNode, SectionBlock } from "../parsers/parser.types.js";

describe("flattenSections", () => {
  it("flattens a single section with content", () => {
    const tree: ContentNode = {
      type: "root",
      content: "",
      children: [
        {
          type: "section",
          heading: "Auth",
          headingLevel: 1,
          content: "",
          children: [{ type: "paragraph", content: "JWT tokens.", children: [] }],
        },
      ],
    };
    const sections = flattenSections(tree);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.headingPath).toEqual(["Auth"]);
    expect(sections[0]!.content).toBe("JWT tokens.");
  });

  it("flattens nested sections with heading paths", () => {
    const tree: ContentNode = {
      type: "root",
      content: "",
      children: [
        {
          type: "section",
          heading: "Auth",
          headingLevel: 1,
          content: "",
          children: [
            { type: "paragraph", content: "Intro.", children: [] },
            {
              type: "section",
              heading: "Tokens",
              headingLevel: 2,
              content: "",
              children: [{ type: "paragraph", content: "Token info.", children: [] }],
            },
          ],
        },
      ],
    };
    const sections = flattenSections(tree);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.headingPath).toEqual(["Auth"]);
    expect(sections[0]!.content).toBe("Intro.");
    expect(sections[1]!.headingPath).toEqual(["Auth", "Tokens"]);
    expect(sections[1]!.content).toBe("Token info.");
  });

  it("handles root-level content nodes (no section)", () => {
    const tree: ContentNode = {
      type: "root",
      content: "",
      children: [
        { type: "paragraph", content: "Preamble.", children: [] },
      ],
    };
    const sections = flattenSections(tree);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.headingPath).toEqual([]);
    expect(sections[0]!.content).toBe("Preamble.");
  });

  it("concatenates multiple content children in a section", () => {
    const tree: ContentNode = {
      type: "root",
      content: "",
      children: [
        {
          type: "section",
          heading: "S",
          headingLevel: 1,
          content: "",
          children: [
            { type: "paragraph", content: "Line 1.", children: [] },
            { type: "paragraph", content: "Line 2.", children: [] },
          ],
        },
      ],
    };
    const sections = flattenSections(tree);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.content).toBe("Line 1.\n\nLine 2.");
  });

  it("preserves metadata from root node", () => {
    const tree: ContentNode = {
      type: "root",
      content: "",
      children: [
        { type: "paragraph", content: "Text.", children: [], metadata: { chapterNumber: "1" } },
      ],
      metadata: { bookId: "b1" },
    };
    const sections = flattenSections(tree);
    expect(sections[0]!.metadata).toEqual({ bookId: "b1" });
  });
});

describe("splitSectionIntoChunks", () => {
  it("keeps short section as single chunk", () => {
    const section: SectionBlock = {
      headingPath: ["Auth"],
      content: "Short text.",
    };
    const chunks = splitSectionIntoChunks(section, 0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe("Short text.");
    expect(chunks[0]!.headingPath).toEqual(["Auth"]);
    expect(chunks[0]!.sectionContent).toBe("Short text.");
    expect(chunks[0]!.chunkIndex).toBe(0);
    expect(chunks[0]!.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("splits long text at sentence boundaries", () => {
    const sentences = Array.from({ length: 20 }, (_, i) => `Sentence number ${i}.`);
    const section: SectionBlock = {
      headingPath: [],
      content: sentences.join(" "),
    };
    const chunks = splitSectionIntoChunks(section, 0, 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(250);
    }
  });

  it("never splits mid-sentence", () => {
    const section: SectionBlock = {
      headingPath: [],
      content: "First sentence here. Second sentence here. Third sentence here.",
    };
    const chunks = splitSectionIntoChunks(section, 0, 50);
    for (const chunk of chunks) {
      expect(chunk.text).toMatch(/\.$/);
    }
  });

  it("keeps oversized single sentence as one chunk", () => {
    const longSentence = "A".repeat(3000) + ".";
    const section: SectionBlock = {
      headingPath: [],
      content: longSentence,
    };
    const chunks = splitSectionIntoChunks(section, 0, 2000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toBe(longSentence);
  });

  it("assigns sequential chunkIndex starting from startIndex", () => {
    const section: SectionBlock = {
      headingPath: [],
      content: "A. B. C.",
    };
    const chunks = splitSectionIntoChunks(section, 5, 5);
    expect(chunks[0]!.chunkIndex).toBe(5);
    if (chunks.length > 1) {
      expect(chunks[1]!.chunkIndex).toBe(6);
    }
  });

  it("returns empty array for empty content", () => {
    const section: SectionBlock = { headingPath: [], content: "" };
    const chunks = splitSectionIntoChunks(section, 0);
    expect(chunks).toHaveLength(0);
  });
});
