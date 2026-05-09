import type { RetrievedChunk } from "./providers/types.js";

export interface RankedCandidate {
  chunk: RetrievedChunk;
  relevance: number;
  vector?: number[];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) ** 2;
    normB += (b[i] ?? 0) ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Maximal Marginal Relevance selection.
 *
 * Greedily picks candidates that maximize:
 *   λ * relevance_score - (1 - λ) * max_cosine_sim_to_already_selected
 *
 * λ=0.7 weights relevance over diversity. Lower λ = more diverse results.
 * Falls back to same-file penalty (sim=0.85) when vectors are unavailable.
 */
export function mmrSelect(
  candidates: RankedCandidate[],
  limit: number,
  lambda = 0.7,
): RetrievedChunk[] {
  if (candidates.length === 0) return [];

  const selected: RankedCandidate[] = [];
  const remaining = [...candidates];

  while (selected.length < limit && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]!;

      let maxSim = 0;
      for (const sel of selected) {
        let sim: number;
        if (candidate.vector && sel.vector) {
          sim = cosine(candidate.vector, sel.vector);
        } else {
          // vector unavailable: same file is highly redundant, different file is not
          sim = candidate.chunk.fileId === sel.chunk.fileId ? 0.85 : 0.1;
        }
        if (sim > maxSim) maxSim = sim;
      }

      const score = lambda * candidate.relevance - (1 - lambda) * maxSim;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]!);
    remaining.splice(bestIdx, 1);
  }

  return selected.map((s) => s.chunk);
}
