import { describe, it, expect } from "vitest";
import { HtmlParser } from "../parsers/html.parser.js";

describe("HtmlParser", () => {
  const parser = new HtmlParser();

  it("parses headings and paragraphs", () => {
    const html = "<h1>Title</h1><p>Some text.</p>";
    const tree = parser.parse(html);
    expect(tree.type).toBe("root");
    expect(tree.children).toHaveLength(1);
    const section = tree.children[0]!;
    expect(section.type).toBe("section");
    expect(section.heading).toBe("Title");
    expect(section.headingLevel).toBe(1);
    expect(section.children[0]!.type).toBe("paragraph");
    expect(section.children[0]!.content).toBe("Some text.");
  });

  it("nests h2 under h1", () => {
    const html = "<h1>Parent</h1><p>Intro.</p><h2>Child</h2><p>Child text.</p>";
    const tree = parser.parse(html);
    const parent = tree.children[0]!;
    expect(parent.heading).toBe("Parent");
    expect(parent.children).toHaveLength(2);
    expect(parent.children[0]!.content).toBe("Intro.");
    expect(parent.children[1]!.heading).toBe("Child");
  });

  it("preserves <pre> as code nodes", () => {
    const html = "<h1>Code</h1><pre><code>const x = 1;</code></pre>";
    const tree = parser.parse(html);
    const section = tree.children[0]!;
    const codeNode = section.children.find((c) => c.type === "code");
    expect(codeNode).toBeDefined();
    expect(codeNode!.content).toContain("const x = 1;");
  });

  it("preserves <blockquote> as blockquote nodes", () => {
    const html = "<h1>Q</h1><blockquote>A wise quote.</blockquote>";
    const tree = parser.parse(html);
    const section = tree.children[0]!;
    const bq = section.children.find((c) => c.type === "blockquote");
    expect(bq).toBeDefined();
    expect(bq!.content).toContain("A wise quote.");
  });

  it("preserves <ul> and <ol> as list nodes", () => {
    const html = "<h1>L</h1><ul><li>A</li><li>B</li></ul>";
    const tree = parser.parse(html);
    const section = tree.children[0]!;
    const list = section.children.find((c) => c.type === "list");
    expect(list).toBeDefined();
    expect(list!.content).toContain("A");
  });

  it("handles text before any heading", () => {
    const html = "<p>Preamble.</p><h1>First</h1><p>Body.</p>";
    const tree = parser.parse(html);
    expect(tree.children[0]!.type).toBe("paragraph");
    expect(tree.children[1]!.type).toBe("section");
  });

  it("handles document with no headings", () => {
    const html = "<p>Para one.</p><p>Para two.</p>";
    const tree = parser.parse(html);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0]!.type).toBe("paragraph");
  });

  it("extracts content from <article> wrapper", () => {
    const html = "<nav>Nav</nav><article><h1>Title</h1><p>Body.</p></article><footer>Foot</footer>";
    const tree = parser.parse(html);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]!.heading).toBe("Title");
  });

  it("strips inline HTML tags from text", () => {
    const html = "<h1>T</h1><p>Hello <strong>bold</strong> and <em>italic</em>.</p>";
    const tree = parser.parse(html);
    const section = tree.children[0]!;
    expect(section.children[0]!.content).toBe("Hello bold and italic.");
  });

  it("passes metadata through to root node", () => {
    const tree = parser.parse("<p>Text.</p>", { bookId: "b1" });
    expect(tree.metadata).toEqual({ bookId: "b1" });
  });

  it("handles empty input", () => {
    const tree = parser.parse("");
    expect(tree.children).toHaveLength(0);
  });

  it("preserves <table> as table nodes", () => {
    const html = "<h1>Data</h1><table><tr><td>A</td><td>B</td></tr></table>";
    const tree = parser.parse(html);
    const section = tree.children[0]!;
    const table = section.children.find((c) => c.type === "table");
    expect(table).toBeDefined();
  });
});
