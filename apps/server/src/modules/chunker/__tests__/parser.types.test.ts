import { describe, it, expect } from "vitest";
import { contentHash, sectionId } from "../parsers/parser.types.js";

describe("contentHash", () => {
  it("produces consistent SHA-256 hex for same input", () => {
    const h1 = contentHash("hello world");
    const h2 = contentHash("hello world");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different input", () => {
    expect(contentHash("aaa")).not.toBe(contentHash("bbb"));
  });
});

describe("sectionId", () => {
  it("hashes heading path joined by /", () => {
    const id1 = sectionId(["Auth", "Tokens"]);
    const id2 = sectionId(["Auth", "Tokens"]);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("distinguishes different paths", () => {
    expect(sectionId(["A", "B"])).not.toBe(sectionId(["A", "C"]));
  });

  it("handles empty path", () => {
    const id = sectionId([]);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });
});
