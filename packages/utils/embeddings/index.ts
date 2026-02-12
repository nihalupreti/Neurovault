import { JinaProvider } from './jina.provider.js';
import type { EmbeddingTask } from './types.js';

export type { EmbeddingTask };
export type { EmbeddingProvider } from './types.js';

export const embeddingProvider = new JinaProvider();

export function getEmbeddings(text: string, task: EmbeddingTask = 'document'): Promise<number[]> {
  return embeddingProvider.embed(text, task);
}

export function getEmbeddingsBatch(
  texts: string[],
  task: EmbeddingTask = 'document',
  lateChunking = false
): Promise<number[][]> {
  return embeddingProvider.embedBatch(texts, task, lateChunking);
}
