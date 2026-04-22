"use client";

import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "./icons";
import { getFolderTree, getGraphStats } from "@/api/client";
import type { FolderNode } from "@/api/client";
import UploadModal from "./uploadModal";
import { useAuth } from "@/contexts/auth-context";

interface VaultRailProps {
  activeId: string | null;
  onSelectFile: (id: string) => void;
}

export function VaultRail({ activeId, onSelectFile }: VaultRailProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { isAdmin } = useAuth();

  const { data: tree, isError: treeError } = useQuery({
    queryKey: ["folderTree", isAdmin],
    queryFn: () => getFolderTree(),
    enabled: isAdmin,
  });

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["graphStats"],
    queryFn: getGraphStats,
    staleTime: 60_000,
  });

  return (
    <aside className="nv-leftrail" role="navigation" aria-label="Vault navigation">
      <div className="nv-rail-head">
        <div className="nv-rail-title">
          <span className="nv-rail-eyebrow">vault</span>
          <h3>knowledge base</h3>
        </div>
        <button className="nv-icon-btn nv-icon-btn-sm" aria-label="Filter">
          <Icon name="filter" size={12} />
        </button>
      </div>

      {statsError ? (
        <div className="nv-rail-stats" style={{ color: "var(--ink-faint)", fontSize: "12px" }}>
          Failed to load stats
        </div>
      ) : (
        <div className="nv-rail-stats">
          <div>
            <b>{stats?.nodeCount ?? "—"}</b>
            <span>notes</span>
          </div>
          <div>
            <b>{stats?.edgeCount ?? "—"}</b>
            <span>edges</span>
          </div>
          <div>
            <b>{stats ? stats.avgDegree.toFixed(1) : "—"}</b>
            <span>avg deg</span>
          </div>
        </div>
      )}

      <div className="nv-tree" role="tree">
        {treeError ? (
          <div style={{ color: "var(--ink-faint)", fontSize: "12px", padding: "8px" }}>
            Failed to load
          </div>
        ) : (
          tree?.children?.map((node) => (
            <TreeNode
              key={node._id}
              node={node}
              depth={0}
              activeId={activeId}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>

      <div className="nv-rail-foot">
        <button className="nv-foot-btn" onClick={() => setUploadOpen(true)}>
          <Icon name="plus" size={12} style={{ color: "var(--accent)" }} />
          <span>add source</span>
        </button>
        <span className="nv-foot-meta">last sync &middot; now</span>
      </div>

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} target="file" />
    </aside>
  );
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  activeId,
  onSelectFile,
}: {
  node: FolderNode;
  depth: number;
  activeId: string | null;
  onSelectFile: (id: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);

  const { data: children } = useQuery({
    queryKey: ["folderTree", node._id],
    queryFn: () => getFolderTree(node._id),
    enabled: node.type === "folder" && open,
  });

  if (node.type === "folder") {
    const kids = children?.children ?? node.children ?? [];
    return (
      <div role="treeitem" aria-expanded={open}>
        <button
          className="nv-tree-row nv-tree-folder-row"
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`nv-tree-chev ${open ? "is-open" : ""}`}>
            <Icon name="chevron" size={10} />
          </span>
          <span className="nv-tree-label">{node.name}</span>
          <span className="nv-tree-count">{kids.length}</span>
        </button>
        {open &&
          kids.map((child) => (
            <TreeNode
              key={child._id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelectFile={onSelectFile}
            />
          ))}
      </div>
    );
  }

  const isActive = node._id === activeId;
  return (
    <button
      className={`nv-tree-row nv-tree-file-row ${isActive ? "is-active" : ""}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={() => onSelectFile(node._id)}
      aria-label={`Open ${node.name.replace(/\.md$/, "")}`}
      role="treeitem"
    >
      <span className="nv-tree-dot" />
      <span className="nv-tree-label">{node.name.replace(/\.md$/, "")}</span>
    </button>
  );
});
