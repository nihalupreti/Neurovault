import { describe, it, expect, vi, beforeEach } from "vitest";

const mockBookCreate = vi.hoisted(() => vi.fn());
const mockBookFindOne = vi.hoisted(() => vi.fn());
const mockBookChapterCreate = vi.hoisted(() => vi.fn());
const mockBookChapterDeleteMany = vi.hoisted(() => vi.fn());
const mockParseBookHtml = vi.hoisted(() => vi.fn());
const mockQueueAdd = vi.hoisted(() => vi.fn());

vi.mock("../book.model.js", () => ({
  Book: { create: mockBookCreate, findOne: mockBookFindOne },
  BookChapter: { create: mockBookChapterCreate, deleteMany: mockBookChapterDeleteMany },
}));

vi.mock("../books.parser.js", () => ({ parseBookHtml: mockParseBookHtml }));
vi.mock("../../worker/worker.queues.js", () => ({
  getBookQueue: () => ({ add: mockQueueAdd }),
}));

import { importBook } from "../books.service.js";

describe("importBook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookFindOne.mockResolvedValue(null);
    mockBookCreate.mockResolvedValue({ _id: "book123", title: "Test" });
    mockBookChapterCreate.mockResolvedValue({});
    mockBookChapterDeleteMany.mockResolvedValue({});
    mockQueueAdd.mockResolvedValue({ id: "job-1" });
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
  });

  it("parses HTML, stores models, and dispatches indexing job", async () => {
    const result = await importBook("<html>...</html>");

    expect(mockParseBookHtml).toHaveBeenCalledWith("<html>...</html>");
    expect(mockBookCreate).toHaveBeenCalled();
    expect(mockBookChapterCreate).toHaveBeenCalled();
    expect(mockQueueAdd).toHaveBeenCalledWith("chunk-book", { bookId: "book123" });
    expect(result.status).toBe("processing");
    expect(result.jobId).toBe("job-1");
    expect(result.skipped).toBe(false);
  });

  it("skips re-import when htmlHash matches", async () => {
    mockBookFindOne.mockResolvedValue({ _id: "existing", htmlHash: "abc", title: "Old", totalChapters: 3 });

    const result = await importBook("<html>...</html>");

    expect(result.skipped).toBe(true);
    expect(result.status).toBe("skipped");
    expect(mockBookCreate).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});
