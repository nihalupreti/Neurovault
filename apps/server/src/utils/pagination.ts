import type { Request } from "express";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}
