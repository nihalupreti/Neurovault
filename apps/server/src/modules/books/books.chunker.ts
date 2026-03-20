import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { getQdrantClient } from "@neurovault/config";
import { getEmbeddings } from "@neurovault/utils/embeddings";
import { v4 as uuidv4 } from "uuid";
import ChunkText from "../search/search.chunk-text.model.js";

const COLLECTION = "neurovault";

interface ChunkInput {
  bookId: string;
  bookTitle: string;
  chapters: {
    number: number;
    plainText: string;
    sections: { anchor: string; title: string; level: number }[];
  }[];
}

export async function chunkAndEmbedBook(input: ChunkInput): Promise<number> {
  const client = getQdrantClient();

  await client.delete(COLLECTION, {
    filter: { must: [{ key: "bookId", match: { value: input.bookId } }] },
  });
  await ChunkText.deleteMany({ bookId: input.bookId });

  const splitter = new MarkdownTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
  });
  const allPoints: Array<{
    id: string;
    vector: number[];
    payload: Record<string, unknown>;
  }> = [];
  const allChunkDocs: Array<Record<string, unknown>> = [];

  for (const chapter of input.chapters) {
    if (!chapter.plainText.trim()) continue;

    const docs = await splitter.createDocuments([chapter.plainText]);
    const firstSection = chapter.sections[0]?.anchor || "";

    for (let i = 0; i < docs.length; i++) {
      const text = docs[i]!.pageContent;
      if (!text.trim()) continue;

      const embedding = await getEmbeddings(text);

      allPoints.push({
        id: uuidv4(),
        vector: embedding,
        payload: {
          text,
          fileId: input.bookId,
          chunk_index: i,
          source: "book",
          bookId: input.bookId,
          bookTitle: input.bookTitle,
          chapterNumber: chapter.number,
          sectionAnchor: firstSection,
        },
      });

      allChunkDocs.push({
        fileId: input.bookId,
        chunkIndex: i,
        text,
        source: "book",
        bookId: input.bookId,
        chapterNumber: chapter.number,
        sectionAnchor: firstSection,
        bookTitle: input.bookTitle,
      });
    }
  }

  if (allPoints.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < allPoints.length; i += batchSize) {
      await client.upsert(COLLECTION, {
        wait: true,
        points: allPoints.slice(i, i + batchSize),
      });
    }
    await ChunkText.insertMany(allChunkDocs);
  }

  return allPoints.length;
}
