import { describe, it, expect } from "vitest";
import { hashChunk, diffChunks, splitAndHash, type ChunkRecord } from "../sync.chunk-differ.js";

describe("hashChunk", () => {
  it("produces consistent SHA-256 hex for same input", () => {
    const h1 = hashChunk("hello world");
    const h2 = hashChunk("hello world");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different input", () => {
    expect(hashChunk("aaa")).not.toBe(hashChunk("bbb"));
  });
});

describe("splitAndHash", () => {
  it("splits text into chunks and hashes each", () => {
    const sentence1 = "a".repeat(1500) + ".";
    const sentence2 = "b".repeat(1500) + ".";
    const text = sentence1 + " " + sentence2;
    const result = splitAndHash(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]!.index).toBe(0);
    expect(result[0]!.hash).not.toBe(result[1]!.hash);
  });

  it("produces non-empty chunks", () => {
    const text = "# Heading\n\nSome paragraph.\n\n## Another\n\nMore text here.";
    const result = splitAndHash(text);
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const chunk of result) {
      expect(chunk.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes headingPath from parsed structure", () => {
    const text = "# Title\n\nContent here.";
    const result = splitAndHash(text);
    expect(result[0]!.headingPath).toEqual(["Title"]);
  });
});

describe("diffChunks", () => {
  const h = (index: number, text: string) => ({
    index,
    text,
    hash: hashChunk(text),
    headingPath: [] as string[],
    sectionContent: text,
  });

  it("marks all as new when no old chunks exist", () => {
    const newChunks = [h(0, "chunk one"), h(1, "chunk two")];
    const result = diffChunks(newChunks, []);
    expect(result.toEmbed).toHaveLength(2);
    expect(result.toDelete).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  it("skips unchanged chunks by hash match", () => {
    const hash = hashChunk("same content");
    const newChunks = [h(0, "same content")];
    const oldChunks: ChunkRecord[] = [{ index: 0, contentHash: hash, qdrantPointId: "uuid-1" }];
    const result = diffChunks(newChunks, oldChunks);
    expect(result.toEmbed).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
    expect(result.unchanged).toHaveLength(1);
    expect(result.unchanged[0]!.qdrantPointId).toBe("uuid-1");
  });

  it("detects changed chunks and marks old for deletion", () => {
    const newChunks = [h(0, "updated")];
    const oldChunks: ChunkRecord[] = [
      { index: 0, contentHash: hashChunk("original"), qdrantPointId: "uuid-old" },
    ];
    const result = diffChunks(newChunks, oldChunks);
    expect(result.toEmbed).toHaveLength(1);
    expect(result.toEmbed[0]!.text).toBe("updated");
    expect(result.toDelete).toHaveLength(1);
    expect(result.toDelete[0]!.qdrantPointId).toBe("uuid-old");
  });

  it("handles chunk count increase", () => {
    const newChunks = [h(0, "kept"), h(1, "added")];
    const oldChunks: ChunkRecord[] = [
      { index: 0, contentHash: hashChunk("kept"), qdrantPointId: "uuid-kept" },
    ];
    const result = diffChunks(newChunks, oldChunks);
    expect(result.unchanged).toHaveLength(1);
    expect(result.toEmbed).toHaveLength(1);
    expect(result.toDelete).toHaveLength(0);
  });

  it("handles chunk count decrease", () => {
    const newChunks = [h(0, "only")];
    const oldChunks: ChunkRecord[] = [
      { index: 0, contentHash: hashChunk("only"), qdrantPointId: "uuid-0" },
      { index: 1, contentHash: hashChunk("removed"), qdrantPointId: "uuid-1" },
    ];
    const result = diffChunks(newChunks, oldChunks);
    expect(result.unchanged).toHaveLength(1);
    expect(result.toEmbed).toHaveLength(0);
    expect(result.toDelete).toHaveLength(1);
    expect(result.toDelete[0]!.qdrantPointId).toBe("uuid-1");
  });
});
