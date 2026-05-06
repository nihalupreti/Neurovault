export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type QAScope = "chapter" | "book" | "connected" | "default";

export interface ContextItem {
  type: "selection" | "file";
  fileId: string;
  fileName: string;
  excerpt?: string;
}

export interface QARequest {
  question: string;
  history?: ChatMessage[];
  limit?: number;
  scope?: QAScope;
  bookId?: string;
  chapterNumber?: number;
  contextItems?: ContextItem[];
}

export interface Citation {
  sourceIndex: number;
  fileId: string;
  fileName: string;
  excerpt: string;
}

export type ConversationContext = "book" | "file" | "vault";

export interface Conversation {
  _id: string;
  contextType: ConversationContext;
  contextId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface CreateConversationRequest {
  contextType: ConversationContext;
  contextId: string;
}

export interface RenameConversationRequest {
  title: string;
}
