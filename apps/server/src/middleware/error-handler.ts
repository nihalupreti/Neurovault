import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError, RateLimitError } from "../errors/app-error.js";

function getRequestId(req: Request): string {
  return (req as Request & { id?: string }).id ?? "unknown";
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = getRequestId(req);
  const path = req.originalUrl || req.path;
  const timestamp = new Date().toISOString();

  console.error({
    name: err.name,
    message: err.message,
    stack: err.stack,
    path,
    method: req.method,
    requestId,
  });

  if (err instanceof AppError) {
    if (err instanceof RateLimitError) {
      res
        .status(429)
        .set("Retry-After", String(err.retryAfter))
        .json({
          success: false,
          statusCode: 429,
          error: {
            code: err.code,
            message: err.message,
            details: null,
            timestamp,
            path,
            suggestion: err.suggestion ?? "Please wait before retrying.",
          },
          requestId,
        });
      return;
    }

    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
        timestamp,
        path,
        suggestion: err.suggestion ?? null,
      },
      requestId,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      statusCode: 400,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
        timestamp,
        path,
        suggestion: "Check the request body against the API documentation.",
      },
      requestId,
    });
    return;
  }

  const mongoError = err as Error & { code?: number; keyPattern?: Record<string, unknown> };
  if (mongoError.code === 11000) {
    res.status(409).json({
      success: false,
      statusCode: 409,
      error: {
        code: "CONFLICT",
        message: "A record with this value already exists",
        details: { keys: mongoError.keyPattern ?? null },
        timestamp,
        path,
        suggestion: "Use a unique value or check for existing records.",
      },
      requestId,
    });
    return;
  }

  res.status(500).json({
    success: false,
    statusCode: 500,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      details: null,
      timestamp,
      path,
      suggestion: "If this persists, contact support with the requestId.",
    },
    requestId,
  });
}
