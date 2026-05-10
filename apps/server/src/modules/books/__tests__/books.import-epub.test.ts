import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const mockBookCreate = vi.hoisted(() => vi.fn());
const mockBookFindOne = vi.hoisted(() => vi.fn());
const mockBookFindByIdAndUpdate = vi.hoisted(() => vi.fn());
const mockBookFindByIdAndDelete = vi.hoisted(() => vi.fn());
const mockBookChapterCreate = vi.hoisted(() => vi.fn());
const mockQueueAdd = vi.hoisted(() => vi.fn());
const mockMkdir = vi.hoisted(() => vi.fn());
const mockWriteFile = vi.hoisted(() => vi.fn());

vi.mock("../book.model.js", () => ({
  Book: {
    create: mockBookCreate,
    findOne: mockBookFindOne,
    findByIdAndUpdate: mockBookFindByIdAndUpdate,
    findByIdAndDelete: mockBookFindByIdAndDelete,
  },
  BookChapter: { create: mockBookChapterCreate },
}));

vi.mock("../../worker/worker.queues.js", () => ({
  getBookQueue: () => ({ add: mockQueueAdd }),
}));

vi.mock("../books.graph.js", () => ({
  deleteBookGraphNodes: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    default: {
      ...(actual as Record<string, unknown>),
      mkdir: mockMkdir,
      writeFile: mockWriteFile,
    },
  };
});

import { importEpubFile } from "../books.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, "fixtures/test.epub");

describe("importEpubFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookFindOne.mockResolvedValue(null);
    mockBookCreate.mockResolvedValue({ _id: "epub-book-123", title: "Processing..." });
    mockBookFindByIdAndUpdate.mockResolvedValue({});
    mockBookChapterCreate.mockResolvedValue({});
    mockQueueAdd.mockResolvedValue({ id: "job-epub-1" });
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("parses EPUB and creates book with metadata", async () => {
    const result = await importEpubFile(FIXTURE_PATH);

    expect(result.skipped).toBe(false);
    expect(result.status).toBe("processing");
    expect(result.title).toBe("Test EPUB Book");
    expect(result.totalChapters).toBe(2);
    expect(result.jobId).toBe("job-epub-1");

    expect(mockBookCreate).toHaveBeenCalledWith(
      expect.objectContaining({ format: "epub" }),
    );
    expect(mockBookFindByIdAndUpdate).toHaveBeenCalledWith(
      "epub-book-123",
      expect.objectContaining({
        title: "Test EPUB Book",
        author: "Test Author",
      }),
    );
    expect(mockBookChapterCreate).toHaveBeenCalledTimes(2);
  });

  it("skips duplicate EPUB by hash", async () => {
    mockBookFindOne.mockResolvedValue({
      _id: "existing-epub",
      title: "Old",
      totalChapters: 5,
    });

    const result = await importEpubFile(FIXTURE_PATH);

    expect(result.skipped).toBe(true);
    expect(mockBookCreate).not.toHaveBeenCalled();
  });

  it("writes image assets to disk", async () => {
    await importEpubFile(FIXTURE_PATH);

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it("dispatches chunk-book job", async () => {
    await importEpubFile(FIXTURE_PATH);

    expect(mockQueueAdd).toHaveBeenCalledWith("chunk-book", { bookId: "epub-book-123" });
  });
});
