interface RRFItem {
  id: string;
  payload: any;
}

interface FusedResult {
  id: string;
  score: number;
  payload: any;
}

export function reciprocalRankFusion(
  resultSets: RRFItem[][],
  k: number = 60
): FusedResult[] {
  const scores = new Map<string, { score: number; payload: any }>();

  for (const results of resultSets) {
    for (let rank = 0; rank < results.length; rank++) {
      const item = results[rank]!;
      const rrfScore = 1 / (k + rank + 1);
      const existing = scores.get(item.id);

      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(item.id, { score: rrfScore, payload: item.payload });
      }
    }
  }

  return Array.from(scores.entries())
    .map(([id, { score, payload }]) => ({ id, score, payload }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
