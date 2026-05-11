import { serverFetch } from "@/api/server-fetch";
import type {
  FullGraphResponse,
  ClustersResponse,
  GraphStats,
} from "@neurovault/shared/types";
import { GraphView } from "@/components/graph/graph-view";

export default async function GraphPage() {
  let initialGraph: FullGraphResponse | null = null;
  let initialClusters: ClustersResponse | null = null;
  let initialStats: GraphStats | null = null;

  try {
    [initialGraph, initialClusters, initialStats] = await Promise.all([
      serverFetch<FullGraphResponse>("/api/graph"),
      serverFetch<ClustersResponse>("/api/graph/clusters"),
      serverFetch<GraphStats>("/api/graph/stats"),
    ]);
  } catch {
    // Client will re-fetch if server fetch fails
  }

  return (
    <GraphView
      initialGraph={initialGraph}
      initialClusters={initialClusters}
      initialStats={initialStats}
    />
  );
}
