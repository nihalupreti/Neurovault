import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../qa-prompts.js";
import type { RetrievedChunk } from "../providers/types.js";

describe("buildSystemPrompt", () => {
  it("includes all chunks with Source tags", () => {
    const chunks: RetrievedChunk[] = [
      { fileId: "a1", fileName: "physics.md", text: "Force equals mass times acceleration", chunkIndex: 0, score: 0.95 },
      { fileId: "b2", fileName: "calculus.md", text: "Derivative is rate of change", chunkIndex: 2, score: 0.82 },
    ];

    const prompt = buildSystemPrompt(chunks);

    expect(prompt).toContain("[Source 1] physics.md");
    expect(prompt).toContain("Force equals mass times acceleration");
    expect(prompt).toContain("[Source 2] calculus.md");
    expect(prompt).toContain("Derivative is rate of change");
  });

  it("includes system instructions", () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain("Answer based solely on the provided context");
    expect(prompt).toContain("[Source N]");
  });

  it("handles empty chunks", () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain("Context:");
    expect(prompt).not.toContain("[Source 1]");
  });
});
