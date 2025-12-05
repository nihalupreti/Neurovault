import { getNeo4jDriver } from "@neurovault/config";
import type {
  FileNode,
  GraphEdge,
  ResolvedLink,
  SimilarEdgeInput,
  Cluster,
  GraphStats,
} from "./types.js";

function getSession() {
  return getNeo4jDriver().session();
}

export async function initConstraints(): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      "CREATE CONSTRAINT file_id_unique IF NOT EXISTS FOR (f:File) REQUIRE f.fileId IS UNIQUE"
    );
  } finally {
    await session.close();
  }
}

export async function upsertFileNode(
  fileId: string,
  fileName: string,
  path: string
): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `MERGE (f:File {fileId: $fileId})
       SET f.fileName = $fileName, f.path = $path`,
      { fileId, fileName, path }
    );
  } finally {
    await session.close();
  }
}

export async function removeFileNode(fileId: string): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      "MATCH (f:File {fileId: $fileId}) DETACH DELETE f",
      { fileId }
    );
  } finally {
    await session.close();
  }
}

export async function syncWikilinks(
  fileId: string,
  resolvedLinks: ResolvedLink[]
): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      "MATCH (f:File {fileId: $fileId})-[r:LINKS_TO]->() DELETE r",
      { fileId }
    );
    if (resolvedLinks.length > 0) {
      await session.run(
        `UNWIND $links AS link
         MATCH (src:File {fileId: $fileId})
         MATCH (tgt:File {fileId: link.targetFileId})
         CREATE (src)-[:LINKS_TO {anchor: link.anchor}]->(tgt)`,
        { fileId, links: resolvedLinks }
      );
    }
  } finally {
    await session.close();
  }
}

export async function upsertSimilarEdges(
  fileId: string,
  edges: SimilarEdgeInput[]
): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      "MATCH (f:File {fileId: $fileId})-[r:SIMILAR]-() DELETE r",
      { fileId }
    );
    if (edges.length > 0) {
      await session.run(
        `UNWIND $edges AS edge
         MATCH (src:File {fileId: $fileId})
         MATCH (tgt:File {fileId: edge.targetFileId})
         CREATE (src)-[:SIMILAR {
           score: edge.score,
           chunkPairs: edge.chunkPairs
         }]->(tgt)`,
        {
          fileId,
          edges: edges.map((e) => ({
            targetFileId: e.targetFileId,
            score: e.score,
            chunkPairs: JSON.stringify(e.chunkPairs),
          })),
        }
      );
    }
  } finally {
    await session.close();
  }
}
