import { Request, Response } from "express";
import { parseSearchQuery } from "./query-parser.js";
import {
  searchSemantic,
  searchByFileName,
  searchHybrid,
  searchKeyword,
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
  const searchTerm = parsed.hybrid || parsed.semantic || parsed.keyword;

  if (!parsed.file && !searchTerm) {
    return res.status(400).json({ error: "No valid search terms" });
  }

  try {
    let results: any[] = [];
    let fileIds: string[] | undefined;

    if (parsed.file) {
      const files = await searchByFileName(parsed.file);
      if (!searchTerm) {
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

        return res.status(200).json({
          results,
          total: results.length,
          query: q,
          parsed,
          searchTime: Date.now() - startTime,
        });
      }
      if (files.length === 0) {
        return res.status(200).json({
          results: [],
          total: 0,
          query: q,
          parsed,
          searchTime: Date.now() - startTime,
        });
      }
      fileIds = files.map((f) => f._id.toString());
    }

    if (parsed.hybrid) {
      const fused = await searchHybrid(parsed.hybrid, fileIds);
      results = fused.map((r) => ({
        id: r.id,
        score: r.score,
        type: "semantic" as const,
        payload: {
          text: r.payload.text ?? "",
          fileId: r.payload.fileId ?? "",
          fileName: r.payload.fileName ?? "",
          chunk_index: r.payload.chunk_index ?? 0,
        },
      }));
    } else if (parsed.keyword) {
      const keywordResults = await searchKeyword(parsed.keyword, fileIds);
      results = keywordResults.map((r) => ({
        id: r.id,
        score: 1.0,
        type: "semantic" as const,
        payload: {
          text: r.payload.text ?? "",
          fileId: r.payload.fileId ?? "",
          fileName: r.payload.fileName ?? "",
          chunk_index: r.payload.chunk_index ?? 0,
        },
      }));
    } else if (parsed.semantic) {
      const similarities = await searchSemantic(parsed.semantic, fileIds);
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

    res.status(200).json({
      results,
      total: results.length,
      query: q,
      parsed,
      searchTime: Date.now() - startTime,
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
