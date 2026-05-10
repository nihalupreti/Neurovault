import { withNeo4jSession } from "@neurovault/config";
import type { Record as Neo4jRecord, Node as Neo4jNode } from "neo4j-driver";
import type {
  GraphNode,
  FolderNode,
  GraphEdge,
  ResolvedLink,
  Cluster,
  GraphStats,
  NeighborsResponse,
} from "@neurovault/shared/types";

export async function initConstraints(): Promise<void> {
  await withNeo4jSession(async (session) => {
    await session.run(
      "CREATE CONSTRAINT file_id_unique IF NOT EXISTS FOR (f:File) REQUIRE f.fileId IS UNIQUE"
    );
    await session.run(
      "CREATE CONSTRAINT folder_id_unique IF NOT EXISTS FOR (f:Folder) REQUIRE f.folderId IS UNIQUE"
    );
  });
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

export async function upsertFolderNode(
  folderId: string,
  name: string,
  path: string
): Promise<void> {
  await withNeo4jSession((session) =>
    session.run(
      `MERGE (f:Folder {folderId: $folderId})
       SET f.name = $name, f.path = $path`,
      { folderId, name, path }
    )
  );
}

export async function syncHierarchy(
  childId: string,
  childLabel: "File" | "Folder",
  parentFolderId: string
): Promise<void> {
  const matchChild =
    childLabel === "File"
      ? `MATCH (child:File {fileId: $childId})`
      : `MATCH (child:Folder {folderId: $childId})`;

  await withNeo4jSession((session) =>
    session.executeWrite(async (tx) => {
      await tx.run(`${matchChild} MATCH (child)-[r:CHILD_OF]->() DELETE r`, {
        childId,
      });
      await tx.run(
        `${matchChild}
         MATCH (parent:Folder {folderId: $parentFolderId})
         CREATE (child)-[:CHILD_OF {sourceLabel: $childLabel}]->(parent)`,
        { childId, parentFolderId, childLabel }
      );
    })
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

export async function getNeighbors(fileId: string): Promise<NeighborsResponse> {
  return withNeo4jSession(async (session) => {
    const outgoingResult = await session.run(
      `MATCH (f:File {fileId: $fileId})-[r:LINKS_TO]->(t:File) RETURN t, r`,
      { fileId }
    );
    const backlinksResult = await session.run(
      `MATCH (t:File)-[r:LINKS_TO]->(f:File {fileId: $fileId}) RETURN t, r`,
      { fileId }
    );
    const parentResult = await session.run(
      `MATCH (f:File {fileId: $fileId})-[:CHILD_OF]->(p:Folder) RETURN p`,
      { fileId }
    );
    const parentNode =
      parentResult.records.length > 0
        ? nodeToFolderNode(parentResult.records[0]!.get("p"))
        : null;

    const siblings: GraphNode[] = [];
    if (parentNode !== null) {
      const siblingsResult = await session.run(
        `MATCH (s:File)-[:CHILD_OF]->(p:Folder {folderId: $folderId})
         WHERE s.fileId <> $fileId
         RETURN s`,
        { folderId: parentNode.folderId, fileId }
      );
      siblingsResult.records.forEach((rec: Neo4jRecord) => {
        siblings.push(nodeToGraphNode(rec.get("s")));
      });
    }

    const outgoing = outgoingResult.records.map((rec: Neo4jRecord) => ({
      ...nodeToGraphNode(rec.get("t")),
      anchor: rec.get("r").properties.anchor as string,
    }));
    const backlinks = backlinksResult.records.map((rec: Neo4jRecord) => ({
      ...nodeToGraphNode(rec.get("t")),
      anchor: rec.get("r").properties.anchor as string,
    }));

    return { outgoing, backlinks, hierarchy: { parent: parentNode, siblings } };
  });
}

export async function getFullGraph(): Promise<{
  nodes: GraphNode[];
  folders: FolderNode[];
  edges: GraphEdge[];
}> {
  return withNeo4jSession(async (session) => {
    const nodesResult = await session.run("MATCH (f:File) RETURN f");
    const foldersResult = await session.run("MATCH (f:Folder) RETURN f");
    const linksToResult = await session.run(
      `MATCH (src:File)-[r:LINKS_TO]->(tgt:File)
       RETURN src.fileId AS srcId, tgt.fileId AS tgtId, r.anchor AS anchor`
    );
    const childOfResult = await session.run(
      `MATCH (child)-[r:CHILD_OF]->(parent:Folder)
       RETURN
         CASE WHEN child:File THEN child.fileId ELSE child.folderId END AS childId,
         parent.folderId AS parentId,
         CASE WHEN child:File THEN 'File' ELSE 'Folder' END AS sourceLabel`
    );

    const nodes = nodesResult.records.map((rec: Neo4jRecord) =>
      nodeToGraphNode(rec.get("f"))
    );
    const folders = foldersResult.records.map((rec: Neo4jRecord) =>
      nodeToFolderNode(rec.get("f"))
    );

    const edges: GraphEdge[] = [];
    linksToResult.records.forEach((rec: Neo4jRecord) => {
      edges.push({
        source: rec.get("srcId") as string,
        target: rec.get("tgtId") as string,
        type: "LINKS_TO",
        anchor: rec.get("anchor") as string,
      });
    });
    childOfResult.records.forEach((rec: Neo4jRecord) => {
      edges.push({
        source: rec.get("childId") as string,
        target: rec.get("parentId") as string,
        type: "CHILD_OF",
        sourceLabel: rec.get("sourceLabel") as "File" | "Folder",
      });
    });

    return { nodes, folders, edges };
  });
}

export async function getFileCluster(
  fileId: string
): Promise<{ clusterId: number; members: GraphNode[] }> {
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
      nodeToGraphNode(rec.get("m"))
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
      members: (rec.get("members") as Neo4jNode[]).map(nodeToGraphNode),
    }));
    return { clusters };
  });
}

