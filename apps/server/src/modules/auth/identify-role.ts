import type { Request, Response, NextFunction } from "express";
import "./types.js";

export function identifyRole(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  req.role = token && token === process.env.ADMIN_SECRET ? "admin" : "guest";
  next();
}
