import { describe, it, expect } from "vitest";
import { reciprocalRankFusion } from "../rrf.js";

interface RRFItem {
  id: string;
  payload: any;
}

describe("reciprocalRankFusion", () => {
  it("merges two result sets by RRF score", () => {
    const textResults: RRFItem[] = [
      { id: "a:0", payload: { text: "a0" } },
      { id: "b:0", payload: { text: "b0" } },
    ];
    const vectorResults: RRFItem[] = [
      { id: "b:0", payload: { text: "b0" } },
      { id: "c:0", payload: { text: "c0" } },
    ];
    const fused = reciprocalRankFusion([textResults, vectorResults]);
    expect(fused[0]!.id).toBe("b:0");
    expect(fused[0]!.score).toBeGreaterThan(fused[1]!.score);
    expect(fused).toHaveLength(3);
  });

  it("handles single result set", () => {
    const results: RRFItem[] = [
      { id: "a:0", payload: { text: "a" } },
      { id: "b:0", payload: { text: "b" } },
    ];
    const fused = reciprocalRankFusion([results]);
    expect(fused).toHaveLength(2);
    expect(fused[0]!.id).toBe("a:0");
    expect(fused[0]!.score).toBeGreaterThan(fused[1]!.score);
  });

  it("handles empty result sets", () => {
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });

  it("handles one empty, one populated", () => {
    const results: RRFItem[] = [{ id: "a:0", payload: { text: "a" } }];
    const fused = reciprocalRankFusion([results, []]);
    expect(fused).toHaveLength(1);
  });

  it("boosts items appearing in multiple sets", () => {
    const set1: RRFItem[] = [
      { id: "shared:0", payload: { text: "s" } },
      { id: "only1:0", payload: { text: "o1" } },
    ];
    const set2: RRFItem[] = [
      { id: "only2:0", payload: { text: "o2" } },
      { id: "shared:0", payload: { text: "s" } },
    ];
    const fused = reciprocalRankFusion([set1, set2]);
    expect(fused[0]!.id).toBe("shared:0");
  });

  it("respects custom k parameter", () => {
    const results: RRFItem[] = [{ id: "a:0", payload: { text: "a" } }];
    const fused = reciprocalRankFusion([results], 10);
    expect(fused[0]!.score).toBeCloseTo(1 / (10 + 1), 5);
  });

  it("limits to 10 results", () => {
    const bigSet: RRFItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: `item:${i}`,
      payload: { text: `text ${i}` },
    }));
    const fused = reciprocalRankFusion([bigSet]);
    expect(fused).toHaveLength(10);
  });
});
