import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { getEmbeddings, embeddingProvider } from "@neurovault/utils/embeddings";
import { getQdrantClient } from "@neurovault/config";
import ChunkText from "../search/search.chunk-text.model.js";

const client = getQdrantClient();
const COLLECTION_NAME = "neurovault";

async function ensureCollectionExists() {
  try {
    const info = await client.getCollection(COLLECTION_NAME);
    const vectors = info.config.params.vectors as { size?: number } | undefined;
    if (vectors?.size !== embeddingProvider.dimensions) {
      console.log(`Vector dimension mismatch (${vectors?.size} → ${embeddingProvider.dimensions}). Recreating collection.`);
      await client.deleteCollection(COLLECTION_NAME);
      await client.createCollection(COLLECTION_NAME, {
        vectors: { size: embeddingProvider.dimensions, distance: "Cosine" },
      });
      console.log(`Recreated collection: ${COLLECTION_NAME}`);
    }
  } catch (err: unknown) {
    if ((err instanceof Error && err.message.includes("Not Found")) || (err as { code?: number })?.code === 404) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: { size: embeddingProvider.dimensions, distance: "Cosine" },
      });
      console.log(`Created collection: ${COLLECTION_NAME}`);
    } else {
      throw err;
    }
  }
}

export async function processMarkdown(filePath: string, fileId: string) {
  await ensureCollectionExists();

  const text = await fs.readFile(filePath, "utf-8");
  const splitter = new MarkdownTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
  });

  const chunks = await splitter.createDocuments([text]);

  const points = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]?.pageContent;
    if (!chunk) continue;

    const embedding = await getEmbeddings(chunk);

    points.push({
      id: randomUUID(),
      vector: embedding,
      payload: {
        text: chunk,
        fileId,
        chunk_index: i,
      },
    });
  }

  if (points.length > 0) {
    await client.upsert(COLLECTION_NAME, { wait: true, points });
    console.log(`Uploaded ${points.length} chunks from ${filePath}`);
  }

  await ChunkText.deleteMany({ fileId });
  if (points.length > 0) {
    await ChunkText.insertMany(
      points.map((p) => ({
        fileId,
        chunkIndex: p.payload.chunk_index,
        text: p.payload.text,
      }))
    );
  }
}
