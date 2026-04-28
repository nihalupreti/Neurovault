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
  conversationId: z.string().optional(),
});

export type AskInput = z.infer<typeof askSchema>;

export const createConversationSchema = z.object({
  contextType: z.enum(["book", "file", "vault"]),
  contextId: z.string().min(1),
});

export const renameConversationSchema = z.object({
  title: z.string().min(1).max(100),
});
