export interface GraphNode {
  fileId: string;
  fileName: string;
  path: string;
  clusterId?: number;
}

export interface FolderNode {
  folderId: string;
  name: string;
  path: string;
}

export interface ChunkPair {
  sourceIdx: number;
  targetIdx: number;
  score: number;
}

export interface LinksToEdge {
  source: string;
  target: string;
  type: "LINKS_TO";
  anchor: string;
}

export interface ChildOfEdge {
  source: string;
  target: string;
  type: "CHILD_OF";
  sourceLabel: "File" | "Folder";
}

export type GraphEdge = LinksToEdge | ChildOfEdge;

export interface GraphStats {
  nodeCount: number;
  folderCount: number;
  edgeCount: number;
  avgDegree: number;
  topConnected: Array<GraphNode & { degree: number }>;
}

export interface Cluster {
  id: number;
  members: GraphNode[];
}

export interface NeighborsResponse {
  outgoing: Array<GraphNode & { anchor: string }>;
  backlinks: Array<GraphNode & { anchor: string }>;
  hierarchy: {
    parent: FolderNode | null;
    siblings: GraphNode[];
  };
}

export interface ClusterResponse {
  clusterId: number;
  members: GraphNode[];
}

export interface WikiLink {
  target: string;
  alias?: string;
  position: number;
}

export interface ResolvedLink {
  targetFileId: string;
  anchor: string;
}
