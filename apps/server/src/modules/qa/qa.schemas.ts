import { z } from "zod";

export const askSchema = z.object({
  question: z.string().min(1).max(1000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  })).optional().default([]),
  limit: z.number().int().min(1).max(20).optional(),
  scope: z.enum(["chapter", "book", "connected", "default"]).optional(),
  bookId: z.string().optional(),
  chapterNumber: z.number().int().optional(),
});
