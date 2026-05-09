export type EmbeddingTask = "query" | "document";

export interface RerankResult {
  index: number;
  relevance_score: number;
}

export interface EmbeddingProvider {
  readonly dimensions: number;
  embed(text: string, task: EmbeddingTask): Promise<number[]>;
  embedBatch(texts: string[], task: EmbeddingTask, lateChunking: boolean): Promise<number[][]>;
  rerank(query: string, documents: string[], topN: number): Promise<RerankResult[]>;
}
