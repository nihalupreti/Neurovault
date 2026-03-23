import type { Response } from "express";

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: { code: string; details?: unknown };
  meta?: ResponseMeta;
  timestamp: string;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export function apiSuccess<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
  meta?: ResponseMeta,
): Response {
  const body: ApiResponseBody<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function apiCreated<T>(
  res: Response,
  data: T,
  message = "Resource created successfully",
): Response {
  return apiSuccess(res, data, message, 201);
}

export function apiNoContent(res: Response): Response {
  return res.status(204).send();
}

export function apiPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message = "Success",
): Response {
  return apiSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
