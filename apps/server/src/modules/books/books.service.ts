import crypto from "node:crypto";
import { Book, BookChapter } from "./book.model.js";
import { parseBookHtml } from "./books.parser.js";
import { chunkAndEmbedBook } from "./books.chunker.js";
import { createBookGraphNodes, deleteBookGraphNodes, runBookSimilarityJob } from "./books.graph.js";

export interface ImportResult {
  bookId: string;
  title: string;
  totalChapters: number;
  chunksCreated: number;
  edgesCreated: number;
  skipped: boolean;
}

export async function importBook(html: string): Promise<ImportResult> {
  const htmlHash = crypto.createHash("sha256").update(html).digest("hex");

  const existing = await Book.findOne({ htmlHash });
  if (existing) {
    return {
      bookId: existing._id.toString(),
      title: existing.title,
      totalChapters: existing.totalChapters,
      chunksCreated: 0,
      edgesCreated: 0,
      skipped: true,
    };
  }

  const parsed = parseBookHtml(html);

  const book = await Book.create({
    title: parsed.title,
    topic: parsed.topic,
    htmlHash,
    totalChapters: parsed.chapters.length,
    chapters: parsed.chapters.map((ch) => ({
      number: ch.number,
      title: ch.title,
      sectionAnchors: ch.sections.map((s) => s.anchor),
    })),
  });

  const bookId = book._id.toString();

  for (const ch of parsed.chapters) {
    await BookChapter.create({
      bookId: book._id,
      number: ch.number,
      title: ch.title,
      htmlContent: ch.htmlContent,
      sections: ch.sections,
    });
  }

  const chunksCreated = await chunkAndEmbedBook({
    bookId,
    bookTitle: parsed.title,
    chapters: parsed.chapters.map((ch) => ({
      number: ch.number,
      plainText: ch.plainText,
      sections: ch.sections,
    })),
  });

  await createBookGraphNodes(
    bookId,
    parsed.title,
    parsed.topic,
    parsed.chapters.map((ch) => ({
      number: ch.number,
      title: ch.title,
      sections: ch.sections,
    })),
  );

  const edgesCreated = await runBookSimilarityJob(bookId);

  return { bookId, title: parsed.title, totalChapters: parsed.chapters.length, chunksCreated, edgesCreated, skipped: false };
}

export async function deleteBook(bookId: string): Promise<void> {
  const { getQdrantClient } = await import("@neurovault/config");
  const ChunkText = (await import("../search/chunk-text.model.js")).default;

  await getQdrantClient().delete("neurovault", {
    filter: { must: [{ key: "bookId", match: { value: bookId } }] },
  });
  await ChunkText.deleteMany({ bookId });
  await deleteBookGraphNodes(bookId);
  await BookChapter.deleteMany({ bookId });
  await Book.findByIdAndDelete(bookId);
}
