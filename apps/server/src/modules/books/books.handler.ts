import type { Request, Response } from "express";
import { Book, BookChapter } from "./book.model.js";
import { importBook, importEpubFile, deleteBook } from "./books.service.js";
import { apiSuccess, apiCreated, apiPaginated } from "../../utils/api-response.js";
import { parsePagination } from "../../utils/pagination.js";
import { BookNotFoundError, ChapterNotFoundError, NoFileUploadedError } from "./books.errors.js";

export const handleImport = async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new NoFileUploadedError();

  const isEpub = file.originalname.toLowerCase().endsWith(".epub") ||
    file.mimetype === "application/epub+zip";

  try {
    if (isEpub) {
      const result = await importEpubFile(file.path);
      if (result.skipped) {
        return apiSuccess(res, { bookId: result.bookId, title: result.title }, "Book already imported");
      }
      return apiCreated(res, result);
    }

    const fs = await import("node:fs/promises");
    const html = await fs.readFile(file.path, "utf-8");
    const result = await importBook(html);

    if (result.skipped) {
      return apiSuccess(res, { bookId: result.bookId, title: result.title }, "Book already imported");
    }

    return apiCreated(res, result);
  } finally {
    const fs = await import("node:fs/promises");
    await fs.unlink(file.path).catch(() => {});
  }
};

export const handleListBooks = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req);
  const [books, total] = await Promise.all([
    Book.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Book.countDocuments(),
  ]);
  return apiPaginated(res, books, page, limit, total);
};

export const handleGetBook = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const book = await Book.findById(req.params.id).lean();
  if (!book) throw new BookNotFoundError(req.params.id);
  return apiSuccess(res, book);
};

export const handleGetChapter = async (
  req: Request<{ id: string; num: string }>,
  res: Response,
) => {
  const chapter = await BookChapter.findOne({
    bookId: req.params.id,
    number: parseInt(req.params.num, 10),
  }).lean();
  if (!chapter) throw new ChapterNotFoundError(req.params.num);
  return apiSuccess(res, chapter);
};

export const handleDeleteBook = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw new BookNotFoundError(req.params.id);
  await deleteBook(req.params.id);
  return apiSuccess(res, { bookId: req.params.id }, "Book deleted");
};
