import type { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { ForbiddenError } from "../../errors/app-error.js";
import { BookNotFoundError } from "./books.errors.js";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
};

export const handleGetAsset = async (
  req: Request<{ id: string; filePath: string }>,
  res: Response,
) => {
  const { id: bookId, filePath } = req.params;
  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  const baseDir = path.resolve(uploadDir, "books", bookId);
  const resolved = path.resolve(baseDir, filePath);

  if (!resolved.startsWith(baseDir + path.sep)) {
    throw new ForbiddenError("Path traversal detected");
  }

  try {
    await fs.access(resolved);
  } catch {
    throw new BookNotFoundError(filePath);
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  const data = await fs.readFile(resolved);
  res.send(data);
};
