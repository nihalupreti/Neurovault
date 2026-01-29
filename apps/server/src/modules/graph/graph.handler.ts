import { Request, Response } from "express";
import {
  getNeighbors,
  getFullGraph,
  getFileCluster,
  getAllClusters,
  getShortestPath,
  getStats,
} from "./graph.service.js";
import { runSimilarityJob } from "./graph.similarity-job.js";
import { apiSuccess } from "../../utils/api-response.js";
import { GraphUnavailableError, FileNotInGraphError } from "./graph.errors.js";

export const handleGetGraph = async (_req: Request, res: Response) => {
  try {
    const graph = await getFullGraph();
    apiSuccess(res, graph);
  } catch (err) {
    console.error("Graph fetch error:", err);
    throw new GraphUnavailableError();
  }
};

export const handleGetNeighbors = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const result = await getNeighbors(fileId!);
    apiSuccess(res, result);
  } catch (err) {
    console.error("Neighbors error:", err);
    throw new GraphUnavailableError();
  }
};

export const handleGetFileCluster = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const result = await getFileCluster(fileId!);
    if (result.clusterId === -1) {
      throw new FileNotInGraphError(fileId!);
    }
    apiSuccess(res, result);
  } catch (err) {
    if (err instanceof FileNotInGraphError) throw err;
    console.error("Cluster error:", err);
    throw new GraphUnavailableError();
  }
};

export const handleGetAllClusters = async (_req: Request, res: Response) => {
  try {
    const result = await getAllClusters();
    apiSuccess(res, result);
  } catch (err) {
    console.error("Clusters error:", err);
    throw new GraphUnavailableError();
  }
};

export const handleGetShortestPath = async (req: Request, res: Response) => {
  try {
    const { fromId, toId } = req.params;
    const result = await getShortestPath(fromId!, toId!);
    apiSuccess(res, result);
  } catch (err) {
    console.error("Path error:", err);
    throw new GraphUnavailableError();
  }
};

export const handleGetStats = async (_req: Request, res: Response) => {
  try {
    const result = await getStats();
    apiSuccess(res, result);
  } catch (err) {
    console.error("Stats error:", err);
    throw new GraphUnavailableError();
  }
};

export const handleRebuild = async (_req: Request, res: Response) => {
  apiSuccess(res, { status: "started" }, "Rebuild started", 202);
  runSimilarityJob({ full: true }).catch((err) =>
    console.error("Rebuild error:", err)
  );
};
