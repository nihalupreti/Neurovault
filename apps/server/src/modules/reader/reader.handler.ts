import type { Request, Response } from "express";
import { createAnnotation, listAnnotations, updateAnnotation, deleteAnnotation, getProgress, updateProgress } from "./reader.service.js";
import { getRelatedContent } from "./reader.related.js";
import { generateObsidianMarkdown } from "./reader.export.js";
import { Book, BookChapter } from "../books/book.model.js";
import { BookAnnotation } from "./reader.model.js";

export const handleGetProgress = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  try {
    const progress = await getProgress(req.params.bookId);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: "Failed to get progress" });
  }
};

export const handleUpdateProgress = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  try {
    const { currentChapter, scrollPosition, chaptersCompleted, timeSpentMinutes } = req.body;
    const progress = await updateProgress(req.params.bookId, {
      currentChapter,
      scrollPosition,
      chaptersCompleted,
      timeSpentMinutes,
    });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: "Failed to update progress" });
  }
};

export const handleListAnnotations = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  try {
    const chapter = req.query.chapter ? parseInt(req.query.chapter as string, 10) : undefined;
    const type = req.query.type as string | undefined;
    const annotations = await listAnnotations(req.params.bookId, chapter, type);
    res.json({ annotations });
  } catch (err) {
    res.status(500).json({ error: "Failed to list annotations" });
  }
};

const VALID_ANNOTATION_TYPES = new Set(["highlight", "note", "vault-link"]);

export const handleCreateAnnotation = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  try {
    const { chapterNumber, sectionAnchor, type, textRange, highlightedText, color, noteContent, linkedNoteId } = req.body;

    if (typeof chapterNumber !== "number" || !sectionAnchor || !VALID_ANNOTATION_TYPES.has(type)) {
      return res.status(400).json({ error: "chapterNumber (number), sectionAnchor, and valid type required" });
    }
    if (!textRange?.startOffset == null || textRange?.endOffset == null) {
      return res.status(400).json({ error: "textRange with startOffset and endOffset required" });
    }
    if (!highlightedText || typeof highlightedText !== "string") {
      return res.status(400).json({ error: "highlightedText is required" });
    }

    const annotation = await createAnnotation({
      bookId: req.params.bookId,
      chapterNumber,
      sectionAnchor,
      type,
      textRange,
      highlightedText,
      color,
      noteContent,
      linkedNoteId,
    });
    res.status(201).json(annotation);
  } catch (err) {
    console.error("Annotation creation failed:", err);
    res.status(500).json({ error: "Failed to create annotation" });
  }
};

export const handleUpdateAnnotation = async (
  req: Request<{ bookId: string; id: string }>,
  res: Response,
) => {
  try {
    const annotation = await updateAnnotation(req.params.id, req.body);
    if (!annotation) return res.status(404).json({ error: "Annotation not found" });
    res.json(annotation);
  } catch (err) {
    res.status(500).json({ error: "Failed to update annotation" });
  }
};

export const handleDeleteAnnotation = async (
  req: Request<{ bookId: string; id: string }>,
  res: Response,
) => {
  try {
    const annotation = await deleteAnnotation(req.params.id);
    if (!annotation) return res.status(404).json({ error: "Annotation not found" });
    res.json({ message: "Deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete annotation" });
  }
};

export const handleGetRelated = async (
  req: Request<{ bookId: string; sectionAnchor: string }>,
  res: Response,
) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const results = await getRelatedContent(req.params.bookId, req.params.sectionAnchor, limit);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: "Failed to get related content" });
  }
};

export const handleExportObsidian = async (
  req: Request<{ bookId: string }>,
  res: Response,
) => {
  try {
    const book = await Book.findById(req.params.bookId).lean();
    if (!book) return res.status(404).json({ error: "Book not found" });

    const annotations = await BookAnnotation.find({ bookId: req.params.bookId }).sort({ chapterNumber: 1, createdAt: 1 }).lean();
    const chapters = await BookChapter.find({ bookId: req.params.bookId }).lean();

    const FileModel = (await import("../files/fileMetadata.model.js")).default;

    const linkedNoteIds = annotations
      .filter((a) => a.linkedNoteId)
      .map((a) => a.linkedNoteId);
    const linkedNotes = linkedNoteIds.length > 0
      ? await FileModel.find({ _id: { $in: linkedNoteIds } }).lean()
      : [];
    const noteMap = new Map(linkedNotes.map((n: any) => [n._id.toString(), n.name?.replace(/\.md$/i, "") || null]));

    const grouped = new Map<number, any[]>();
    for (const ann of annotations) {
      if (!grouped.has(ann.chapterNumber)) grouped.set(ann.chapterNumber, []);
      const section = chapters.find((c) => c.number === ann.chapterNumber)?.sections?.find((s: any) => s.anchor === ann.sectionAnchor);
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
  } catch (err) {
    console.error("Obsidian export failed:", err);
    res.status(500).json({ error: "Export failed" });
  }
};
