import { Worker } from "bullmq";
import { getRedisConnection } from "./worker.connection.js";
import type { ChunkFileJob, ChunkBookJob } from "./worker.queues.js";
import { handleFileUpload } from "../chunker/chunker.dispatcher.js";
import { onFileIndexed } from "../files/files.graph-hook.js";
import { chunkAndEmbedBook } from "../books/books.chunker.js";
import { createBookGraphNodes, runBookSimilarityJob } from "../books/books.graph.js";
import { Book, BookChapter } from "../books/book.model.js";

export function startWorkers(): void {
  const fileWorker = new Worker<ChunkFileJob>(
    "chunk-file",
    async (job) => {
      const { filePath, fileId } = job.data;
      await handleFileUpload(filePath, fileId);
      await onFileIndexed(filePath, fileId);
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  fileWorker.on("failed", (job, err) => {
    console.error(`chunk-file job failed for ${job?.data.filePath}:`, err);
  });

  const bookWorker = new Worker<ChunkBookJob>(
    "chunk-book",
    async (job) => {
      const { bookId } = job.data;

      await Book.findByIdAndUpdate(bookId, { indexingStatus: "indexing" });

      const book = await Book.findById(bookId).lean();
      if (!book) throw new Error(`Book ${bookId} not found`);

      const chapters = await BookChapter.find({ bookId }).sort({ number: 1 }).lean();

      await chunkAndEmbedBook({
        bookId,
        bookTitle: book.title,
        chapters: chapters.map((ch) => ({
          number: ch.number,
          plainText: ch.plainText || "",
          sections: ch.sections,
        })),
      });

      await createBookGraphNodes(
        bookId,
        book.title,
        book.topic || "",
        chapters.map((ch) => ({
          number: ch.number,
          title: ch.title,
          sections: ch.sections,
        })),
      );

      await runBookSimilarityJob(bookId);

      await Book.findByIdAndUpdate(bookId, { indexingStatus: "ready" });
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  bookWorker.on("failed", async (job, err) => {
    console.error(`chunk-book job failed for ${job?.data.bookId}:`, err);
    if (job) {
      await Book.findByIdAndUpdate(job.data.bookId, { indexingStatus: "failed" }).catch(() => {});
    }
  });

  console.log("Workers started: chunk-file (concurrency 2), chunk-book (concurrency 1)");
}
