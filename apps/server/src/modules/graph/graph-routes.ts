import express from "express";
import {
  handleGetGraph,
  handleGetNeighbors,
  handleGetFileCluster,
  handleGetAllClusters,
  handleGetShortestPath,
  handleGetStats,
  handleRebuild,
} from "./graph-handler.js";

const router = express.Router();

router.get("/", handleGetGraph);
router.get("/file/:fileId/neighbors", handleGetNeighbors);
router.get("/file/:fileId/cluster", handleGetFileCluster);
router.get("/clusters", handleGetAllClusters);
router.get("/path/:fromId/:toId", handleGetShortestPath);
router.get("/stats", handleGetStats);
router.post("/rebuild", handleRebuild);

export default router;
