import type { Request, Response } from "express";
import { Book, BookChapter } from "./book.model.js";
import { importBook, deleteBook } from "./books.service.js";

export const handleImport = async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No HTML file uploaded" });

  try {
    const fs = await import("node:fs/promises");
    const html = await fs.readFile(file.path, "utf-8");
    const result = await importBook(html);

    if (result.skipped) {
      return res.json({
        message: "Book already imported",
        bookId: result.bookId,
        title: result.title,
      });
    }

    res.status(201).json(result);
  } catch (err) {
    console.error("Book import failed:", err);
    res.status(500).json({ error: "Import failed" });
  } finally {
    const fs = await import("node:fs/promises");
    await fs.unlink(file.path).catch(() => {});
  }
};

export const handleListBooks = async (_req: Request, res: Response) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 }).lean();
    res.json({ books });
  } catch (err) {
    res.status(500).json({ error: "Failed to list books" });
  }
};

export const handleGetBook = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: "Failed to get book" });
  }
};

export const handleGetChapter = async (
  req: Request<{ id: string; num: string }>,
  res: Response,
) => {
  try {
    const chapter = await BookChapter.findOne({
      bookId: req.params.id,
      number: parseInt(req.params.num, 10),
    }).lean();
    if (!chapter) return res.status(404).json({ error: "Chapter not found" });
    res.json(chapter);
  } catch (err) {
    res.status(500).json({ error: "Failed to get chapter" });
  }
};

export const handleDeleteBook = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    await deleteBook(req.params.id);
    res.json({ message: "Book deleted", bookId: req.params.id });
  } catch (err) {
    console.error("Book delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};
