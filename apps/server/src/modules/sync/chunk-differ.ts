import { createHash } from "crypto";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface HashedChunk {
  index: number;
  text: string;
  hash: string;
}

export interface ChunkRecord {
  index: number;
  contentHash: string;
  qdrantPointId: string;
}

export interface DiffResult {
  toEmbed: HashedChunk[];
  toDelete: ChunkRecord[];
  unchanged: ChunkRecord[];
}

export function hashChunk(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

export async function splitAndHash(text: string): Promise<HashedChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 0,
  });

  const docs = await splitter.createDocuments([text]);

  return docs.map((doc, i) => ({
    index: i,
    text: doc.pageContent,
    hash: hashChunk(doc.pageContent),
  }));
}

export function diffChunks(
  newChunks: HashedChunk[],
  oldChunks: ChunkRecord[]
): DiffResult {
  const oldByHash = new Map<string, ChunkRecord>();
  const usedOldIds = new Set<string>();

  for (const old of oldChunks) {
    oldByHash.set(old.contentHash, old);
  }

  const toEmbed: HashedChunk[] = [];
  const unchanged: ChunkRecord[] = [];

  for (const chunk of newChunks) {
    const match = oldByHash.get(chunk.hash);
    if (match && !usedOldIds.has(match.qdrantPointId)) {
      unchanged.push(match);
      usedOldIds.add(match.qdrantPointId);
    } else {
      toEmbed.push(chunk);
    }
  }

  const toDelete = oldChunks.filter((old) => !usedOldIds.has(old.qdrantPointId));

  return { toEmbed, toDelete, unchanged };
}
