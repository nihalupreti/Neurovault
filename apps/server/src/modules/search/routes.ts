import express from "express";
import type { Request, Response, NextFunction } from "express";
import { handleSearch } from "./search-handler.js";
import { rateLimiter } from "../auth/rate-limiter.js";

const router = express.Router();

const semanticRateLimiter = rateLimiter();

function conditionalRateLimit(req: Request, res: Response, next: NextFunction) {
  const q = (req.query.q as string)?.trim() || "";
  const isKeywordOnly = q.startsWith("!keyword:");
  const isFileOnly = q.startsWith("!file:") && !q.includes("!semantic:");

  if (req.role === "admin" || isKeywordOnly || isFileOnly) {
    return next();
  }

  return semanticRateLimiter(req, res, next);
}

router.get("/", conditionalRateLimit, handleSearch);

export default router;
