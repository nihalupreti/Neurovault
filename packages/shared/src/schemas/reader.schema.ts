import { z } from "zod";

export const createAnnotationSchema = z.object({
  chapterNumber: z.number().int(),
  sectionAnchor: z.string().min(1),
  type: z.enum(["highlight", "note", "vault-link"]),
  textRange: z.object({
    startOffset: z.number().int(),
    endOffset: z.number().int(),
  }),
  highlightedText: z.string().min(1),
  color: z.string().optional(),
  noteContent: z.string().optional(),
  linkedNoteId: z.string().optional(),
});

export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;

export const updateProgressSchema = z.object({
  currentChapter: z.number().int().optional(),
  scrollPosition: z.number().optional(),
  chaptersCompleted: z.array(z.number().int()).optional(),
  timeSpentMinutes: z.record(z.string(), z.number()).optional(),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
