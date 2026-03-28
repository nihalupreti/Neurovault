import { describe, it, expect } from "vitest";
import { hashChunk, diffChunks, splitAndHash, type ChunkRecord } from "../chunk-differ.js";

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
  it("splits text into chunks and hashes each", async () => {
    const text = "a".repeat(800) + "b".repeat(800);
    const result = await splitAndHash(text);
    expect(result).toHaveLength(2);
    expect(result[0]!.index).toBe(0);
    expect(result[1]!.index).toBe(1);
    expect(result[0]!.hash).not.toBe(result[1]!.hash);
    expect(result[0]!.text).toBe("a".repeat(800));
  });
});

describe("diffChunks", () => {
  it("marks all as new when no old chunks exist", () => {
    const newChunks = [
      { index: 0, text: "chunk one", hash: hashChunk("chunk one") },
      { index: 1, text: "chunk two", hash: hashChunk("chunk two") },
    ];
    const result = diffChunks(newChunks, []);
    expect(result.toEmbed).toHaveLength(2);
    expect(result.toDelete).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  it("skips unchanged chunks by hash match", () => {
    const hash = hashChunk("same content");
    const newChunks = [{ index: 0, text: "same content", hash }];
    const oldChunks: ChunkRecord[] = [
      { index: 0, contentHash: hash, qdrantPointId: "uuid-1" },
    ];
    const result = diffChunks(newChunks, oldChunks);
    expect(result.toEmbed).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
    expect(result.unchanged).toHaveLength(1);
    expect(result.unchanged[0]!.qdrantPointId).toBe("uuid-1");
  });

  it("detects changed chunks and marks old for deletion", () => {
    const newChunks = [
      { index: 0, text: "updated", hash: hashChunk("updated") },
    ];
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
    const hash = hashChunk("kept");
    const newChunks = [
      { index: 0, text: "kept", hash },
      { index: 1, text: "added", hash: hashChunk("added") },
    ];
    const oldChunks: ChunkRecord[] = [
      { index: 0, contentHash: hash, qdrantPointId: "uuid-kept" },
    ];
    const result = diffChunks(newChunks, oldChunks);
    expect(result.unchanged).toHaveLength(1);
    expect(result.toEmbed).toHaveLength(1);
    expect(result.toDelete).toHaveLength(0);
  });

  it("handles chunk count decrease", () => {
    const newChunks = [
      { index: 0, text: "only", hash: hashChunk("only") },
    ];
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
