import { Router, Request, Response } from "express";
import { captureContent } from "./capture-service.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  if (req.role !== "admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { content, note, folderId } = req.body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  try {
    const result = await captureContent({
      content: content.trim(),
      note: note || undefined,
      folderId: folderId || undefined,
    });
    res.status(201).json(result);
  } catch (err: any) {
    console.error("Capture error:", err);
    res.status(500).json({ error: "Capture failed" });
  }
});

export default router;
