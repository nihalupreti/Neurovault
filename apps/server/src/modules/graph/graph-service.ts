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

export async function getNeighbors(fileId: string): Promise<{
  explicit: (FileNode & { anchor: string })[];
  implicit: (FileNode & { score: number })[];
}> {
  const session = getSession();
  try {
    const explicitResult = await session.run(
      `MATCH (f:File {fileId: $fileId})-[r:LINKS_TO]->(t:File) RETURN t, r`,
      { fileId }
    );
    const implicitResult = await session.run(
      `MATCH (f:File {fileId: $fileId})-[r:SIMILAR]-(t:File) RETURN t, r`,
      { fileId }
    );
    const explicit = explicitResult.records.map((rec: any) => ({
      ...nodeToFileNode(rec.get("t")),
      anchor: rec.get("r").properties.anchor,
    }));
    const implicit = implicitResult.records.map((rec: any) => ({
      ...nodeToFileNode(rec.get("t")),
      score: rec.get("r").properties.score,
    }));
    return { explicit, implicit };
  } finally {
    await session.close();
  }
}

export async function getFullGraph(): Promise<{
  nodes: FileNode[];
  edges: GraphEdge[];
}> {
  const session = getSession();
  try {
    const nodesResult = await session.run("MATCH (f:File) RETURN f");
    const edgesResult = await session.run(
      `MATCH (src:File)-[r]->(tgt:File)
       RETURN src.fileId AS srcId, tgt.fileId AS tgtId, type(r) AS type, properties(r) AS props`
    );
    const nodes = nodesResult.records.map((rec: any) =>
      nodeToFileNode(rec.get("f"))
    );
    const edges: GraphEdge[] = edgesResult.records.map((rec: any) => {
      const type = rec.get("type") as string;
      const props = rec.get("props");
      const base = { source: rec.get("srcId"), target: rec.get("tgtId") };
      if (type === "LINKS_TO") {
        return { ...base, type: "LINKS_TO" as const, anchor: props.anchor };
      }
      return {
        ...base,
        type: "SIMILAR" as const,
        score: props.score,
        chunkPairs:
          typeof props.chunkPairs === "string"
            ? JSON.parse(props.chunkPairs)
            : props.chunkPairs ?? [],
      };
    });
    return { nodes, edges };
  } finally {
    await session.close();
  }
}

export async function getFileCluster(
  fileId: string
): Promise<{ clusterId: number; members: FileNode[] }> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (f:File {fileId: $fileId})
       WITH f.clusterId AS cid
       MATCH (m:File {clusterId: cid})
       RETURN cid, m`,
      { fileId }
    );
    if (result.records.length === 0) return { clusterId: -1, members: [] };
    const clusterId = toNumber(result.records[0]!.get("cid"));
    const members = result.records.map((rec: any) =>
      nodeToFileNode(rec.get("m"))
    );
    return { clusterId, members };
  } finally {
    await session.close();
  }
}

export async function getAllClusters(): Promise<{ clusters: Cluster[] }> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (f:File) WHERE f.clusterId IS NOT NULL
       RETURN f.clusterId AS cid, collect(f) AS members ORDER BY cid`
    );
    const clusters: Cluster[] = result.records.map((rec: any) => ({
      id: toNumber(rec.get("cid")),
      members: (rec.get("members") as any[]).map(nodeToFileNode),
    }));
    return { clusters };
  } finally {
    await session.close();
  }
}

export async function getShortestPath(
  fromFileId: string,
  toFileId: string
): Promise<{ path: FileNode[]; length: number }> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH p = shortestPath(
         (a:File {fileId: $fromFileId})-[*]-(b:File {fileId: $toFileId})
       ) RETURN nodes(p) AS nodes`,
      { fromFileId, toFileId }
    );
    if (result.records.length === 0) return { path: [], length: -1 };
    const nodes = (result.records[0]!.get("nodes") as any[]).map(
      nodeToFileNode
    );
    return { path: nodes, length: nodes.length - 1 };
  } finally {
    await session.close();
  }
}

export async function getStats(): Promise<GraphStats> {
  const session = getSession();
  try {
    const countResult = await session.run(
      `MATCH (f:File)
       OPTIONAL MATCH (f)-[r]-()
       WITH count(DISTINCT f) AS nodeCount, count(r) / 2 AS edgeCount
       RETURN nodeCount, edgeCount,
              CASE WHEN nodeCount > 0 THEN toFloat(edgeCount * 2) / nodeCount ELSE 0.0 END AS avgDegree`
    );
    const rec = countResult.records[0]!;
    const nodeCount = toNumber(rec.get("nodeCount"));
    const edgeCount = toNumber(rec.get("edgeCount"));
    const avgDegree = rec.get("avgDegree") as number;

    const topResult = await session.run(
      `MATCH (f:File) OPTIONAL MATCH (f)-[r]-()
       WITH f, count(r) AS degree ORDER BY degree DESC LIMIT 10
       RETURN f, degree`
    );
    const topConnected = topResult.records.map((r: any) => ({
      ...nodeToFileNode(r.get("f")),
      degree: toNumber(r.get("degree")),
    }));
    return { nodeCount, edgeCount, avgDegree, topConnected };
  } finally {
    await session.close();
  }
}

export async function runLouvain(): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `CALL gds.louvain.write({
        nodeProjection: 'File',
        relationshipProjection: {
          LINKS_TO: { type: 'LINKS_TO' },
          SIMILAR: { type: 'SIMILAR', properties: 'score' }
        },
        relationshipWeightProperty: 'score',
        writeProperty: 'clusterId'
      })`
    );
  } finally {
    await session.close();
  }
}

function nodeToFileNode(node: any): FileNode {
  const props = node.properties;
  return {
    fileId: props.fileId,
    fileName: props.fileName,
    path: props.path,
    clusterId: props.clusterId != null ? toNumber(props.clusterId) : undefined,
  };
}

function toNumber(val: any): number {
  if (val && typeof val === "object" && "low" in val) return val.low;
  return Number(val);
}
