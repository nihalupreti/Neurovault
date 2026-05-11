"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getFullGraph, getAllClusters, getGraphStats } from "@/api/client";
import { GraphSidebar } from "./graph-sidebar";
import { GraphCanvas, buildGraphData } from "./graph-canvas";
import type {
  GraphNode,
  FolderNode,
  GraphStats,
  FullGraphResponse,
  ClustersResponse,
} from "@neurovault/shared/types";

interface GraphViewProps {
  initialGraph: FullGraphResponse | null;
  initialClusters: ClustersResponse | null;
  initialStats: GraphStats | null;
}

export function GraphView({ initialGraph, initialClusters, initialStats }: GraphViewProps) {
  const router = useRouter();

  const { data: graphData } = useQuery({
    queryKey: ["fullGraph"],
    queryFn: getFullGraph,
    initialData: initialGraph ?? undefined,
    staleTime: 60_000,
  });

  const { data: clustersData } = useQuery({
    queryKey: ["allClusters"],
    queryFn: getAllClusters,
    initialData: initialClusters ?? undefined,
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["graphStats"],
    queryFn: getGraphStats,
    initialData: initialStats ?? undefined,
    staleTime: 60_000,
  });

  const [filters, setFilters] = useState({ files: true, folders: true, books: false });
  const [search, setSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<"file" | "folder" | null>(null);

  const fileNodes = graphData?.nodes ?? [];
  const folderNodes = graphData?.folders ?? [];
  const edges = graphData?.edges ?? [];
  const clusters = clustersData?.clusters ?? [];

  const { simNodes, simLinks, adjacency } = useMemo(
    () => buildGraphData(fileNodes, folderNodes, edges, filters),
    [fileNodes, folderNodes, edges, filters],
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode | FolderNode>();
    for (const n of fileNodes) map.set(n.fileId, n);
    for (const f of folderNodes) map.set(f.folderId, f);
    return map;
  }, [fileNodes, folderNodes]);

  const handleSelectNode = useCallback((id: string | null, type: "file" | "folder") => {
    setSelectedNodeId(id);
    setSelectedNodeType(id ? type : null);
  }, []);

  const handleNavigateNode = useCallback(
    (id: string) => {
      router.push(`/?file=${id}`);
    },
    [router],
  );

  return (
    <div className="nv-graph-page">
      <GraphSidebar
        stats={stats}
        clusters={clusters}
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        selectedNodeId={selectedNodeId}
        selectedNodeType={selectedNodeType}
        nodeMap={nodeMap}
      />
      <GraphCanvas
        nodes={simNodes}
        links={simLinks}
        adjacency={adjacency}
        selectedNodeId={selectedNodeId}
        onSelectNode={handleSelectNode}
        onNavigateNode={handleNavigateNode}
        search={search}
      />
    </div>
  );
}
