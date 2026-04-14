import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAnnotationCreate = vi.hoisted(() => vi.fn());
const mockAnnotationFind = vi.hoisted(() => vi.fn());
const mockAnnotationFindByIdAndUpdate = vi.hoisted(() => vi.fn());
const mockAnnotationFindByIdAndDelete = vi.hoisted(() => vi.fn());
const mockProgressFindOneAndUpdate = vi.hoisted(() => vi.fn());
const mockProgressFindOne = vi.hoisted(() => vi.fn());
const mockGetEmbeddings = vi.hoisted(() => vi.fn());
const mockGetQdrantClient = vi.hoisted(() => vi.fn());

vi.mock("../reader.model.js", () => ({
  BookAnnotation: {
    create: mockAnnotationCreate,
    find: mockAnnotationFind,
    findByIdAndUpdate: mockAnnotationFindByIdAndUpdate,
    findByIdAndDelete: mockAnnotationFindByIdAndDelete,
  },
  ReadingProgress: {
    findOneAndUpdate: mockProgressFindOneAndUpdate,
    findOne: mockProgressFindOne,
  },
}));

vi.mock("@neurovault/utils/embeddings", () => ({
  getEmbeddings: mockGetEmbeddings,
  getEmbeddingsBatch: vi.fn().mockResolvedValue([new Array(1024).fill(0)]),
  embeddingProvider: { dimensions: 1024 },
}));
vi.mock("@neurovault/config", () => ({ getQdrantClient: mockGetQdrantClient }));

import { createAnnotation, getProgress, updateProgress } from "../reader.service.js";

describe("createAnnotation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnnotationCreate.mockResolvedValue({
      _id: "ann1",
      type: "highlight",
      highlightedText: "test",
    });
    mockGetEmbeddings.mockResolvedValue(new Array(1024).fill(0));
    mockGetQdrantClient.mockReturnValue({ upsert: vi.fn() });
  });

  it("creates an annotation and embeds highlight text in Qdrant", async () => {
    const result = await createAnnotation({
      bookId: "book1",
      chapterNumber: 1,
      sectionAnchor: "s1",
      type: "highlight",
      textRange: { startOffset: 0, endOffset: 10 },
      highlightedText: "test text",
    });

    expect(mockAnnotationCreate).toHaveBeenCalled();
    expect(mockGetEmbeddings).toHaveBeenCalledWith("test text");
    expect(result._id).toBe("ann1");
  });
});

describe("progress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getProgress returns progress or defaults", async () => {
    mockProgressFindOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const result = await getProgress("book1");
    expect(result).toEqual(expect.objectContaining({ currentChapter: 1 }));
  });

  it("updateProgress upserts progress", async () => {
    mockProgressFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ currentChapter: 3 }),
    });
    await updateProgress("book1", { currentChapter: 3, scrollPosition: 50 });
    expect(mockProgressFindOneAndUpdate).toHaveBeenCalled();
  });
});
