export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type QAScope = "chapter" | "book" | "connected" | "default";

export interface QARequest {
  question: string;
  history?: ChatMessage[];
  limit?: number;
  scope?: QAScope;
  bookId?: string;
  chapterNumber?: number;
}

export interface Citation {
  sourceIndex: number;
  fileId: string;
  fileName: string;
  excerpt: string;
}
