import { v4 as uuidv4 } from "uuid";
import micromatch from "micromatch";
import {
  splitAndHash,
  diffChunks,
  hashChunk,
  type ChunkRecord,
  type DiffResult,
} from "./chunk-differ.js";
import { getChangedFiles, readFileAtCommit } from "./git-storage.js";
import { getEmbeddings } from "@neurovault/utils/embeddings";
import { getQdrantClient } from "@neurovault/config";
import { FileVersion, Vault, EmbeddingJob } from "./models.js";

const COLLECTION_NAME = "neurovault";

export interface IndexAction extends DiffResult {
  filePath: string;
}

export async function buildIndexActions(
  content: string,
  oldChunks: ChunkRecord[]
): Promise<DiffResult> {
  const newChunks = await splitAndHash(content);
  return diffChunks(newChunks, oldChunks);
}

export function buildDeleteActions(oldChunks: ChunkRecord[]): DiffResult {
  return {
    toEmbed: [],
    toDelete: oldChunks,
    unchanged: [],
  };
}

export function filterByGlobs(
  paths: string[],
  include: string[],
  exclude: string[]
): string[] {
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
  exclude: string[]
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
    const oldChunks: ChunkRecord[] = existing?.chunks?.map((c) => ({
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
    const diff = await buildIndexActions(content, oldChunks);

    if (diff.toDelete.length > 0) {
      await client.delete(COLLECTION_NAME, {
        wait: true,
        points: diff.toDelete.map((d) => d.qdrantPointId),
      });
    }

    const newPoints = [];
    const newChunkRecords: ChunkRecord[] = [...diff.unchanged];

    for (const chunk of diff.toEmbed) {
      const pointId = uuidv4();
      let embedding: number[];
      try {
        embedding = await getEmbeddings(chunk.text);
      } catch (err) {
        await EmbeddingJob.create({
          vaultId,
          filePath: file.path,
          commitSha: toSha,
          status: "failed",
          lastError: String(err),
        });
        continue;
      }

      newPoints.push({
        id: pointId,
        vector: embedding,
        payload: {
          text: chunk.text,
          fileId: file.path,
          vaultId,
          chunk_index: chunk.index,
        },
      });

      newChunkRecords.push({
        index: chunk.index,
        contentHash: chunk.hash,
        qdrantPointId: pointId,
      });
    }

    if (newPoints.length > 0) {
      await client.upsert(COLLECTION_NAME, { wait: true, points: newPoints });
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
      { upsert: true, new: true }
    );
  }

  await Vault.findByIdAndUpdate(vaultId, { lastSyncedCommit: toSha });
}
