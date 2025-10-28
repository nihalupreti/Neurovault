import { Request, Response } from "express";
import { searchSimilarContent } from "./search-service.js";

export const handleSearch = async (req: Request, res: Response) => {
  const startTime = Date.now();

  const q = (req.query.q as string)?.trim();
  if (!q) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const similarContent = await searchSimilarContent(q);

    const results = similarContent.points.map((point) => ({
      id: point.id,
      score: point.score,
      payload: {
        text: point.payload?.text,
        fileId: point.payload?.fileId,
        chunk_index: point.payload?.chunk_index,
      },
    }));

    const response = {
      results,
      total: results.length,
      query: q,
      searchTime: Date.now() - startTime,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
