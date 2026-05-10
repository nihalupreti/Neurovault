import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Book, BookChapter } from "./book.model.js";
import { parseBookHtml } from "./books.parser.js";
import { parseEpub } from "./books.epub-parser.js";
import { deleteBookGraphNodes } from "./books.graph.js";
import { getBookQueue } from "../worker/worker.queues.js";
import { InvalidEpubError } from "./books.errors.js";

export interface ImportResult {
  bookId: string;
  title: string;
  totalChapters: number;
  jobId?: string;
  status: "processing" | "skipped";
  skipped: boolean;
}

const MAX_TOTAL_ASSET_SIZE = 200 * 1024 * 1024;
const MAX_SINGLE_IMAGE_SIZE = 10 * 1024 * 1024;

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
    format: "html",
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

export async function importEpubFile(filePath: string): Promise<ImportResult> {
  const fileBuffer = await fs.readFile(filePath);
  const epubHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const existing = await Book.findOne({ htmlHash: epubHash });
  if (existing) {
    return {
      bookId: existing._id.toString(),
      title: existing.title,
      totalChapters: existing.totalChapters,
      status: "skipped" as const,
      skipped: true,
    };
  }

  const bookDoc = await Book.create({
    title: "Processing...",
    htmlHash: epubHash,
    format: "epub",
    indexingStatus: "pending",
    totalChapters: 0,
  });

  const bookId = bookDoc._id.toString();

  let parsed;
  try {
    parsed = await parseEpub(filePath, bookId);
  } catch (err) {
    await Book.findByIdAndDelete(bookId);
    throw new InvalidEpubError(err instanceof Error ? err.message : "Parse failed");
  }

  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  const bookAssetsDir = path.resolve(uploadDir, "books", bookId);

  let totalAssetSize = 0;
  for (const img of parsed.assets.images) {
    totalAssetSize += img.data.length;
  }
  for (const font of parsed.assets.fonts) {
    totalAssetSize += font.data.length;
  }
  if (totalAssetSize > MAX_TOTAL_ASSET_SIZE) {
    await Book.findByIdAndDelete(bookId);
    throw new InvalidEpubError("Total asset size exceeds 200MB limit");
  }

  await fs.mkdir(path.join(bookAssetsDir, "images"), { recursive: true });
  await fs.mkdir(path.join(bookAssetsDir, "fonts"), { recursive: true });

  for (const img of parsed.assets.images) {
    if (img.data.length > MAX_SINGLE_IMAGE_SIZE) continue;
    const dest = path.join(bookAssetsDir, img.filename);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, img.data);
  }

  for (const font of parsed.assets.fonts) {
    const dest = path.join(bookAssetsDir, font.filename);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, font.data);
  }

  let coverPath: string | undefined;
  if (parsed.assets.coverFilename) {
    const coverSrc = parsed.assets.images.find((i) => i.filename === parsed.assets.coverFilename);
    if (coverSrc) {
      const ext = path.extname(parsed.assets.coverFilename);
      coverPath = `books/${bookId}/cover${ext}`;
      await fs.writeFile(path.resolve(uploadDir, coverPath), coverSrc.data);
    }
  }

  await Book.findByIdAndUpdate(bookId, {
    title: parsed.metadata.title,
    author: parsed.metadata.author,
    publisher: parsed.metadata.publisher,
    description: parsed.metadata.description,
    language: parsed.metadata.language,
    publishedDate: parsed.metadata.publishedDate,
    coverPath,
    totalChapters: parsed.chapters.length,
    chapters: parsed.chapters.map((ch) => ({
      number: ch.number,
      title: ch.title,
      sectionAnchors: ch.sections.map((s) => s.anchor),
    })),
  });

  for (const ch of parsed.chapters) {
    await BookChapter.create({
      bookId,
      number: ch.number,
      title: ch.title,
      htmlContent: ch.htmlContent,
      plainText: ch.plainText,
      scopedCss: ch.scopedCss || undefined,
      sections: ch.sections,
    });
  }

  const job = await getBookQueue().add("chunk-book", { bookId });

  return {
    bookId,
    title: parsed.metadata.title,
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

  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  const bookAssetsDir = path.resolve(uploadDir, "books", bookId);
  await fs.rm(bookAssetsDir, { recursive: true, force: true }).catch(() => {});
}
