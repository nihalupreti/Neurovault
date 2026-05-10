import { Worker } from "bullmq";
import { getRedisConnection } from "./worker.connection.js";
import type {
  ChunkFileJob,
  ChunkBookJob,
  CaptureUrlJob,
  SyncIndexJob,
  BookSimilarityJob,
  GraphIndexJob,
} from "./worker.queues.js";
import { getBookSimilarityQueue, getGraphIndexQueue } from "./worker.queues.js";
import { handleFileUpload } from "../chunker/chunker.dispatcher.js";
import { onFileIndexed } from "../files/files.graph-hook.js";
import { chunkAndEmbedBook } from "../books/books.chunker.js";
import { createBookGraphNodes, runBookSimilarityJob } from "../books/books.graph.js";
import { Book, BookChapter } from "../books/book.model.js";
import { processUrlInBackground } from "../capture/capture.service.js";
import { runIndexPipeline } from "../sync/sync.index-pipeline.js";

export function startWorkers(): void {
  const fileWorker = new Worker<ChunkFileJob>(
    "chunk-file",
    async (job) => {
      const { filePath, fileId } = job.data;
      await handleFileUpload(filePath, fileId);
      await getGraphIndexQueue().add("graph-index", { filePath, fileId });
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

      await getBookSimilarityQueue().add("book-similarity", { bookId });
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  bookWorker.on("failed", async (job, err) => {
    console.error(`chunk-book job failed for ${job?.data.bookId}:`, err);
    if (job) {
      await Book.findByIdAndUpdate(job.data.bookId, { indexingStatus: "failed" }).catch(() => {});
    }
  });

  const captureWorker = new Worker<CaptureUrlJob>(
    "capture-url",
    async (job) => {
      const { url, fileId, serverPath, note } = job.data;
      await processUrlInBackground(url, fileId, serverPath, note);
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );

  captureWorker.on("failed", (job, err) => {
    console.error(`capture-url job failed for ${job?.data.url}:`, err);
  });

  const syncIndexWorker = new Worker<SyncIndexJob>(
    "sync-index",
    async (job) => {
      const { vaultId, gitPath, fromSha, toSha, include, exclude } = job.data;
      await runIndexPipeline(vaultId, gitPath, fromSha, toSha, include, exclude);
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  syncIndexWorker.on("failed", (job, err) => {
    console.error(`sync-index job failed for vault ${job?.data.vaultId}:`, err);
  });

  const bookSimilarityWorker = new Worker<BookSimilarityJob>(
    "book-similarity",
    async (job) => {
      const { bookId } = job.data;
      await runBookSimilarityJob(bookId);
      await Book.findByIdAndUpdate(bookId, { indexingStatus: "ready" });
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  bookSimilarityWorker.on("failed", async (job, err) => {
    console.error(`book-similarity job ${job?.id} failed for ${job?.data.bookId}:`, err);
    if (job) {
      await Book.findByIdAndUpdate(job.data.bookId, { indexingStatus: "failed" }).catch(() => {});
    }
  });

  const graphIndexWorker = new Worker<GraphIndexJob>(
    "graph-index",
    async (job) => {
      const { filePath, fileId } = job.data;
      await onFileIndexed(filePath, fileId);
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  graphIndexWorker.on("failed", (job, err) => {
    console.error(`graph-index job ${job?.id} failed for ${job?.data.fileId}:`, err);
  });

  console.log(
    "Workers started: chunk-file (2), chunk-book (1), capture-url (3), sync-index (2), book-similarity (1), graph-index (2)",
  );
}
