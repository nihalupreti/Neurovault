import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID().slice(0, 12);
  res.setHeader("X-Request-Id", id);
  (req as Request & { id: string }).id = id;
  next();
}
