import { createHash } from "crypto";
import { splitContent } from "../chunker/chunker.pipeline.js";
import { MarkdownParser } from "../chunker/parsers/markdown.parser.js";

export interface HashedChunk {
  index: number;
  text: string;
  hash: string;
  headingPath: string[];
  sectionContent: string;
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

const markdownParser = new MarkdownParser();

export function hashChunk(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

export function splitAndHash(text: string): HashedChunk[] {
  const chunks = splitContent(text, markdownParser);
  return chunks.map((chunk) => ({
    index: chunk.chunkIndex,
    text: chunk.text,
    hash: chunk.contentHash,
    headingPath: chunk.headingPath,
    sectionContent: chunk.sectionContent,
  }));
}

export function diffChunks(newChunks: HashedChunk[], oldChunks: ChunkRecord[]): DiffResult {
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
