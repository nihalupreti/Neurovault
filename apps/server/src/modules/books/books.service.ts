import crypto from "node:crypto";
import { Book, BookChapter } from "./book.model.js";
import { parseBookHtml } from "./books.parser.js";
import { deleteBookGraphNodes } from "./books.graph.js";
import { getBookQueue } from "../worker/worker.queues.js";

export interface ImportResult {
  bookId: string;
  title: string;
  totalChapters: number;
  jobId?: string;
  status: "processing" | "skipped";
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
      status: "skipped" as const,
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
      plainText: ch.plainText,
      sections: ch.sections,
    });
  }

  const job = await getBookQueue().add("chunk-book", { bookId });

  return {
    bookId,
    title: parsed.title,
    totalChapters: parsed.chapters.length,
    jobId: job.id!,
    status: "processing" as const,
    skipped: false,
  };
}

export async function deleteBook(bookId: string): Promise<void> {
  const { getQdrantClient } = await import("@neurovault/config");
  const ChunkText = (await import("../search/search.chunk-text.model.js")).default;

  await getQdrantClient().delete("neurovault", {
    filter: { must: [{ key: "bookId", match: { value: bookId } }] },
  });
  await ChunkText.deleteMany({ bookId });
  await deleteBookGraphNodes(bookId);
  await BookChapter.deleteMany({ bookId });
  await Book.findByIdAndDelete(bookId);
}
