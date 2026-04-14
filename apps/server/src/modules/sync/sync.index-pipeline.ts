import { v4 as uuidv4 } from "uuid";
import micromatch from "micromatch";
import {
  splitAndHash,
  diffChunks,
  hashChunk,
  type ChunkRecord,
  type DiffResult,
} from "./sync.chunk-differ.js";
import { getChangedFiles, readFileAtCommit } from "./sync.git-storage.js";
import { getEmbeddingsBatch } from "@neurovault/utils/embeddings";
import { getQdrantClient } from "@neurovault/config";
import { FileVersion, Vault, EmbeddingJob } from "./sync.models.js";
import ChunkText from "../search/search.chunk-text.model.js";
import SectionContent from "../chunker/chunker.section.model.js";
import { sectionId } from "../chunker/parsers/parser.types.js";

const COLLECTION_NAME = "neurovault";

export interface IndexAction extends DiffResult {
  filePath: string;
}

export function buildIndexActions(content: string, oldChunks: ChunkRecord[]): DiffResult {
  const newChunks = splitAndHash(content);
  return diffChunks(newChunks, oldChunks);
}

export function buildDeleteActions(oldChunks: ChunkRecord[]): DiffResult {
  return {
    toEmbed: [],
    toDelete: oldChunks,
    unchanged: [],
  };
}

export function filterByGlobs(paths: string[], include: string[], exclude: string[]): string[] {
  let filtered = paths;
  if (include.length > 0) {
    filtered = micromatch(filtered, include);
  }
  if (exclude.length > 0) {
    filtered = micromatch.not(filtered, exclude);
  }
  return filtered;
}

export async function runIndexPipeline(
  vaultId: string,
  dir: string,
  fromSha: string,
  toSha: string,
  include: string[],
  exclude: string[],
): Promise<void> {
  const changedFiles = await getChangedFiles(dir, fromSha, toSha);
  const allPaths = changedFiles.map((f) => f.path);
  const relevantPaths = new Set(filterByGlobs(allPaths, include, exclude));
  const relevant = changedFiles.filter((f) => relevantPaths.has(f.path));

  const client = getQdrantClient();

  for (const file of relevant) {
    const existing = await FileVersion.findOne({
      vaultId,
      filePath: file.path,
      deleted: false,
    });
    const oldChunks: ChunkRecord[] =
      existing?.chunks?.map((c) => ({
        index: c.index,
        contentHash: c.contentHash,
        qdrantPointId: c.qdrantPointId,
      })) ?? [];

    if (file.action === "delete") {
      const { toDelete } = buildDeleteActions(oldChunks);
      if (toDelete.length > 0) {
        await client.delete(COLLECTION_NAME, {
          wait: true,
          points: toDelete.map((d) => d.qdrantPointId),
        });
      }
      if (existing) {
        existing.deleted = true;
        existing.commitSha = toSha;
        await existing.save();
      }
      continue;
    }

    const content = await readFileAtCommit(dir, toSha, file.path);
    const diff = buildIndexActions(content, oldChunks);

    if (diff.toDelete.length > 0) {
      await client.delete(COLLECTION_NAME, {
        wait: true,
        points: diff.toDelete.map((d) => d.qdrantPointId),
      });
    }

    const newPoints = [];
    const newChunkRecords: ChunkRecord[] = [...diff.unchanged];
    const sectionDocs = new Map<
      string,
      { sectionId: string; headingPath: string[]; content: string; fileId: string }
    >();

    if (diff.toEmbed.length > 0) {
      const texts = diff.toEmbed.map((c) => c.text);
      let embeddings: number[][];
      try {
        embeddings = await getEmbeddingsBatch(texts, "document", true);
      } catch (err) {
        for (const chunk of diff.toEmbed) {
          await EmbeddingJob.create({
            vaultId,
            filePath: file.path,
            commitSha: toSha,
            status: "failed",
            lastError: String(err),
          });
        }
        continue;
      }

      for (let i = 0; i < diff.toEmbed.length; i++) {
        const chunk = diff.toEmbed[i]!;
        const pointId = uuidv4();
        const sid = sectionId(chunk.headingPath);

        newPoints.push({
          id: pointId,
          vector: embeddings[i]!,
          payload: {
            text: chunk.text,
            fileId: file.path,
            vaultId,
            chunk_index: chunk.index,
            headingPath: chunk.headingPath,
            sectionId: sid,
            source: "sync",
          },
        });

        newChunkRecords.push({
          index: chunk.index,
          contentHash: chunk.hash,
          qdrantPointId: pointId,
        });

        if (!sectionDocs.has(sid)) {
          sectionDocs.set(sid, {
            sectionId: sid,
            headingPath: chunk.headingPath,
            content: chunk.sectionContent,
            fileId: file.path,
          });
        }
      }
    }

    if (newPoints.length > 0) {
      await client.upsert(COLLECTION_NAME, { wait: true, points: newPoints });

      await ChunkText.deleteMany({ fileId: file.path });
      const chunkDocs = newPoints.map((p) => ({
        fileId: file.path,
        chunkIndex: p.payload.chunk_index,
        text: p.payload.text,
        headingPath: p.payload.headingPath,
        sectionId: p.payload.sectionId,
        source: "sync",
      }));
      await ChunkText.insertMany(chunkDocs);
    }

    if (sectionDocs.size > 0) {
      await SectionContent.deleteMany({ fileId: file.path });
      await SectionContent.insertMany(Array.from(sectionDocs.values()));
    }

    await FileVersion.findOneAndUpdate(
      { vaultId, filePath: file.path },
      {
        vaultId,
        filePath: file.path,
        contentHash: hashChunk(content),
        commitSha: toSha,
        chunks: newChunkRecords,
        deleted: false,
      },
      { upsert: true, new: true },
    );
  }

  await Vault.findByIdAndUpdate(vaultId, { lastSyncedCommit: toSha });
}
