import { withNeo4jSession } from "@neurovault/config";
import type { Record as Neo4jRecord, Node as Neo4jNode } from "neo4j-driver";
import type {
  FileNode,
  GraphEdge,
  ResolvedLink,
  SimilarEdgeInput,
  Cluster,
  GraphStats,
} from "./graph.types.js";

export async function initConstraints(): Promise<void> {
  await withNeo4jSession((session) =>
    session.run(
      "CREATE CONSTRAINT file_id_unique IF NOT EXISTS FOR (f:File) REQUIRE f.fileId IS UNIQUE"
    )
  );
}

export async function upsertFileNode(
  fileId: string,
  fileName: string,
  path: string
): Promise<void> {
  await withNeo4jSession((session) =>
    session.run(
      `MERGE (f:File {fileId: $fileId})
       SET f.fileName = $fileName, f.path = $path`,
      { fileId, fileName, path }
    )
  );
}

export async function removeFileNode(fileId: string): Promise<void> {
  await withNeo4jSession((session) =>
    session.run("MATCH (f:File {fileId: $fileId}) DETACH DELETE f", { fileId })
  );
}

export async function syncWikilinks(
  fileId: string,
  resolvedLinks: ResolvedLink[]
): Promise<void> {
  await withNeo4jSession((session) =>
    session.executeWrite(async (tx) => {
      await tx.run(
        "MATCH (f:File {fileId: $fileId})-[r:LINKS_TO]->() DELETE r",
        { fileId }
      );
      if (resolvedLinks.length > 0) {
        await tx.run(
          `UNWIND $links AS link
           MATCH (src:File {fileId: $fileId})
           MATCH (tgt:File {fileId: link.targetFileId})
           CREATE (src)-[:LINKS_TO {anchor: link.anchor}]->(tgt)`,
          { fileId, links: resolvedLinks }
        );
      }
    })
  );
}

export async function upsertSimilarEdges(
  fileId: string,
  edges: SimilarEdgeInput[]
): Promise<void> {
  await withNeo4jSession((session) =>
    session.executeWrite(async (tx) => {
      await tx.run(
        "MATCH (f:File {fileId: $fileId})-[r:SIMILAR]-() DELETE r",
        { fileId }
      );
      if (edges.length > 0) {
        await tx.run(
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
    })
  );
}

export async function getNeighbors(fileId: string): Promise<{
  explicit: (FileNode & { anchor: string })[];
  implicit: (FileNode & { score: number })[];
}> {
  return withNeo4jSession(async (session) => {
    const explicitResult = await session.run(
      `MATCH (f:File {fileId: $fileId})-[r:LINKS_TO]->(t:File) RETURN t, r`,
      { fileId }
    );
    const implicitResult = await session.run(
      `MATCH (f:File {fileId: $fileId})-[r:SIMILAR]-(t:File) RETURN t, r`,
      { fileId }
    );
    const explicit = explicitResult.records.map((rec: Neo4jRecord) => ({
      ...nodeToFileNode(rec.get("t")),
      anchor: rec.get("r").properties.anchor,
    }));
    const implicit = implicitResult.records.map((rec: Neo4jRecord) => ({
      ...nodeToFileNode(rec.get("t")),
      score: rec.get("r").properties.score,
    }));
    return { explicit, implicit };
  });
}

export async function getFullGraph(): Promise<{
  nodes: FileNode[];
  edges: GraphEdge[];
}> {
  return withNeo4jSession(async (session) => {
    const nodesResult = await session.run("MATCH (f:File) RETURN f");
    const edgesResult = await session.run(
      `MATCH (src:File)-[r]->(tgt:File)
       RETURN src.fileId AS srcId, tgt.fileId AS tgtId, type(r) AS type, properties(r) AS props`
    );
    const nodes = nodesResult.records.map((rec: Neo4jRecord) =>
      nodeToFileNode(rec.get("f"))
    );
    const edges: GraphEdge[] = edgesResult.records.map((rec: Neo4jRecord) => {
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
            ? safeParseJson(props.chunkPairs, [])
            : props.chunkPairs ?? [],
      };
    });
    return { nodes, edges };
  });
}

export async function getFileCluster(
  fileId: string
): Promise<{ clusterId: number; members: FileNode[] }> {
  return withNeo4jSession(async (session) => {
    const result = await session.run(
      `MATCH (f:File {fileId: $fileId})
       WITH f.clusterId AS cid
       MATCH (m:File {clusterId: cid})
       RETURN cid, m`,
      { fileId }
    );
    if (result.records.length === 0) return { clusterId: -1, members: [] };
    const clusterId = toNumber(result.records[0]!.get("cid"));
    const members = result.records.map((rec: Neo4jRecord) =>
      nodeToFileNode(rec.get("m"))
    );
    return { clusterId, members };
  });
}

export async function getAllClusters(): Promise<{ clusters: Cluster[] }> {
  return withNeo4jSession(async (session) => {
    const result = await session.run(
      `MATCH (f:File) WHERE f.clusterId IS NOT NULL
       RETURN f.clusterId AS cid, collect(f) AS members ORDER BY cid`
    );
    const clusters: Cluster[] = result.records.map((rec: Neo4jRecord) => ({
      id: toNumber(rec.get("cid")),
      members: (rec.get("members") as Neo4jNode[]).map(nodeToFileNode),
    }));
    return { clusters };
  });
}

export async function getShortestPath(
  fromFileId: string,
  toFileId: string
): Promise<{ path: FileNode[]; length: number }> {
  return withNeo4jSession(async (session) => {
    const result = await session.run(
      `MATCH p = shortestPath(
         (a:File {fileId: $fromFileId})-[*]-(b:File {fileId: $toFileId})
       ) RETURN nodes(p) AS nodes`,
      { fromFileId, toFileId }
    );
    if (result.records.length === 0) return { path: [], length: -1 };
    const nodes = (result.records[0]!.get("nodes") as Neo4jNode[]).map(
      nodeToFileNode
    );
    return { path: nodes, length: nodes.length - 1 };
  });
}

export async function getStats(): Promise<GraphStats> {
  return withNeo4jSession(async (session) => {
    const countResult = await session.run(
      `OPTIONAL MATCH (f:File)
       WITH count(DISTINCT f) AS nodeCount
       OPTIONAL MATCH ()-[r]->()
       WITH nodeCount, count(r) AS edgeCount
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
    const topConnected = topResult.records.map((r: Neo4jRecord) => ({
      ...nodeToFileNode(r.get("f")),
      degree: toNumber(r.get("degree")),
    }));
    return { nodeCount, edgeCount, avgDegree, topConnected };
  });
}

export async function runLouvain(): Promise<void> {
  await withNeo4jSession((session) =>
    session.run(
      `CALL gds.louvain.write({
        nodeProjection: 'File',
        relationshipProjection: {
          LINKS_TO: { type: 'LINKS_TO' },
          SIMILAR: { type: 'SIMILAR', properties: 'score' }
        },
        relationshipWeightProperty: 'score',
        writeProperty: 'clusterId'
      })`
    )
  );
}

function safeParseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function nodeToFileNode(node: Neo4jNode): FileNode {
  const props = node.properties;
  return {
    fileId: props.fileId,
    fileName: props.fileName,
    path: props.path,
    clusterId: props.clusterId != null ? toNumber(props.clusterId) : undefined,
  };
}

function toNumber(val: unknown): number {
  if (val && typeof val === "object" && "low" in val) return (val as { low: number }).low;
  return Number(val);
}
