import { describe, it, expect } from "vitest";
import { parseBookHtml } from "../books.parser.js";

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head><title>Test Book</title></head>
<body>
<header id="title-page">
  <h1 class="book-title">Linux Kernel Internals</h1>
  <p class="book-subtitle">A Deep Dive</p>
</header>
<nav id="toc">
  <ul class="toc-list">
    <li class="toc-h1"><a href="#ch01-intro">Chapter 1: Introduction</a></li>
    <li class="toc-h2"><a href="#ch01-setup">Setup</a></li>
  </ul>
</nav>
<main id="content">
  <article id="ch01" data-chapter="1">
    <h1 id="ch01-intro">Chapter 1: Introduction</h1>
    <p>Welcome to the book.</p>
    <h2 id="ch01-setup">Setup</h2>
    <p>Install the tools.</p>
    <div class="code-block" data-lang="bash">
      <pre><code class="highlight">apt install build-essential</code></pre>
    </div>
    <div class="callout callout-tip" data-callout="tip">
      <div class="callout-header">TIP</div>
      <div class="callout-body"><p>Use a VM for safety.</p></div>
    </div>
  </article>
  <article id="ch02" data-chapter="2">
    <h1 id="ch02-memory">Chapter 2: Memory</h1>
    <p>Memory management basics.</p>
  </article>
</main>
</body></html>`;

describe("parseBookHtml", () => {
  const result = parseBookHtml(SAMPLE_HTML);

  it("extracts title and topic", () => {
    expect(result.title).toBe("Linux Kernel Internals");
    expect(result.topic).toBe("A Deep Dive");
  });

  it("extracts all chapters", () => {
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]!.number).toBe(1);
    expect(result.chapters[0]!.title).toBe("Chapter 1: Introduction");
    expect(result.chapters[1]!.number).toBe(2);
  });

  it("extracts sections with anchors and levels", () => {
    const ch1 = result.chapters[0]!;
    expect(ch1.sections).toHaveLength(2);
    expect(ch1.sections[0]).toEqual({ anchor: "ch01-intro", title: "Chapter 1: Introduction", level: 1 });
    expect(ch1.sections[1]).toEqual({ anchor: "ch01-setup", title: "Setup", level: 2 });
  });

  it("preserves raw HTML content per chapter", () => {
    expect(result.chapters[0]!.htmlContent).toContain("Welcome to the book");
    expect(result.chapters[0]!.htmlContent).toContain('data-lang="bash"');
    expect(result.chapters[0]!.htmlContent).toContain('data-callout="tip"');
  });

  it("extracts plain text per chapter (HTML stripped)", () => {
    expect(result.chapters[0]!.plainText).toContain("Welcome to the book");
    expect(result.chapters[0]!.plainText).toContain("apt install build-essential");
    expect(result.chapters[0]!.plainText).not.toContain("<p>");
    expect(result.chapters[0]!.plainText).not.toContain("<div");
  });
});
