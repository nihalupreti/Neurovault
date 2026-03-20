import type { Request, Response } from "express";
import { createAnnotation, listAnnotations, updateAnnotation, deleteAnnotation, getProgress, updateProgress } from "./reader.service.js";
import { getRelatedContent } from "./reader.related.js";
import { generateObsidianMarkdown } from "./reader.export.js";
import { Book, BookChapter } from "../books/book.model.js";
import { BookAnnotation } from "./reader.model.js";
import { apiSuccess, apiCreated, apiPaginated } from "../../utils/api-response.js";
import { parsePagination } from "../../utils/pagination.js";
import { AnnotationNotFoundError } from "./reader.errors.js";
import { BookNotFoundError } from "../books/books.errors.js";
import { createAnnotationSchema, updateProgressSchema } from "./reader.schemas.js";

export const handleGetProgress = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  const progress = await getProgress(req.params.bookId);
  return apiSuccess(res, progress);
};

export const handleUpdateProgress = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  const data = updateProgressSchema.parse(req.body);
  const progress = await updateProgress(req.params.bookId, data);
  return apiSuccess(res, progress);
};

export const handleListAnnotations = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  const { page, limit, skip } = parsePagination(req);
  const chapter = req.query.chapter ? parseInt(req.query.chapter as string, 10) : undefined;
  const type = req.query.type as string | undefined;
  const { annotations, total } = await listAnnotations(req.params.bookId, chapter, type, skip, limit);
  return apiPaginated(res, annotations, page, limit, total);
};

export const handleCreateAnnotation = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  const data = createAnnotationSchema.parse(req.body);

  const annotation = await createAnnotation({
    bookId: req.params.bookId,
    ...data,
  });
  return apiCreated(res, annotation);
};

export const handleUpdateAnnotation = async (
  req: Request<{ bookId: string; id: string }>,
  res: Response,
) => {
  const annotation = await updateAnnotation(req.params.id, req.body);
  if (!annotation) throw new AnnotationNotFoundError(req.params.id);
  return apiSuccess(res, annotation);
};

export const handleDeleteAnnotation = async (
  req: Request<{ bookId: string; id: string }>,
  res: Response,
) => {
  const annotation = await deleteAnnotation(req.params.id);
  if (!annotation) throw new AnnotationNotFoundError(req.params.id);
  return apiSuccess(res, { id: req.params.id }, "Deleted");
};

export const handleGetRelated = async (
  req: Request<{ bookId: string; sectionAnchor: string }>,
  res: Response,
) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const results = await getRelatedContent(req.params.bookId, req.params.sectionAnchor, limit);
  return apiSuccess(res, { results });
};

export const handleExportObsidian = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  const book = await Book.findById(req.params.bookId).lean();
  if (!book) throw new BookNotFoundError(req.params.bookId);

  const annotations = await BookAnnotation.find({ bookId: req.params.bookId }).sort({ chapterNumber: 1, createdAt: 1 }).lean();
  const chapters = await BookChapter.find({ bookId: req.params.bookId }).lean();

  const FileModel = (await import("../files/files.model.js")).default;

  const linkedNoteIds = annotations
    .filter((a) => a.linkedNoteId)
    .map((a) => a.linkedNoteId);
  const linkedNotes = linkedNoteIds.length > 0
    ? await FileModel.find({ _id: { $in: linkedNoteIds } }).lean()
    : [];
  const noteMap = new Map(linkedNotes.map((n) => [n._id.toString(), n.name?.replace(/\.md$/i, "") || null]));

  interface ExportAnnotation { type: string; sectionTitle: string; highlightedText: string; noteContent: string | null; linkedNoteName: string | null }
  const grouped = new Map<number, ExportAnnotation[]>();
  for (const ann of annotations) {
    if (!grouped.has(ann.chapterNumber)) grouped.set(ann.chapterNumber, []);
    const section = chapters.find((c) => c.number === ann.chapterNumber)?.sections?.find((s: { anchor?: string }) => s.anchor === ann.sectionAnchor);
    const linkedNoteName = ann.linkedNoteId ? noteMap.get(ann.linkedNoteId.toString()) || null : null;
    grouped.get(ann.chapterNumber)!.push({
      type: ann.type,
      sectionTitle: section?.title || ann.sectionAnchor,
      highlightedText: ann.highlightedText,
      noteContent: ann.noteContent || null,
      linkedNoteName,
    });
  }

  const chapterData = Array.from(grouped.entries()).map(([num, anns]) => ({
    chapterNumber: num,
    chapterTitle: chapters.find((c) => c.number === num)?.title || `Chapter ${num}`,
    annotations: anns,
  }));

  const markdown = generateObsidianMarkdown(book.title, chapterData);

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="reading-notes-${book.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md"`);
  res.send(markdown);
};
