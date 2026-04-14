import { describe, it, expect } from "vitest";
import { PlainTextParser } from "../parsers/plain-text.parser.js";

describe("PlainTextParser", () => {
  const parser = new PlainTextParser();

  it("creates a root node with paragraph children from double-newline-separated text", () => {
    const tree = parser.parse("First paragraph.\n\nSecond paragraph.");
    expect(tree.type).toBe("root");
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0]!.type).toBe("paragraph");
    expect(tree.children[0]!.content).toBe("First paragraph.");
    expect(tree.children[1]!.content).toBe("Second paragraph.");
  });

  it("handles single paragraph (no double newline)", () => {
    const tree = parser.parse("Just one block of text.");
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]!.content).toBe("Just one block of text.");
  });

  it("strips empty paragraphs from multiple blank lines", () => {
    const tree = parser.parse("A.\n\n\n\nB.");
    expect(tree.children).toHaveLength(2);
  });

  it("preserves single newlines within a paragraph", () => {
    const tree = parser.parse("Line one.\nLine two.");
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]!.content).toBe("Line one.\nLine two.");
  });

  it("passes metadata through to root node", () => {
    const tree = parser.parse("Text.", { source: "transcript" });
    expect(tree.metadata).toEqual({ source: "transcript" });
  });

  it("handles empty input", () => {
    const tree = parser.parse("");
    expect(tree.children).toHaveLength(0);
  });

  it("handles whitespace-only input", () => {
    const tree = parser.parse("   \n\n   ");
    expect(tree.children).toHaveLength(0);
  });
});
