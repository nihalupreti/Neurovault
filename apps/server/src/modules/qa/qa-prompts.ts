import type { RetrievedChunk } from "./providers/types.js";

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const contextBlocks = chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}] ${chunk.fileName}\n"${chunk.text}"`
    )
    .join("\n\n");

  return `You are a knowledgeable assistant that answers questions using ONLY the provided context from the user's personal notes.

Rules:
- Answer based solely on the provided context
- If the context doesn't contain enough information, say so clearly
- Reference sources by their [Source N] tags when making claims
- Be concise and direct

Context:
---
${contextBlocks}
---`;
}
