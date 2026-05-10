import express from "express";
import {
  handleGetGraph,
  handleGetNeighbors,
  handleGetFileCluster,
  handleGetAllClusters,
  handleGetShortestPath,
  handleGetStats,
} from "./graph.handler.js";
import { asHandler } from "../../utils/as-handler.js";

const router = express.Router();

router.get("/", asHandler(handleGetGraph));
router.get("/file/:fileId/neighbors", asHandler(handleGetNeighbors));
router.get("/file/:fileId/cluster", asHandler(handleGetFileCluster));
router.get("/clusters", asHandler(handleGetAllClusters));
router.get("/path/:fromId/:toId", asHandler(handleGetShortestPath));
router.get("/stats", asHandler(handleGetStats));

export default router;
