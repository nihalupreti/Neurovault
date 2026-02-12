import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockChatStream } = vi.hoisted(() => ({
  mockChatStream: vi.fn(),
}));

vi.mock("@neurovault/utils/embeddings", () => ({
  getEmbeddings: vi.fn().mockResolvedValue(new Array(3072).fill(0)),
}));

vi.mock("@neurovault/config", () => ({
  getQdrantClient: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue({
      points: [
        {
          id: "p1",
          score: 0.95,
          payload: { text: "chunk text one", fileId: "f1", fileName: "notes.md", chunk_index: 0 },
        },
        {
          id: "p2",
          score: 0.80,
          payload: { text: "chunk text two", fileId: "f2", fileName: "guide.md", chunk_index: 1 },
        },
      ],
    }),
  }),
}));

vi.mock("../providers/index.js", () => ({
  createProvider: vi.fn().mockReturnValue({
    chatStream: mockChatStream,
  }),
}));

import { askQuestion } from "../qa-service.js";

describe("askQuestion", () => {
  beforeEach(() => {
    mockChatStream.mockReset();
  });

  it("returns token stream and citations from retrieved chunks", async () => {
    mockChatStream.mockReturnValue(
      (async function* () {
        yield "Answer ";
        yield "here.";
      })()
    );

    const result = await askQuestion({ question: "What is force?" });

    expect(result.citations).toHaveLength(2);
    expect(result.citations[0]).toEqual({
      sourceIndex: 1,
      fileId: "f1",
      fileName: "notes.md",
      excerpt: "chunk text one",
    });
    expect(result.citations[1]).toEqual({
      sourceIndex: 2,
      fileId: "f2",
      fileName: "guide.md",
      excerpt: "chunk text two",
    });

    const tokens: string[] = [];
    for await (const token of result.stream) {
      tokens.push(token);
    }
    expect(tokens).toEqual(["Answer ", "here."]);
  });

  it("returns no-results message when Qdrant returns empty", async () => {
    const { getQdrantClient } = await import("@neurovault/config");
    vi.mocked(getQdrantClient).mockReturnValueOnce({
      query: vi.fn().mockResolvedValue({ points: [] }),
    } as any);

    const result = await askQuestion({ question: "Unknown topic" });

    expect(result.citations).toHaveLength(0);
    const tokens: string[] = [];
    for await (const token of result.stream) {
      tokens.push(token);
    }
    expect(tokens.join("")).toContain("couldn't find any relevant notes");
  });

  it("respects custom limit", async () => {
    mockChatStream.mockReturnValue(
      (async function* () {
        yield "ok";
      })()
    );

    await askQuestion({ question: "test", limit: 10 });

    const { getQdrantClient } = await import("@neurovault/config");
    const client = getQdrantClient();
    expect(client.query).toHaveBeenCalledWith(
      "neurovault",
      expect.objectContaining({ limit: 10 })
    );
  });
});
