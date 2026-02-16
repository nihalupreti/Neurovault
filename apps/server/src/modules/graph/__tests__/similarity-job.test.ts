import { describe, it, expect } from "vitest";
import { aggregateChunkSimilarities } from "../similarity-job.js";

describe("aggregateChunkSimilarities", () => {
  it("groups by target fileId and takes max score", () => {
    const raw = [
      { targetFileId: "f2", sourceIdx: 0, targetIdx: 1, score: 0.8 },
      { targetFileId: "f2", sourceIdx: 1, targetIdx: 3, score: 0.9 },
      { targetFileId: "f3", sourceIdx: 0, targetIdx: 0, score: 0.75 },
    ];
    const result = aggregateChunkSimilarities(raw, 0.7, 5);
    expect(result).toHaveLength(2);
    const f2Edge = result.find((e) => e.targetFileId === "f2")!;
    expect(f2Edge.score).toBe(0.9);
    expect(f2Edge.chunkPairs).toHaveLength(2);
    const f3Edge = result.find((e) => e.targetFileId === "f3")!;
    expect(f3Edge.score).toBe(0.75);
  });

  it("filters by threshold", () => {
    const raw = [
      { targetFileId: "f2", sourceIdx: 0, targetIdx: 0, score: 0.5 },
      { targetFileId: "f3", sourceIdx: 0, targetIdx: 0, score: 0.8 },
    ];
    const result = aggregateChunkSimilarities(raw, 0.7, 5);
    expect(result).toHaveLength(1);
    expect(result[0]!.targetFileId).toBe("f3");
  });

  it("caps to maxPerFile", () => {
    const raw = Array.from({ length: 10 }, (_, i) => ({
      targetFileId: `f${i + 2}`,
      sourceIdx: 0,
      targetIdx: 0,
      score: 0.8 + i * 0.01,
    }));
    const result = aggregateChunkSimilarities(raw, 0.7, 3);
    expect(result).toHaveLength(3);
    expect(result[0]!.score).toBeGreaterThan(result[2]!.score);
  });

  it("returns empty for no matches", () => {
    expect(aggregateChunkSimilarities([], 0.7, 5)).toEqual([]);
  });
});