export async function getShortestPath(
  fromFileId: string,
  toFileId: string
): Promise<{ path: GraphNode[]; length: number }> {
  return withNeo4jSession(async (session) => {
    const result = await session.run(
      `MATCH p = shortestPath(
         (a:File {fileId: $fromFileId})-[*]-(b:File {fileId: $toFileId})
       ) RETURN nodes(p) AS nodes`,
      { fromFileId, toFileId }
    );
    if (result.records.length === 0) return { path: [], length: -1 };
    const nodes = (result.records[0]!.get("nodes") as Neo4jNode[]).map(
      nodeToGraphNode
    );
    return { path: nodes, length: nodes.length - 1 };
  });
}

export async function getStats(): Promise<GraphStats> {
  return withNeo4jSession(async (session) => {
    const countResult = await session.run(
      `OPTIONAL MATCH (f:File)
       WITH count(DISTINCT f) AS nodeCount
       OPTIONAL MATCH (fo:Folder)
       WITH nodeCount, count(DISTINCT fo) AS folderCount
       OPTIONAL MATCH ()-[r]->()
       WITH nodeCount, folderCount, count(r) AS edgeCount
       RETURN nodeCount, folderCount, edgeCount,
              CASE WHEN nodeCount > 0 THEN toFloat(edgeCount * 2) / nodeCount ELSE 0.0 END AS avgDegree`
    );
    const rec = countResult.records[0]!;
    const nodeCount = toNumber(rec.get("nodeCount"));
    const folderCount = toNumber(rec.get("folderCount"));
    const edgeCount = toNumber(rec.get("edgeCount"));
    const avgDegree = rec.get("avgDegree") as number;

    const topResult = await session.run(
      `MATCH (f:File) OPTIONAL MATCH (f)-[r]-()
       WITH f, count(r) AS degree ORDER BY degree DESC LIMIT 10
       RETURN f, degree`
    );
    const topConnected = topResult.records.map((r: Neo4jRecord) => ({
      ...nodeToGraphNode(r.get("f")),
      degree: toNumber(r.get("degree")),
    }));
    return { nodeCount, folderCount, edgeCount, avgDegree, topConnected };
  });
}

export async function runLouvain(): Promise<void> {
  await withNeo4jSession((session) =>
    session.run(
      `CALL gds.louvain.write({
        nodeProjection: ['File', 'Folder'],
        relationshipProjection: {
          LINKS_TO: { type: 'LINKS_TO' },
          CHILD_OF: { type: 'CHILD_OF' }
        },
        writeProperty: 'clusterId'
      })`
    )
  );
}

function nodeToGraphNode(node: Neo4jNode): GraphNode {
  const props = node.properties;
  return {
    fileId: props.fileId as string,
    fileName: props.fileName as string,
    path: props.path as string,
    clusterId:
      props.clusterId != null ? toNumber(props.clusterId) : undefined,
  };
}

function nodeToFolderNode(node: Neo4jNode): FolderNode {
  const props = node.properties;
  return {
    folderId: props.folderId as string,
    name: props.name as string,
    path: props.path as string,
  };
}

function toNumber(val: unknown): number {
  if (val && typeof val === "object" && "low" in val)
    return (val as { low: number }).low;
  return Number(val);
}
