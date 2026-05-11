"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import { Icon } from "@/components/icons";
import { clusterColor } from "./graph-sidebar";
import type { GraphNode, FolderNode, GraphEdge } from "@neurovault/shared/types";

export interface SimNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: "file" | "folder";
  clusterId?: number;
  radius: number;
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
  edgeType: "LINKS_TO" | "CHILD_OF";
  isCrossCluster: boolean;
}

interface GraphCanvasProps {
  nodes: SimNode[];
  links: SimLink[];
  adjacency: Map<string, Set<string>>;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null, type: "file" | "folder") => void;
  onNavigateNode: (id: string) => void;
  search: string;
}

function clampRadius(degree: number): number {
  return Math.min(12, Math.max(4, Math.sqrt(degree) * 3));
}

export function buildGraphData(
  fileNodes: GraphNode[],
  folderNodes: FolderNode[],
  edges: GraphEdge[],
  filters: { files: boolean; folders: boolean; books: boolean },
): { simNodes: SimNode[]; simLinks: SimLink[]; adjacency: Map<string, Set<string>> } {
  const degreeMap = new Map<string, number>();
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
  }

  const visibleIds = new Set<string>();
  const simNodes: SimNode[] = [];

  if (filters.files) {
    for (const n of fileNodes) {
      visibleIds.add(n.fileId);
      simNodes.push({
        id: n.fileId,
        label: n.fileName,
        type: "file",
        clusterId: n.clusterId,
        radius: clampRadius(degreeMap.get(n.fileId) ?? 0),
      });
    }
  }

  if (filters.folders) {
    for (const f of folderNodes) {
      visibleIds.add(f.folderId);
      simNodes.push({
        id: f.folderId,
        label: f.name,
        type: "folder",
        clusterId: undefined,
        radius: clampRadius(degreeMap.get(f.folderId) ?? 0),
      });
    }
  }

  const adjacency = new Map<string, Set<string>>();
  const simLinks: SimLink[] = [];

  for (const e of edges) {
    if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) continue;

    const sourceNode = simNodes.find((n) => n.id === e.source);
    const targetNode = simNodes.find((n) => n.id === e.target);
    const isCross =
      sourceNode?.clusterId != null &&
      targetNode?.clusterId != null &&
      sourceNode.clusterId !== targetNode.clusterId;

    simLinks.push({
      source: e.source,
      target: e.target,
      edgeType: e.type,
      isCrossCluster: isCross,
    });

    if (!adjacency.has(e.source)) adjacency.set(e.source, new Set());
    if (!adjacency.has(e.target)) adjacency.set(e.target, new Set());
    adjacency.get(e.source)!.add(e.target);
    adjacency.get(e.target)!.add(e.source);
  }

  return { simNodes, simLinks, adjacency };
}

