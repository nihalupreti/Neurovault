export type EmbeddingTask = "query" | "document";

export interface EmbeddingProvider {
  readonly dimensions: number;
  embed(text: string, task: EmbeddingTask): Promise<number[]>;
  embedBatch(texts: string[], task: EmbeddingTask, lateChunking: boolean): Promise<number[][]>;
}
