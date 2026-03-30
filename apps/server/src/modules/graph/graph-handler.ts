import { Request, Response } from "express";
import {
  getNeighbors,
  getFullGraph,
  getFileCluster,
  getAllClusters,
  getShortestPath,
  getStats,
} from "./graph-service.js";
import { runSimilarityJob } from "./similarity-job.js";

export const handleGetGraph = async (_req: Request, res: Response) => {
  try {
    const graph = await getFullGraph();
    res.json(graph);
  } catch (err) {
    console.error("Graph fetch error:", err);
    res.status(503).json({ error: "Graph service unavailable" });
  }
};

export const handleGetNeighbors = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const result = await getNeighbors(fileId!);
    if (result.explicit.length === 0 && result.implicit.length === 0) {
      return res.status(404).json({ error: "File not found in graph" });
    }
    res.json(result);
  } catch (err) {
    console.error("Neighbors error:", err);
    res.status(503).json({ error: "Graph service unavailable" });
  }
};

export const handleGetFileCluster = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const result = await getFileCluster(fileId!);
    if (result.clusterId === -1) {
      return res.status(404).json({ error: "File not found in graph" });
    }
    res.json(result);
  } catch (err) {
    console.error("Cluster error:", err);
    res.status(503).json({ error: "Graph service unavailable" });
  }
};

export const handleGetAllClusters = async (_req: Request, res: Response) => {
  try {
    const result = await getAllClusters();
    res.json(result);
  } catch (err) {
    console.error("Clusters error:", err);
    res.status(503).json({ error: "Graph service unavailable" });
  }
};

export const handleGetShortestPath = async (req: Request, res: Response) => {
  try {
    const { fromId, toId } = req.params;
    const result = await getShortestPath(fromId!, toId!);
    res.json(result);
  } catch (err) {
    console.error("Path error:", err);
    res.status(503).json({ error: "Graph service unavailable" });
  }
};

export const handleGetStats = async (_req: Request, res: Response) => {
  try {
    const result = await getStats();
    res.json(result);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(503).json({ error: "Graph service unavailable" });
  }
};

export const handleRebuild = async (_req: Request, res: Response) => {
  res.status(202).json({ status: "started" });
  runSimilarityJob({ full: true }).catch((err) =>
    console.error("Rebuild error:", err)
  );
};
