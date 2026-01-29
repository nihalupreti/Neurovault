import { describe, it, expect, vi, beforeEach } from "vitest";

const mockBookCreate = vi.hoisted(() => vi.fn());
const mockBookFindOne = vi.hoisted(() => vi.fn());
const mockBookChapterCreate = vi.hoisted(() => vi.fn());
const mockBookChapterDeleteMany = vi.hoisted(() => vi.fn());
const mockParseBookHtml = vi.hoisted(() => vi.fn());
const mockChunkAndEmbedBook = vi.hoisted(() => vi.fn());
const mockCreateBookGraphNodes = vi.hoisted(() => vi.fn());
const mockRunBookSimilarityJob = vi.hoisted(() => vi.fn());

vi.mock("../book.model.js", () => ({
  Book: { create: mockBookCreate, findOne: mockBookFindOne },
  BookChapter: { create: mockBookChapterCreate, deleteMany: mockBookChapterDeleteMany },
}));

vi.mock("../books.parser.js", () => ({ parseBookHtml: mockParseBookHtml }));
vi.mock("../books.chunker.js", () => ({ chunkAndEmbedBook: mockChunkAndEmbedBook }));
vi.mock("../books.graph.js", () => ({
  createBookGraphNodes: mockCreateBookGraphNodes,
  runBookSimilarityJob: mockRunBookSimilarityJob,
}));

import { importBook } from "../books.service.js";

describe("importBook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookFindOne.mockResolvedValue(null);
    mockBookCreate.mockResolvedValue({ _id: "book123", title: "Test" });
    mockBookChapterCreate.mockResolvedValue({});
    mockBookChapterDeleteMany.mockResolvedValue({});
    mockParseBookHtml.mockReturnValue({
      title: "Test Book",
      topic: "Testing",
      chapters: [
        {
          number: 1,
          title: "Ch1",
          htmlContent: "<p>hello</p>",
          plainText: "hello",
          sections: [{ anchor: "s1", title: "S1", level: 1 }],
        },
      ],
    });
    mockChunkAndEmbedBook.mockResolvedValue(5);
    mockCreateBookGraphNodes.mockResolvedValue(undefined);
    mockRunBookSimilarityJob.mockResolvedValue(3);
  });

  it("parses HTML, stores models, chunks, and builds graph", async () => {
    const result = await importBook("<html>...</html>");

    expect(mockParseBookHtml).toHaveBeenCalledWith("<html>...</html>");
    expect(mockBookCreate).toHaveBeenCalled();
    expect(mockBookChapterCreate).toHaveBeenCalled();
    expect(mockChunkAndEmbedBook).toHaveBeenCalled();
    expect(mockCreateBookGraphNodes).toHaveBeenCalled();
    expect(mockRunBookSimilarityJob).toHaveBeenCalled();
    expect(result.chunksCreated).toBe(5);
    expect(result.edgesCreated).toBe(3);
  });

  it("skips re-import when htmlHash matches", async () => {
    mockBookFindOne.mockResolvedValue({ _id: "existing", htmlHash: "abc" });

    const result = await importBook("<html>...</html>");

    expect(result.skipped).toBe(true);
    expect(mockBookCreate).not.toHaveBeenCalled();
  });
});
