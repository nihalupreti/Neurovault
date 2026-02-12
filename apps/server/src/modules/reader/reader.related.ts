import { getQdrantClient } from "@neurovault/config";

const COLLECTION = "neurovault";

export interface RelatedItem {
  sourceType: "note" | "book" | "annotation";
  fileId: string;
  score: number;
  snippet: string;
  bookId?: string;
  bookTitle?: string;
  chapterNumber?: number;
  sectionAnchor?: string;
}

export async function getRelatedContent(
  bookId: string,
  sectionAnchor: string,
  limit = 10,
): Promise<RelatedItem[]> {
  const client = getQdrantClient();

  const scrollResult = await client.scroll(COLLECTION, {
    filter: {
      must: [
        { key: "bookId", match: { value: bookId } },
        { key: "sectionAnchor", match: { value: sectionAnchor } },
      ],
    },
    with_vector: true,
    with_payload: true,
    limit: 5,
  });

  const sectionChunks = scrollResult.points || [];
  if (sectionChunks.length === 0) return [];

  const vector = sectionChunks[0]!.vector as number[];

  const similar = await client.query(COLLECTION, {
    query: vector,
    limit,
    filter: {
      must_not: [{ key: "bookId", match: { value: bookId } }],
    },
    with_payload: true,
  });

  return (similar.points || []).map((point) => {
    const p = point.payload || {};
    const source = (p.source as string) || "note";
    return {
      sourceType: source as "note" | "book" | "annotation",
      fileId: (p.fileId as string) || "",
      score: point.score ?? 0,
      snippet: ((p.text as string) || "").slice(0, 200),
      ...(source === "book" && {
        bookId: p.bookId as string,
        bookTitle: p.bookTitle as string,
        chapterNumber: p.chapterNumber as number,
        sectionAnchor: p.sectionAnchor as string,
      }),
    };
  });
}
