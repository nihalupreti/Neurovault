import { describe, it, expect } from "vitest";
import { buildIndexActions, buildDeleteActions } from "../index-pipeline.js";
import { hashChunk, type ChunkRecord } from "../chunk-differ.js";

describe("buildIndexActions", () => {
  it("returns embed actions for new file", async () => {
    const actions = await buildIndexActions("# Hello\n\nWorld", []);
    expect(actions.toEmbed.length).toBeGreaterThan(0);
    expect(actions.toDelete).toHaveLength(0);
  });

  it("returns no actions when content unchanged", async () => {
    const text = "exact same content";
    const hash = hashChunk(text);
    const oldChunks: ChunkRecord[] = [
      { index: 0, contentHash: hash, qdrantPointId: "uuid-1" },
    ];
    const actions = await buildIndexActions(text, oldChunks);
    expect(actions.toEmbed).toHaveLength(0);
    expect(actions.toDelete).toHaveLength(0);
    expect(actions.unchanged).toHaveLength(1);
  });
});

describe("buildDeleteActions", () => {
  it("returns delete actions for removed file", () => {
    const oldChunks: ChunkRecord[] = [
      { index: 0, contentHash: "abc", qdrantPointId: "uuid-1" },
      { index: 1, contentHash: "def", qdrantPointId: "uuid-2" },
    ];
    const actions = buildDeleteActions(oldChunks);
    expect(actions.toDelete).toHaveLength(2);
    expect(actions.toEmbed).toHaveLength(0);
  });
});
