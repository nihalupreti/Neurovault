import { Request, Response } from "express";
import { parseSearchQuery } from "./query-parser.js";
import {
  searchSemantic,
  searchByFileName,
  searchCombined,
} from "./search-service.js";

export const handleSearch = async (req: Request, res: Response) => {
  const startTime = Date.now();

  const q = (req.query.q as string)?.trim();
  if (!q) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  if (q.length > 1000) {
    return res.status(400).json({ error: "Query must be 1000 chars or less" });
  }

  const parsed = parseSearchQuery(q);

  if (!parsed.file && !parsed.semantic) {
    return res.status(400).json({ error: "No valid search terms" });
  }

  try {
    let results: any[] = [];

    if (parsed.file && parsed.semantic) {
      if (parsed.file.length > 200 || parsed.semantic.length > 800) {
        return res.status(400).json({ error: "Search term too long" });
      }
      const similarities = await searchCombined(parsed.file, parsed.semantic);
      results = (similarities.points || []).map((point: any) => ({
        id: String(point.id),
        score: point.score,
        type: "semantic" as const,
        payload: {
          text: point.payload?.text ?? "",
          fileId: point.payload?.fileId ?? "",
          fileName: point.payload?.fileName ?? "",
          chunk_index: point.payload?.chunk_index ?? 0,
        },
      }));
    } else if (parsed.file) {
      if (parsed.file.length > 200) {
        return res.status(400).json({ error: "File pattern too long" });
      }
      const files = await searchByFileName(parsed.file);
      results = files.map((file) => ({
        id: file._id.toString(),
        score: 1.0,
        type: "file" as const,
        payload: {
          text: "",
          fileId: file._id.toString(),
          fileName: file.name,
          chunk_index: -1,
        },
      }));
    } else if (parsed.semantic) {
      if (parsed.semantic.length > 800) {
        return res.status(400).json({ error: "Semantic query too long" });
      }
      const similarities = await searchSemantic(parsed.semantic);
      results = (similarities.points || []).map((point: any) => ({
        id: String(point.id),
        score: point.score,
        type: "semantic" as const,
        payload: {
          text: point.payload?.text ?? "",
          fileId: point.payload?.fileId ?? "",
          fileName: point.payload?.fileName ?? "",
          chunk_index: point.payload?.chunk_index ?? 0,
        },
      }));
    }

    const response = {
      results,
      total: results.length,
      query: q,
      parsed,
      searchTime: Date.now() - startTime,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
