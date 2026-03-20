import type { Request, Response } from "express";
import { captureContent } from "./capture.service.js";
import { apiCreated } from "../../utils/api-response.js";
import { UnauthorizedError } from "../../errors/app-error.js";
import { captureSchema } from "./capture.schemas.js";

export const handleCapture = async (req: Request, res: Response) => {
  if (req.role !== "admin") {
    throw new UnauthorizedError();
  }

  const { content, note, folderId } = captureSchema.parse(req.body);

  const result = await captureContent({
    content: content.trim(),
    note: note || undefined,
    folderId: folderId || undefined,
  });
  apiCreated(res, result);
};
