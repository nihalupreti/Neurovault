import { describe, it, expect } from "vitest";
import { formatEmailNote } from "../capture.email-formatter.js";

describe("formatEmailNote", () => {
  it("generates markdown with full frontmatter", () => {
    const result = formatEmailNote({
      from: "alice@example.com",
      subject: "Interesting AI Paper",
      date: "2025-03-25T14:30:00Z",
      body: "Check out this paper on transformers.",
      attachments: ["paper.pdf", "diagram.png"],
    });
    expect(result).toContain("---");
    expect(result).toContain("source: email");
    expect(result).toContain('from: "alice@example.com"');
    expect(result).toContain('subject: "Interesting AI Paper"');
    expect(result).toContain("date: 2025-03-25T14:30:00Z");
    expect(result).toContain("type: email");
    expect(result).toContain("# Interesting AI Paper");
    expect(result).toContain("Check out this paper on transformers.");
  });

  it("includes attachment list in frontmatter", () => {
    const result = formatEmailNote({
      from: "alice@example.com",
      subject: "Files",
      date: "2025-03-25T14:30:00Z",
      body: "Here are the files.",
      attachments: ["doc.pdf", "img.png"],
    });
    expect(result).toContain('  - "doc.pdf"');
    expect(result).toContain('  - "img.png"');
  });

  it("includes wikilinks to attachments in body", () => {
    const result = formatEmailNote({
      from: "alice@example.com",
      subject: "Files",
      date: "2025-03-25T14:30:00Z",
      body: "See attached.",
      attachments: ["report.pdf"],
    });
    expect(result).toContain("[[report.pdf]]");
  });

  it("handles no attachments gracefully", () => {
    const result = formatEmailNote({
      from: "bob@example.com",
      subject: "Quick thought",
      date: "2025-03-25T14:30:00Z",
      body: "Just a note.",
      attachments: [],
    });
    expect(result).not.toContain("attachments:");
    expect(result).not.toContain("## Attachments");
    expect(result).toContain("# Quick thought");
    expect(result).toContain("Just a note.");
  });

  it("includes forwarded-from line in body", () => {
    const result = formatEmailNote({
      from: "alice@example.com",
      subject: "Test",
      date: "2025-03-25T14:30:00Z",
      body: "Content here.",
      attachments: [],
    });
    expect(result).toContain("> Forwarded from alice@example.com on 2025-03-25");
  });

  it("handles empty subject with fallback", () => {
    const result = formatEmailNote({
      from: "alice@example.com",
      subject: "",
      date: "2025-03-25T14:30:00Z",
      body: "No subject email.",
      attachments: [],
    });
    expect(result).toContain("# Email from alice@example.com");
  });
});
