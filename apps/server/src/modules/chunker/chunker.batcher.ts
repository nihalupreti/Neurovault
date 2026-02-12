import type { PreparedChunk, ChunkBatch } from "./parsers/parser.types.js";

const DEFAULT_TOKEN_LIMIT = 8192;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildBatches(
  chunks: PreparedChunk[],
  tokenLimit = DEFAULT_TOKEN_LIMIT
): ChunkBatch[] {
  if (chunks.length === 0) return [];

  const batches: ChunkBatch[] = [];
  let currentChunks: PreparedChunk[] = [];
  let currentTokens = 0;

  for (const chunk of chunks) {
    const tokens = estimateTokens(chunk.text);

    if (currentChunks.length > 0 && currentTokens + tokens > tokenLimit) {
      batches.push({ chunks: currentChunks, totalTokenEstimate: currentTokens });
      currentChunks = [];
      currentTokens = 0;
    }

    currentChunks.push(chunk);
    currentTokens += tokens;
  }

  if (currentChunks.length > 0) {
    batches.push({ chunks: currentChunks, totalTokenEstimate: currentTokens });
  }

  return batches;
}
