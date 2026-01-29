import { describe, it, expect } from "vitest";
import { generateObsidianMarkdown } from "../reader.export.js";

describe("generateObsidianMarkdown", () => {
  it("generates markdown with highlights and vault links", () => {
    const md = generateObsidianMarkdown("Linux Kernel", [
      {
        chapterNumber: 1,
        chapterTitle: "Introduction",
        annotations: [
          { type: "highlight", sectionTitle: "Setup", highlightedText: "Install gcc", noteContent: null, linkedNoteName: null },
          { type: "note", sectionTitle: "Setup", highlightedText: "Use make", noteContent: "Similar to CMake", linkedNoteName: null },
          { type: "vault-link", sectionTitle: "Compiling", highlightedText: "make modules", noteContent: null, linkedNoteName: "Build Systems" },
        ],
      },
    ]);

    expect(md).toContain("# Reading Notes: Linux Kernel");
    expect(md).toContain("## Chapter 1: Introduction");
    expect(md).toContain('"Install gcc"');
    expect(md).toContain("Similar to CMake");
    expect(md).toContain("[[Build Systems]]");
  });
});
