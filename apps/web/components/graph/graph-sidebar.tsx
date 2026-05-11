"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { getNeighbors } from "@/api/client";
import type { GraphStats, Cluster, GraphNode, FolderNode } from "@neurovault/shared/types";

const CLUSTER_COLORS = [
  "#c678dd",
  "#61afef",
  "#98c379",
  "#e5c07b",
  "#56b6c2",
  "#e06c75",
  "#d19a66",
  "#be5046",
];

export function clusterColor(clusterId: number | undefined): string {
  if (clusterId == null) return "#555";
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]!;
}

interface FilterState {
  files: boolean;
  folders: boolean;
  books: boolean;
}

interface GraphSidebarProps {
  stats: GraphStats | undefined;
  clusters: Cluster[];
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  search: string;
  onSearchChange: (s: string) => void;
  selectedNodeId: string | null;
  selectedNodeType: "file" | "folder" | null;
  nodeMap: Map<string, GraphNode | FolderNode>;
}

export function GraphSidebar({
  stats,
  clusters,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  selectedNodeId,
  selectedNodeType,
  nodeMap,
}: GraphSidebarProps) {
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const isFile = selectedNodeType === "file";

  const { data: neighbors } = useQuery({
    queryKey: ["neighbors", selectedNodeId],
    queryFn: () => getNeighbors(selectedNodeId!),
    enabled: !!selectedNodeId && isFile,
    staleTime: 60_000,
  });

  return (
    <aside className="nv-graph-sidebar">
      <div className="nv-graph-sidebar-header">
        <span className="nv-graph-sidebar-title">GRAPH</span>
        <Link href="/" className="nv-graph-back">
          <Icon name="arrow-left" size={12} />
          <span>back</span>
        </Link>
      </div>

      <div className="nv-graph-search-wrap">
        <Icon name="search" size={12} />
        <input
          className="nv-graph-search"
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="nv-graph-section">
        <div className="nv-graph-section-label">Filters</div>
        <label className="nv-graph-filter">
          <input
            type="checkbox"
            checked={filters.files}
            onChange={() => onFiltersChange({ ...filters, files: !filters.files })}
          />
          <span>Files</span>
        </label>
        <label className="nv-graph-filter">
          <input
            type="checkbox"
            checked={filters.folders}
            onChange={() => onFiltersChange({ ...filters, folders: !filters.folders })}
          />
          <span>Folders</span>
        </label>
        <label className="nv-graph-filter">
          <input
            type="checkbox"
            checked={filters.books}
            onChange={() => onFiltersChange({ ...filters, books: !filters.books })}
          />
          <span>Books</span>
        </label>
      </div>

      <div className="nv-graph-section">
        <div className="nv-graph-section-label">Stats</div>
        <div className="nv-graph-stats">
          <div className="nv-graph-stat">
            <span className="nv-graph-stat-val">{stats?.nodeCount ?? "–"}</span>
            <span className="nv-graph-stat-lbl">nodes</span>
          </div>
          <div className="nv-graph-stat">
            <span className="nv-graph-stat-val">{stats?.edgeCount ?? "–"}</span>
            <span className="nv-graph-stat-lbl">edges</span>
          </div>
          <div className="nv-graph-stat">
            <span className="nv-graph-stat-val">{clusters.length || "–"}</span>
            <span className="nv-graph-stat-lbl">clusters</span>
          </div>
          <div className="nv-graph-stat">
            <span className="nv-graph-stat-val">{stats?.avgDegree?.toFixed(1) ?? "–"}</span>
            <span className="nv-graph-stat-lbl">avg degree</span>
          </div>
        </div>
      </div>

      <div className="nv-graph-section">
        <div className="nv-graph-section-label">Clusters</div>
        <div className="nv-graph-cluster-list">
          {clusters.map((c) => (
            <div key={c.id} className="nv-graph-cluster-row">
              <span
                className="nv-graph-cluster-dot"
                style={{ background: clusterColor(c.id) }}
              />
              <span>Cluster {c.id}</span>
              <span className="nv-graph-cluster-count">{c.members.length}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <div className="nv-graph-node-panel">
          <div className="nv-graph-section-label">Selected</div>
          <div className="nv-graph-node-card">
            <div className="nv-graph-node-name">
              {isFile
                ? (selectedNode as GraphNode).fileName
                : (selectedNode as FolderNode).name}
            </div>
            <div className="nv-graph-node-path">
              {isFile
                ? (selectedNode as GraphNode).path
                : (selectedNode as FolderNode).path}
            </div>
            {isFile && (selectedNode as GraphNode).clusterId != null && (
              <div className="nv-graph-node-cluster">
                <span
                  className="nv-graph-cluster-dot"
                  style={{ background: clusterColor((selectedNode as GraphNode).clusterId) }}
                />
                <span>Cluster {(selectedNode as GraphNode).clusterId}</span>
              </div>
            )}

            {isFile && neighbors && (
              <>
                {neighbors.outgoing.length > 0 && (
                  <div className="nv-graph-node-links">
                    <span className="nv-graph-link-arrow" style={{ color: "#98c379" }}>→</span>
                    {neighbors.outgoing.map((n) => n.fileName).join(", ")}
                  </div>
                )}
                {neighbors.backlinks.length > 0 && (
                  <div className="nv-graph-node-links">
                    <span className="nv-graph-link-arrow" style={{ color: "#e06c75" }}>←</span>
                    {neighbors.backlinks.map((n) => n.fileName).join(", ")}
                  </div>
                )}
              </>
            )}

            {isFile && (
              <Link
                href={`/?file=${selectedNodeId}`}
                className="nv-graph-open-btn"
              >
                Open note →
              </Link>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
