export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  chatStream(params: {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): AsyncIterable<string>;
}

export interface RetrievedChunk {
  fileId: string;
  fileName: string;
  text: string;
  chunkIndex: number;
  score: number;
}

export interface Citation {
  sourceIndex: number;
  fileId: string;
  fileName: string;
  excerpt: string;
}
