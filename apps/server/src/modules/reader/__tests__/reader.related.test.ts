import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetQdrantClient = vi.hoisted(() => vi.fn());

vi.mock("@neurovault/config", () => ({ getQdrantClient: mockGetQdrantClient }));

import { getRelatedContent } from "../reader.related.js";

describe("getRelatedContent", () => {
  const mockScroll = vi.fn();
  const mockQuery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQdrantClient.mockReturnValue({ scroll: mockScroll, query: mockQuery });

    mockScroll.mockResolvedValue({
      points: [{ id: 1, vector: new Array(3072).fill(0.1), payload: { text: "test" } }],
    });

    mockQuery.mockResolvedValue({
      points: [
        { id: 2, score: 0.85, payload: { text: "related note", fileId: "note1", source: "note", chunk_index: 0 } },
        { id: 3, score: 0.72, payload: { text: "other book section", fileId: "book2", source: "book", bookId: "book2", bookTitle: "Other", chapterNumber: 3, sectionAnchor: "s3" } },
      ],
    });
  });

  it("returns related content excluding the same book", async () => {
    const results = await getRelatedContent("book1", "ch01-intro", 5);

    expect(mockScroll).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
      "neurovault",
      expect.objectContaining({
        filter: { must_not: [{ key: "bookId", match: { value: "book1" } }] },
      }),
    );
    expect(results).toHaveLength(2);
    expect(results[0]!.sourceType).toBe("note");
    expect(results[1]!.sourceType).toBe("book");
  });
});
