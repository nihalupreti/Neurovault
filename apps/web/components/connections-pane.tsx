"use client";

import { useQuery } from "@tanstack/react-query";
import { getNeighbors, getFileCluster } from "@/api/client";

interface ConnectionsPaneProps {
  fileId: string | null;
}

export function ConnectionsPane({ fileId }: ConnectionsPaneProps) {
  const { data: neighbors } = useQuery({
    queryKey: ["neighbors", fileId],
    queryFn: () => getNeighbors(fileId!),
    enabled: !!fileId,
  });

  const { data: cluster } = useQuery({
    queryKey: ["cluster", fileId],
    queryFn: () => getFileCluster(fileId!),
    enabled: !!fileId,
  });

  const allNodes = [
    ...(neighbors?.explicit ?? []).map((n) => ({ ...n, type: "explicit" as const })),
    ...(neighbors?.implicit ?? []).map((n) => ({ ...n, type: "implicit" as const })),
  ].slice(0, 6);

  return (
    <div className="nv-conn">
      <div className="nv-pane-eyebrow">
        cluster &middot; {cluster ? `#${cluster.clusterId}` : "loading"}
      </div>

      <Constellation nodes={allNodes} />

      <div className="nv-conn-legend">
        <span>
          <i style={{ background: "var(--accent)" }} /> wikilink
        </span>
        <span>
          <i style={{ background: "var(--ink-soft)" }} /> semantic edge
        </span>
      </div>

      <div className="nv-pane-eyebrow nv-pane-eyebrow-spaced">similar chunks</div>
      <ul className="nv-cite-list">
        {neighbors?.implicit?.map((n) => (
          <li key={n.fileId}>
            <div className="nv-cite-head">
              <span className="nv-cite-file">{n.fileName}</span>
              <span className="nv-cite-score">
                {(n.score * 100).toFixed(0)}<small>%</small>
              </span>
            </div>
            <p className="nv-cite-excerpt">{n.path}</p>
          </li>
        ))}
        {(!neighbors?.implicit || neighbors.implicit.length === 0) && (
          <li style={{ color: "var(--ink-faint)", fontSize: "12px" }}>
            No similar chunks found
          </li>
        )}
      </ul>
    </div>
  );
}

function Constellation({ nodes }: { nodes: Array<{ fileName: string; type: string }> }) {
  const cx = 130, cy = 110, r = 11;
  const positions = [
    { x: 40, y: 50, r: 6 },
    { x: 220, y: 60, r: 6 },
    { x: 50, y: 175, r: 5 },
    { x: 215, y: 170, r: 6 },
    { x: 130, y: 30, r: 4 },
    { x: 130, y: 195, r: 4 },
  ];

  return (
    <div className="nv-constell">
      <svg viewBox="0 0 260 220" className="nv-constell-svg">
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r="48" fill="url(#halo)" />
        {nodes.map((n, i) => {
          const pos = positions[i];
          if (!pos) return null;
          return (
            <g key={i}>
              <line
                x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                stroke="var(--ink-faint)" strokeWidth="0.6"
                strokeDasharray={n.type === "implicit" ? "2 3" : "0"}
              />
              <circle
                cx={pos.x} cy={pos.y} r={pos.r}
                fill="var(--bg-1)" stroke="var(--ink-soft)" strokeWidth="1"
              />
              <text
                x={pos.x} y={pos.y + pos.r + 11}
                textAnchor="middle" className="nv-constell-label"
              >
                {n.fileName.replace(/\.md$/, "").slice(0, 12)}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="var(--accent)" strokeWidth="0.8" strokeDasharray="2 3" />
        <circle cx={cx} cy={cy} r={r} fill="var(--accent)" stroke="var(--accent)" />
        <text x={cx} y={cy + r + 13} textAnchor="middle" className="nv-constell-label is-active">
          current
        </text>
      </svg>
    </div>
  );
}
