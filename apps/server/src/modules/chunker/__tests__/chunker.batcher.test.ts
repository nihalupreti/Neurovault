import { describe, it, expect } from "vitest";
import { buildBatches } from "../chunker.batcher.js";
import type { PreparedChunk } from "../parsers/parser.types.js";

function makeChunk(text: string, headingPath: string[] = [], index = 0): PreparedChunk {
  return {
    text,
    headingPath,
    sectionContent: text,
    chunkIndex: index,
    contentHash: "hash",
    metadata: undefined,
  };
}

describe("buildBatches", () => {
  it("puts all chunks in one batch when under token limit", () => {
    const chunks = [makeChunk("Hello world.", ["A"], 0), makeChunk("Another sentence.", ["A"], 1)];
    const batches = buildBatches(chunks, 8192);
    expect(batches).toHaveLength(1);
    expect(batches[0]!.chunks).toHaveLength(2);
  });

  it("splits into multiple batches when total exceeds limit", () => {
    const longText = "A".repeat(4000);
    const chunks = [
      makeChunk(longText, ["A"], 0),
      makeChunk(longText, ["A"], 1),
      makeChunk(longText, ["A"], 2),
    ];
    const batches = buildBatches(chunks, 2500);
    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      expect(batch.totalTokenEstimate).toBeLessThanOrEqual(2500);
    }
  });

  it("keeps same-section chunks together when they fit", () => {
    const chunks = [
      makeChunk("Text A.", ["Section1"], 0),
      makeChunk("Text B.", ["Section1"], 1),
      makeChunk("Text C.", ["Section2"], 2),
    ];
    const batches = buildBatches(chunks, 8192);
    expect(batches).toHaveLength(1);
  });

  it("handles a single chunk that exceeds the token limit", () => {
    const huge = makeChunk("X".repeat(40000), [], 0);
    const batches = buildBatches([huge], 8192);
    expect(batches).toHaveLength(1);
    expect(batches[0]!.chunks).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    const batches = buildBatches([], 8192);
    expect(batches).toHaveLength(0);
  });

  it("estimates tokens as ceil(chars/4)", () => {
    const chunk = makeChunk("A".repeat(400), [], 0);
    const batches = buildBatches([chunk], 8192);
    expect(batches[0]!.totalTokenEstimate).toBe(100);
  });
});
