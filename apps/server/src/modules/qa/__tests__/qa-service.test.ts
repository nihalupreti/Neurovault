import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockChatStream } = vi.hoisted(() => ({
  mockChatStream: vi.fn(),
}));

vi.mock("@neurovault/utils/embeddings", () => ({
  getEmbeddings: vi.fn().mockResolvedValue(new Array(1024).fill(0)),
  getEmbeddingsBatch: vi.fn().mockResolvedValue([new Array(1024).fill(0)]),
  rerankDocuments: vi.fn().mockResolvedValue([
    { index: 0, relevance_score: 0.9 },
    { index: 1, relevance_score: 0.8 },
  ]),
  embeddingProvider: { dimensions: 1024 },
}));

vi.mock("../../search/search.chunk-text.model.js", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("../../chunker/chunker.section.model.js", () => ({
  default: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  },
}));

vi.mock("@neurovault/config", () => ({
  getQdrantClient: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue({
      points: [
        {
          id: "p1",
          score: 0.95,
          payload: { text: "chunk text one", fileId: "f1", fileName: "notes.md", chunk_index: 0 },
          vector: new Array(1024).fill(0.1),
        },
        {
          id: "p2",
          score: 0.8,
          payload: { text: "chunk text two", fileId: "f2", fileName: "guide.md", chunk_index: 1 },
          vector: new Array(1024).fill(0.2),
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

import { askQuestion } from "../qa.service.js";

describe("askQuestion", () => {
  beforeEach(() => {
    mockChatStream.mockReset();
  });

  it("returns token stream and citations from retrieved chunks", async () => {
    mockChatStream.mockReturnValue(
      (async function* () {
        yield "Answer ";
        yield "here.";
      })(),
    );

    const result = await askQuestion({ question: "What is force?" });

    expect(result.citations.length).toBeGreaterThanOrEqual(1);
    expect(result.citations[0]!.fileId).toBe("f1");
    expect(result.citations[0]!.fileName).toBe("notes.md");

    const tokens: string[] = [];
    for await (const token of result.stream) {
      tokens.push(token);
    }
    expect(tokens.join("")).toBe("Answer here.");
  });

  it("returns no-results message when Qdrant returns empty", async () => {
    const { getQdrantClient } = await import("@neurovault/config");
    vi.mocked(getQdrantClient).mockReturnValueOnce({
      query: vi.fn().mockResolvedValue({ points: [] }),
    } as ReturnType<typeof getQdrantClient>);

    const result = await askQuestion({ question: "Unknown topic" });

    expect(result.citations).toHaveLength(0);
    const tokens: string[] = [];
    for await (const token of result.stream) {
      tokens.push(token);
    }
    expect(tokens.join("")).toContain("couldn't find any relevant notes");
  });

  it("always uses RERANK_POOL size for Qdrant queries", async () => {
    mockChatStream.mockReturnValue(
      (async function* () {
        yield "ok";
      })(),
    );

    await askQuestion({ question: "test", limit: 3 });

    const { getQdrantClient } = await import("@neurovault/config");
    const client = getQdrantClient();
    expect(client.query).toHaveBeenCalledWith("neurovault", expect.objectContaining({ limit: 20 }));
  });
});
