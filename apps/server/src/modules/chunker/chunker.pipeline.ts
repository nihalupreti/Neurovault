import { randomUUID } from "crypto";
import { getQdrantClient } from "@neurovault/config";
import { getEmbeddingsBatch } from "@neurovault/utils/embeddings";
import ChunkText from "../search/search.chunk-text.model.js";
import SectionContent from "./chunker.section.model.js";
import { flattenSections, splitSectionIntoChunks } from "./chunker.splitter.js";
import { buildBatches } from "./chunker.batcher.js";
import { sectionId } from "./parsers/parser.types.js";
import type { ContentParser, PreparedChunk } from "./parsers/parser.types.js";

const COLLECTION_NAME = "neurovault";
const QDRANT_BATCH_SIZE = 50;

export function splitContent(
  content: string,
  parser: ContentParser,
  metadata?: Record<string, string>
): PreparedChunk[] {
  const tree = parser.parse(content, metadata);
  const sections = flattenSections(tree);

  const allChunks: PreparedChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const chunks = splitSectionIntoChunks(section, chunkIndex);
    allChunks.push(...chunks);
    chunkIndex += chunks.length;
  }

  return allChunks;
}

export async function processContent(
  content: string,
  fileId: string,
  parser: ContentParser,
  metadata?: Record<string, string>
): Promise<number> {
  const chunks = splitContent(content, parser, metadata);
  if (chunks.length === 0) return 0;

  const batches = buildBatches(chunks);
  const client = getQdrantClient();
  const source = metadata?.source ?? "note";

  const allPoints: Array<{
    id: string;
    vector: number[];
    payload: Record<string, unknown>;
  }> = [];
  const allChunkDocs: Array<Record<string, unknown>> = [];
  const sectionDocs = new Map<string, { sectionId: string; headingPath: string[]; content: string; fileId: string }>();

  for (const batch of batches) {
    const texts = batch.chunks.map((c) => c.text);
    const vectors = await getEmbeddingsBatch(texts, "document", true);

    for (let i = 0; i < batch.chunks.length; i++) {
      const chunk = batch.chunks[i]!;
      const vector = vectors[i]!;
      const sid = sectionId(chunk.headingPath);
      const pointId = randomUUID();

      const payload: Record<string, unknown> = {
        text: chunk.text,
        fileId,
        chunk_index: chunk.chunkIndex,
        headingPath: chunk.headingPath,
        sectionId: sid,
        source,
      };

      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          if (key !== "source" && !(key in payload)) {
            payload[key] = value;
          }
        }
      }

      allPoints.push({ id: pointId, vector, payload });

      allChunkDocs.push({
        fileId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        headingPath: chunk.headingPath,
        sectionId: sid,
        source,
        ...(metadata?.bookId ? { bookId: metadata.bookId } : {}),
        ...(metadata?.chapterNumber ? { chapterNumber: Number(metadata.chapterNumber) } : {}),
        ...(metadata?.sectionAnchor ? { sectionAnchor: metadata.sectionAnchor } : {}),
        ...(metadata?.bookTitle ? { bookTitle: metadata.bookTitle } : {}),
      });

      if (!sectionDocs.has(sid)) {
        sectionDocs.set(sid, {
          sectionId: sid,
          headingPath: chunk.headingPath,
          content: chunk.sectionContent,
          fileId,
        });
      }
    }
  }

  await ChunkText.deleteMany({ fileId });
  await SectionContent.deleteMany({ fileId });

  for (let i = 0; i < allPoints.length; i += QDRANT_BATCH_SIZE) {
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: allPoints.slice(i, i + QDRANT_BATCH_SIZE),
    });
  }

  if (allChunkDocs.length > 0) {
    await ChunkText.insertMany(allChunkDocs);
  }

  if (sectionDocs.size > 0) {
    await SectionContent.insertMany(Array.from(sectionDocs.values()));
  }

  return allPoints.length;
}
