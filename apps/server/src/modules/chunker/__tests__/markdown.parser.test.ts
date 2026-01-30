import { describe, it, expect } from "vitest";
import { MarkdownParser } from "../parsers/markdown.parser.js";

describe("MarkdownParser", () => {
  const parser = new MarkdownParser();

  it("parses a flat heading + paragraph", () => {
    const tree = parser.parse("# Title\n\nSome text.");
    expect(tree.type).toBe("root");
    expect(tree.children).toHaveLength(1);
    const section = tree.children[0]!;
    expect(section.type).toBe("section");
    expect(section.heading).toBe("Title");
    expect(section.headingLevel).toBe(1);
    expect(section.children).toHaveLength(1);
    expect(section.children[0]!.type).toBe("paragraph");
    expect(section.children[0]!.content).toBe("Some text.");
  });

  it("nests h2 under h1", () => {
    const md = "# Parent\n\nIntro.\n\n## Child\n\nChild text.";
    const tree = parser.parse(md);
    const parent = tree.children[0]!;
    expect(parent.heading).toBe("Parent");
    expect(parent.children).toHaveLength(2);
    expect(parent.children[0]!.type).toBe("paragraph");
    expect(parent.children[0]!.content).toBe("Intro.");
    const child = parent.children[1]!;
    expect(child.type).toBe("section");
    expect(child.heading).toBe("Child");
    expect(child.headingLevel).toBe(2);
    expect(child.children[0]!.content).toBe("Child text.");
  });

  it("handles multiple h2 siblings under h1", () => {
    const md = "# Top\n\n## A\n\nText A.\n\n## B\n\nText B.";
    const tree = parser.parse(md);
    const top = tree.children[0]!;
    expect(top.children).toHaveLength(2);
    expect(top.children[0]!.heading).toBe("A");
    expect(top.children[1]!.heading).toBe("B");
  });

  it("preserves fenced code blocks as code nodes", () => {
    const md = "# Code\n\n```js\nconsole.log('hi');\n```";
    const tree = parser.parse(md);
    const section = tree.children[0]!;
    const codeNode = section.children.find((c) => c.type === "code");
    expect(codeNode).toBeDefined();
    expect(codeNode!.content).toContain("console.log('hi');");
  });

  it("handles text before any heading as root-level paragraphs", () => {
    const md = "Preamble text.\n\n# First Section\n\nBody.";
    const tree = parser.parse(md);
    expect(tree.children[0]!.type).toBe("paragraph");
    expect(tree.children[0]!.content).toBe("Preamble text.");
    expect(tree.children[1]!.type).toBe("section");
  });

  it("handles document with no headings at all", () => {
    const md = "Just some plain text.\n\nAnother paragraph.";
    const tree = parser.parse(md);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0]!.type).toBe("paragraph");
  });

  it("handles deeply nested headings (h1 > h2 > h3)", () => {
    const md = "# L1\n\n## L2\n\n### L3\n\nDeep text.";
    const tree = parser.parse(md);
    const l1 = tree.children[0]!;
    const l2 = l1.children[0]!;
    const l3 = l2.children[0]!;
    expect(l3.heading).toBe("L3");
    expect(l3.headingLevel).toBe(3);
    expect(l3.children[0]!.content).toBe("Deep text.");
  });

  it("preserves blockquotes as blockquote nodes", () => {
    const md = "# Notes\n\n> Important quote here.";
    const tree = parser.parse(md);
    const section = tree.children[0]!;
    const bq = section.children.find((c) => c.type === "blockquote");
    expect(bq).toBeDefined();
    expect(bq!.content).toContain("Important quote here.");
  });

  it("preserves unordered lists as list nodes", () => {
    const md = "# Items\n\n- one\n- two\n- three";
    const tree = parser.parse(md);
    const section = tree.children[0]!;
    const list = section.children.find((c) => c.type === "list");
    expect(list).toBeDefined();
    expect(list!.content).toContain("one");
  });

  it("passes metadata through to root node", () => {
    const tree = parser.parse("# H\n\nText.", { fileId: "abc" });
    expect(tree.metadata).toEqual({ fileId: "abc" });
  });

  it("handles empty input", () => {
    const tree = parser.parse("");
    expect(tree.children).toHaveLength(0);
  });
});