export function GraphCanvas({
  nodes,
  links,
  adjacency,
  selectedNodeId,
  onSelectNode,
  onNavigateNode,
  search,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const hoveredRef = useRef<string | null>(null);
  const dimAlphaRef = useRef(1);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef(nodes);
  const linksRef = useRef(links);

  nodesRef.current = nodes;
  linksRef.current = links;

  const searchLower = search.toLowerCase();

  const getNodeAt = useCallback(
    (mx: number, my: number): SimNode | null => {
      const t = transformRef.current;
      const x = (mx - t.x) / t.k;
      const y = (my - t.y) / t.k;
      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const n = nodesRef.current[i]!;
        const dx = x - (n.x ?? 0);
        const dy = y - (n.y ?? 0);
        if (dx * dx + dy * dy < (n.radius + 4) * (n.radius + 4)) return n;
      }
      return null;
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const t = transformRef.current;
    const hovered = hoveredRef.current;
    const hoverNeighbors = hovered ? adjacency.get(hovered) : null;
    const isHovering = hovered != null;
    const dimAlpha = dimAlphaRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    for (const link of linksRef.current) {
      const s = link.source as SimNode;
      const tgt = link.target as SimNode;
      if (s.x == null || tgt.x == null) continue;

      const inNeighborhood =
        isHovering && (s.id === hovered || tgt.id === hovered);

      let alpha: number;
      if (!isHovering) {
        alpha = link.isCrossCluster ? 0.2 : link.edgeType === "CHILD_OF" ? 0.3 : 0.5;
      } else if (inNeighborhood) {
        alpha = 0.7;
      } else {
        alpha = 0.04 * dimAlpha + (link.isCrossCluster ? 0.2 : 0.5) * (1 - dimAlpha);
      }

      ctx.beginPath();
      ctx.moveTo(s.x, s.y!);
      ctx.lineTo(tgt.x, tgt.y!);
      ctx.strokeStyle = `rgba(58, 58, 90, ${alpha})`;
      ctx.lineWidth = link.edgeType === "CHILD_OF" ? 0.6 : 0.8;
      if (link.isCrossCluster) ctx.setLineDash([4, 4]);
      else ctx.setLineDash([]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const node of nodesRef.current) {
      if (node.x == null) continue;
      const isHovered = node.id === hovered;
      const isNeighbor = hoverNeighbors?.has(node.id) ?? false;
      const isSelected = node.id === selectedNodeId;
      const matchesSearch = !searchLower || node.label.toLowerCase().includes(searchLower);

      let nodeAlpha: number;
      if (isHovering) {
        nodeAlpha = isHovered || isNeighbor ? 1 : 0.08 * dimAlpha + 1 * (1 - dimAlpha);
      } else if (searchLower && !matchesSearch) {
        nodeAlpha = 0.1;
      } else {
        nodeAlpha = 0.9;
      }

      const color = clusterColor(node.clusterId);

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y!, node.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = color + "80";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y!, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = nodeAlpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      const showLabel =
        isHovered || isSelected || (t.k > 2.5 && matchesSearch);
      if (showLabel) {
        const label = node.label.replace(/\.md$/, "");
        ctx.font = "10px 'Roboto Mono', monospace";
        const tw = ctx.measureText(label).width;
        const lx = node.x - tw / 2 - 5;
        const ly = node.y! - node.radius - 12;

        ctx.fillStyle = "#1a1a24";
        ctx.strokeStyle = "#2a2a3a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(lx, ly - 12, tw + 10, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f0f0f8";
        ctx.fillText(label, lx + 5, ly + 2);
      }
    }

    ctx.restore();
  }, [adjacency, selectedNodeId, searchLower]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(devicePixelRatio, devicePixelRatio);
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;

    const sim = forceSimulation<SimNode>(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => (d.edgeType === "CHILD_OF" ? 40 : 80)),
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(w / 2, h / 2))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d) => d.radius + 2),
      )
      .on("tick", draw);

    simRef.current = sim;

    const sel = select<HTMLCanvasElement, unknown>(canvas);

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.3, 5])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        draw();
      });

    sel.call(zoomBehavior);

    let dragNode: SimNode | null = null;

    sel.on("mousedown.drag", (event: MouseEvent) => {
      const node = getNodeAt(event.offsetX, event.offsetY);
      if (!node) return;
      dragNode = node;
      dragNode.fx = node.x;
      dragNode.fy = node.y;
      sim.alphaTarget(0.3).restart();
      sel.on(".zoom", null);
    });

    sel.on("mousemove", (event: MouseEvent) => {
      if (dragNode) {
        const t = transformRef.current;
        dragNode.fx = (event.offsetX - t.x) / t.k;
        dragNode.fy = (event.offsetY - t.y) / t.k;
        return;
      }
      const node = getNodeAt(event.offsetX, event.offsetY);
      const prev = hoveredRef.current;
      hoveredRef.current = node?.id ?? null;
      if (prev !== hoveredRef.current) {
        dimAlphaRef.current = node ? 0 : 1;
        const target = node ? 1 : 0;
        cancelAnimationFrame(animFrameRef.current);
        const animate = () => {
          const diff = target - dimAlphaRef.current;
          if (Math.abs(diff) < 0.02) {
            dimAlphaRef.current = target;
            draw();
            return;
          }
          dimAlphaRef.current += diff * 0.15;
          draw();
          animFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
      }
      canvas.style.cursor = node ? "pointer" : "grab";
    });

    sel.on("mouseup.drag", () => {
      if (dragNode) {
        dragNode.fx = null;
        dragNode.fy = null;
        dragNode = null;
        sim.alphaTarget(0);
        sel.call(zoomBehavior);
      }
    });

    sel.on("click", (event: MouseEvent) => {
      if (dragNode) return;
      const node = getNodeAt(event.offsetX, event.offsetY);
      if (node) {
        onSelectNode(node.id, node.type);
      } else {
        onSelectNode(null, "file");
      }
    });

    sel.on("dblclick.zoom", null);
    sel.on("dblclick", (event: MouseEvent) => {
      const node = getNodeAt(event.offsetX, event.offsetY);
      if (node && node.type === "file") {
        onNavigateNode(node.id);
      }
    });

    return () => {
      sim.stop();
      sel.on(".zoom", null);
      sel.on("mousedown.drag", null);
      sel.on("mousemove", null);
      sel.on("mouseup.drag", null);
      sel.on("click", null);
      sel.on("dblclick", null);
    };
  }, [nodes, links, draw, getNodeAt, onSelectNode, onNavigateNode]);

  const zoomBy = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const sel = select<HTMLCanvasElement, unknown>(canvas);
      const zoomBehavior = zoom<HTMLCanvasElement, unknown>().scaleExtent([0.3, 5]);
      sel.transition().duration(300).call(zoomBehavior.scaleBy, factor);
    },
    [],
  );

  const zoomFit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x == null) continue;
      minX = Math.min(minX, n.x - n.radius);
      minY = Math.min(minY, n.y! - n.radius);
      maxX = Math.max(maxX, n.x + n.radius);
      maxY = Math.max(maxY, n.y! + n.radius);
    }

    const gw = maxX - minX;
    const gh = maxY - minY;
    const padding = 40;
    const scale = Math.min((w - padding * 2) / gw, (h - padding * 2) / gh, 2);
    const tx = w / 2 - ((minX + maxX) / 2) * scale;
    const ty = h / 2 - ((minY + maxY) / 2) * scale;

    const sel = select<HTMLCanvasElement, unknown>(canvas);
    const zoomBehavior = zoom<HTMLCanvasElement, unknown>().scaleExtent([0.3, 5]);
    sel
      .transition()
      .duration(500)
      .call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(scale));
  }, [nodes]);

  return (
    <div className="nv-graph-canvas-wrap">
      <canvas ref={canvasRef} className="nv-graph-canvas" />
      <div className="nv-graph-zoom-controls">
        <button onClick={() => zoomBy(1.5)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">−</button>
        <button onClick={zoomFit} aria-label="Fit to screen">
          <Icon name="search" size={12} />
        </button>
      </div>
    </div>
  );
}
