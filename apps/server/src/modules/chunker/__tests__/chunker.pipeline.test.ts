import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetEmbeddingsBatch = vi.hoisted(() => vi.fn());
const mockGetQdrantClient = vi.hoisted(() => vi.fn());
const mockChunkTextDeleteMany = vi.hoisted(() => vi.fn());
const mockChunkTextInsertMany = vi.hoisted(() => vi.fn());
const mockSectionContentDeleteMany = vi.hoisted(() => vi.fn());
const mockSectionContentInsertMany = vi.hoisted(() => vi.fn());

vi.mock("@neurovault/utils/embeddings", () => ({
  getEmbeddingsBatch: mockGetEmbeddingsBatch,
  embeddingProvider: { dimensions: 1024 },
}));

vi.mock("@neurovault/config", () => ({
  getQdrantClient: mockGetQdrantClient,
}));

vi.mock("../../search/search.chunk-text.model.js", () => ({
  default: {
    deleteMany: mockChunkTextDeleteMany,
    insertMany: mockChunkTextInsertMany,
  },
}));

vi.mock("../chunker.section.model.js", () => ({
  default: {
    deleteMany: mockSectionContentDeleteMany,
    insertMany: mockSectionContentInsertMany,
  },
}));

import { processContent, splitContent } from "../chunker.pipeline.js";
import { MarkdownParser } from "../parsers/markdown.parser.js";
import { PlainTextParser } from "../parsers/plain-text.parser.js";

describe("splitContent", () => {
  it("returns PreparedChunks from markdown content", () => {
    const chunks = splitContent("# Title\n\nHello world.", new MarkdownParser());
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]!.headingPath).toEqual(["Title"]);
    expect(chunks[0]!.text).toBe("Hello world.");
    expect(chunks[0]!.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns PreparedChunks from plain text content", () => {
    const chunks = splitContent("Some plain text.\n\nAnother paragraph.", new PlainTextParser());
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]!.headingPath).toEqual([]);
  });
});

describe("processContent", () => {
  const mockUpsert = vi.fn();
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmbeddingsBatch.mockResolvedValue([new Array(1024).fill(0.1)]);
    mockGetQdrantClient.mockReturnValue({
      upsert: mockUpsert,
      delete: mockDelete,
    });
    mockChunkTextDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mockChunkTextInsertMany.mockResolvedValue([]);
    mockSectionContentDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mockSectionContentInsertMany.mockResolvedValue([]);
  });

  it("processes markdown and stores chunks in Qdrant and MongoDB", async () => {
    const result = await processContent("# Heading\n\nSome text here.", "file-123", new MarkdownParser());
    expect(result).toBeGreaterThanOrEqual(1);
    expect(mockGetEmbeddingsBatch).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith(
      "neurovault",
      expect.objectContaining({ wait: true })
    );
    expect(mockChunkTextInsertMany).toHaveBeenCalled();
  });

  it("stores headingPath in Qdrant payload", async () => {
    await processContent("# Auth\n\nToken info.", "f1", new MarkdownParser());
    const upsertCall = mockUpsert.mock.calls[0]!;
    const points = upsertCall[1].points;
    expect(points[0].payload.headingPath).toEqual(["Auth"]);
    expect(points[0].payload.sectionId).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stores section content in SectionContent collection", async () => {
    await processContent("# S\n\nBody text.", "f1", new MarkdownParser());
    expect(mockSectionContentInsertMany).toHaveBeenCalled();
    const docs = mockSectionContentInsertMany.mock.calls[0]![0];
    expect(docs[0].content).toBe("Body text.");
    expect(docs[0].headingPath).toEqual(["S"]);
  });

  it("passes metadata through to Qdrant payload", async () => {
    await processContent("Some text.", "f1", new PlainTextParser(), {
      source: "book",
      bookId: "b1",
      bookTitle: "Test Book",
      chapterNumber: "1",
    });
    const points = mockUpsert.mock.calls[0]![1].points;
    expect(points[0].payload.source).toBe("book");
    expect(points[0].payload.bookId).toBe("b1");
  });

  it("calls embedBatch with late_chunking=true", async () => {
    await processContent("# H\n\nText.", "f1", new MarkdownParser());
    expect(mockGetEmbeddingsBatch).toHaveBeenCalledWith(
      expect.any(Array),
      "document",
      true
    );
  });

  it("deletes old chunks for fileId before inserting", async () => {
    await processContent("Text.", "f1", new PlainTextParser());
    expect(mockChunkTextDeleteMany).toHaveBeenCalledWith({ fileId: "f1" });
    expect(mockSectionContentDeleteMany).toHaveBeenCalledWith({ fileId: "f1" });
  });

  it("returns 0 for empty content", async () => {
    const result = await processContent("", "f1", new PlainTextParser());
    expect(result).toBe(0);
    expect(mockGetEmbeddingsBatch).not.toHaveBeenCalled();
  });
});
