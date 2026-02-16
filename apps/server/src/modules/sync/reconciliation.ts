import { getQdrantClient } from "@neurovault/config";
import { FileVersion, Vault } from "./models.js";
import { readFileAtHead } from "./git-storage.js";
import { splitAndHash, hashChunk, type ChunkRecord } from "./chunk-differ.js";
import { getEmbeddings } from "@neurovault/utils/embeddings";
import { v4 as uuidv4 } from "uuid";

const COLLECTION_NAME = "neurovault";

export async function reconcileVault(vaultId: string): Promise<{
  checked: number;
  fixed: number;
  orphansRemoved: number;
}> {
  const vault = await Vault.findById(vaultId);
  if (!vault) throw new Error(`vault ${vaultId} not found`);

  const client = getQdrantClient();
  const versions = await FileVersion.find({ vaultId, deleted: false });

  let checked = 0;
  let fixed = 0;
  let orphansRemoved = 0;

  for (const version of versions) {
    checked++;
    const pointIds = version.chunks.map((c) => c.qdrantPointId);
    if (pointIds.length === 0) continue;

    const existing = await client.retrieve(COLLECTION_NAME, {
      ids: pointIds,
      with_payload: false,
      with_vector: false,
    });

    const existingIds = new Set(existing.map((p) => String(p.id)));
    const missing = pointIds.filter((id) => !existingIds.has(id));

    if (missing.length > 0) {
      let content: string;
      try {
        content = await readFileAtHead(vault.gitPath, version.filePath);
      } catch {
        version.deleted = true;
        await version.save();
        continue;
      }

      const newChunks = await splitAndHash(content);
      const newPoints = [];
      const updatedRecords: ChunkRecord[] = [];

      for (const chunk of newChunks) {
        const oldRecord = version.chunks.find(
          (c) => c.contentHash === chunk.hash && existingIds.has(c.qdrantPointId)
        );

        if (oldRecord) {
          updatedRecords.push({
            index: chunk.index,
            contentHash: chunk.hash,
            qdrantPointId: oldRecord.qdrantPointId,
          });
        } else {
          const pointId = uuidv4();
          const embedding = await getEmbeddings(chunk.text);
          newPoints.push({
            id: pointId,
            vector: embedding,
            payload: {
              text: chunk.text,
              fileId: version.filePath,
              vaultId,
              chunk_index: chunk.index,
            },
          });
          updatedRecords.push({
            index: chunk.index,
            contentHash: chunk.hash,
            qdrantPointId: pointId,
          });
        }
      }

      if (newPoints.length > 0) {
        await client.upsert(COLLECTION_NAME, { wait: true, points: newPoints });
      }

      version.chunks = updatedRecords as any;
      version.contentHash = hashChunk(content);
      await version.save();
      fixed++;
    }
  }

  const allKnownPointIds = new Set(
    versions.flatMap((v) => v.chunks.map((c) => c.qdrantPointId))
  );

  const scrollResult = await client.scroll(COLLECTION_NAME, {
    filter: {
      must: [{ key: "vaultId", match: { value: vaultId } }],
    },
    limit: 1000,
    with_payload: false,
    with_vector: false,
  });

  const orphanIds = scrollResult.points
    .map((p) => String(p.id))
    .filter((id) => !allKnownPointIds.has(id));

  if (orphanIds.length > 0) {
    await client.delete(COLLECTION_NAME, {
      wait: true,
      points: orphanIds,
    });
    orphansRemoved = orphanIds.length;
  }

  return { checked, fixed, orphansRemoved };
}
