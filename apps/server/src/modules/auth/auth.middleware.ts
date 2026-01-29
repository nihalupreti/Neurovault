import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import "./auth.types.js";

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function identifyRole(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const secret = process.env.ADMIN_SECRET;
  req.role = token && secret && constantTimeEquals(token, secret) ? "admin" : "guest";
  next();
}
