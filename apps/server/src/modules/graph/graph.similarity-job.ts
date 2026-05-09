import { getQdrantClient } from "@neurovault/config";
import fileModel from "../files/files.model.js";
import { upsertSimilarEdges, upsertFileNode, runLouvain } from "./graph.service.js";
import type { SimilarEdgeInput, ChunkPair } from "@neurovault/shared/types";

const COLLECTION = "neurovault";

interface RawChunkMatch {
  targetFileId: string;
  sourceIdx: number;
  targetIdx: number;
  score: number;
}

export function aggregateChunkSimilarities(
  raw: RawChunkMatch[],
  threshold: number,
  maxPerFile: number,
): SimilarEdgeInput[] {
  const grouped = new Map<string, { score: number; chunkPairs: ChunkPair[] }>();

  for (const match of raw) {
    const existing = grouped.get(match.targetFileId);
    const pair: ChunkPair = {
      sourceIdx: match.sourceIdx,
      targetIdx: match.targetIdx,
      score: match.score,
    };

    if (existing) {
      existing.chunkPairs.push(pair);
      if (match.score > existing.score) existing.score = match.score;
    } else {
      grouped.set(match.targetFileId, {
        score: match.score,
        chunkPairs: [pair],
      });
    }
  }

  return Array.from(grouped.entries())
    .filter(([, v]) => v.score >= threshold)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, maxPerFile)
    .map(([targetFileId, v]) => ({
      targetFileId,
      score: v.score,
      chunkPairs: v.chunkPairs,
    }));
}

export async function runSimilarityJob(_options?: {
  full?: boolean;
}): Promise<{ processed: number; edgesCreated: number }> {
  const threshold = parseFloat(process.env.GRAPH_SIMILARITY_THRESHOLD || "0.7");
  const maxPerFile = parseInt(process.env.GRAPH_MAX_SIMILAR_PER_FILE || "5", 10);
  const chunkNeighbors = parseInt(process.env.GRAPH_CHUNKS_NEIGHBORS || "10", 10);

  const client = getQdrantClient();
  const files = await fileModel.find({ type: "file" });

  let totalEdges = 0;

  for (const file of files) {
    const fileId = file._id.toString();
    await upsertFileNode(fileId, file.name, file.serverPath || "");

    const scrollResult = await client.scroll(COLLECTION, {
      filter: { must: [{ key: "fileId", match: { value: fileId } }] },
      with_vector: true,
      with_payload: true,
      limit: 100,
    });

    const chunks = scrollResult.points || [];
    if (chunks.length === 0) continue;

    const rawMatches: RawChunkMatch[] = [];

    const queryResults = await Promise.all(
      chunks.map((chunk) =>
        client.query(COLLECTION, {
          query: chunk.vector as number[],
          limit: chunkNeighbors,
          filter: { must_not: [{ key: "fileId", match: { value: fileId } }] },
          with_payload: true,
        }),
      ),
    );

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx]!;
      const payload = chunk.payload as Record<string, unknown> | undefined;
      const sourceIdx = typeof payload?.chunk_index === "number" ? payload.chunk_index : 0;
      const similar = queryResults[idx]!;

      for (const point of similar.points || []) {
        const pointPayload = point.payload as Record<string, unknown> | undefined;
        rawMatches.push({
          targetFileId: typeof pointPayload?.fileId === "string" ? pointPayload.fileId : "",
          sourceIdx,
          targetIdx: typeof pointPayload?.chunk_index === "number" ? pointPayload.chunk_index : 0,
          score: point.score ?? 0,
        });
      }
    }

    const edges = aggregateChunkSimilarities(rawMatches, threshold, maxPerFile);
    await upsertSimilarEdges(fileId, edges);
    totalEdges += edges.length;
  }

  try {
    await runLouvain();
  } catch (err) {
    console.error("Louvain failed (GDS may not be installed):", err);
  }

  return { processed: files.length, edgesCreated: totalEdges };
}
