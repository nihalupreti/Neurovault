import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetEmbeddings = vi.hoisted(() => vi.fn());
const mockGetQdrantClient = vi.hoisted(() => vi.fn());
const mockChunkTextCreate = vi.hoisted(() => vi.fn());
const mockChunkTextDeleteMany = vi.hoisted(() => vi.fn());

vi.mock("@neurovault/utils/embeddings", () => ({
  getEmbeddings: mockGetEmbeddings,
}));

vi.mock("@neurovault/config", () => ({
  getQdrantClient: mockGetQdrantClient,
}));

vi.mock("../../search/search.chunk-text.model.js", () => ({
  default: { deleteMany: mockChunkTextDeleteMany, insertMany: mockChunkTextCreate },
}));

import { chunkAndEmbedBook } from "../books.chunker.js";

describe("chunkAndEmbedBook", () => {
  const mockUpsert = vi.fn();
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmbeddings.mockResolvedValue(new Array(3072).fill(0.1));
    mockGetQdrantClient.mockReturnValue({
      upsert: mockUpsert,
      delete: mockDelete,
    });
    mockChunkTextCreate.mockResolvedValue([]);
    mockChunkTextDeleteMany.mockResolvedValue({ deletedCount: 0 });
  });

  it("generates embeddings for each section of plain text", async () => {
    await chunkAndEmbedBook({
      bookId: "book123",
      bookTitle: "Test Book",
      chapters: [
        {
          number: 1,
          plainText: "Chapter content about memory management.",
          sections: [{ anchor: "ch01-intro", title: "Intro", level: 1 }],
        },
      ],
    });

    expect(mockGetEmbeddings).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith(
      "neurovault",
      expect.objectContaining({ wait: true }),
    );
  });

  it("stores chunks in MongoDB with source:'book' metadata", async () => {
    await chunkAndEmbedBook({
      bookId: "book123",
      bookTitle: "Test Book",
      chapters: [
        {
          number: 1,
          plainText: "Some text",
          sections: [{ anchor: "s1", title: "S1", level: 1 }],
        },
      ],
    });

    expect(mockChunkTextCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ source: "book", bookId: "book123" }),
      ]),
    );
  });

  it("deletes old chunks before re-inserting", async () => {
    await chunkAndEmbedBook({
      bookId: "book123",
      bookTitle: "Test Book",
      chapters: [{ number: 1, plainText: "Text", sections: [] }],
    });

    expect(mockDelete).toHaveBeenCalledWith(
      "neurovault",
      expect.objectContaining({
        filter: { must: [{ key: "bookId", match: { value: "book123" } }] },
      }),
    );
    expect(mockChunkTextDeleteMany).toHaveBeenCalledWith({ bookId: "book123" });
  });
});
