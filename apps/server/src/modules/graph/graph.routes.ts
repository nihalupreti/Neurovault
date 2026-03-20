import express from "express";
import type { Request, Response, NextFunction } from "express";
import {
  handleGetGraph,
  handleGetNeighbors,
  handleGetFileCluster,
  handleGetAllClusters,
  handleGetShortestPath,
  handleGetStats,
  handleRebuild,
} from "./graph.handler.js";
import { asHandler } from "../../utils/as-handler.js";
import { UnauthorizedError } from "../../errors/app-error.js";

const router = express.Router();

function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.role !== "admin") {
    throw new UnauthorizedError();
  }
  next();
}

router.get("/", asHandler(handleGetGraph));
router.get("/file/:fileId/neighbors", asHandler(handleGetNeighbors));
router.get("/file/:fileId/cluster", asHandler(handleGetFileCluster));
router.get("/clusters", asHandler(handleGetAllClusters));
router.get("/path/:fromId/:toId", asHandler(handleGetShortestPath));
router.get("/stats", asHandler(handleGetStats));
router.post("/rebuild", requireAdmin, asHandler(handleRebuild));

export default router;
