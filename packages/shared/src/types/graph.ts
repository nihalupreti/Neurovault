export interface GraphNode {
  fileId: string;
  fileName: string;
  path: string;
  clusterId?: number;
}

export interface ChunkPair {
  sourceIdx: number;
  targetIdx: number;
  score: number;
}

export interface ExplicitEdge {
  source: string;
  target: string;
  type: "LINKS_TO";
  anchor: string;
}

export interface ImplicitEdge {
  source: string;
  target: string;
  type: "SIMILAR";
  score: number;
  chunkPairs: ChunkPair[];
}

export type GraphEdge = ExplicitEdge | ImplicitEdge;

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  topConnected: Array<GraphNode & { degree: number }>;
}

export interface Cluster {
  id: number;
  members: GraphNode[];
}

export interface NeighborsResponse {
  explicit: Array<GraphNode & { anchor: string }>;
  implicit: Array<GraphNode & { score: number }>;
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

export interface SimilarEdgeInput {
  targetFileId: string;
  score: number;
  chunkPairs: ChunkPair[];
}
