import { Request, Response } from "express";
import { parseSearchQuery } from "./search.query-parser.js";
import {
  searchSemantic,
  searchByFileName,
  searchHybrid,
  searchKeyword,
} from "./search.service.js";
import { apiSuccess } from "../../utils/api-response.js";
import { InvalidSearchQueryError } from "./search.errors.js";
import { searchQuerySchema } from "@neurovault/shared/schemas";

export const handleSearch = async (req: Request, res: Response) => {
  const startTime = Date.now();

  const { q } = searchQuerySchema.parse(req.query);

  const parsed = parseSearchQuery(q.trim());
  const searchTerm = parsed.hybrid || parsed.semantic || parsed.keyword;

  if (!parsed.file && !searchTerm) {
    throw new InvalidSearchQueryError("No valid search terms");
  }

  let results: Array<{
    id: string;
    score: number;
    type: "file" | "semantic";
    payload: { text: string; fileId: string; fileName: string; chunk_index: number };
  }> = [];
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

      return apiSuccess(res, {
        results,
        total: results.length,
        query: q.trim(),
        parsed,
        searchTime: Date.now() - startTime,
      });
    }
    if (files.length === 0) {
      return apiSuccess(res, {
        results: [],
        total: 0,
        query: q.trim(),
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
        text: String(r.payload.text ?? ""),
        fileId: String(r.payload.fileId ?? ""),
        fileName: String(r.payload.fileName ?? ""),
        chunk_index: Number(r.payload.chunk_index ?? 0),
      },
    }));
  } else if (parsed.keyword) {
    const keywordResults = await searchKeyword(
      parsed.keyword,
      fileIds ? { fileId: { $in: fileIds } } : undefined,
    );
    results = keywordResults.map((r) => ({
      id: r.id,
      score: 1.0,
      type: "semantic" as const,
      payload: {
        text: String(r.payload.text ?? ""),
        fileId: String(r.payload.fileId ?? ""),
        fileName: String(r.payload.fileName ?? ""),
        chunk_index: Number(r.payload.chunk_index ?? 0),
      },
    }));
  } else if (parsed.semantic) {
    const similarities = await searchSemantic(parsed.semantic, fileIds);
    results = (similarities.points || []).map((point: { id: string | number; score: number; payload?: Record<string, unknown> | null }) => ({
      id: String(point.id),
      score: point.score,
      type: "semantic" as const,
      payload: {
        text: String(point.payload?.text ?? ""),
        fileId: String(point.payload?.fileId ?? ""),
        fileName: String(point.payload?.fileName ?? ""),
        chunk_index: Number(point.payload?.chunk_index ?? 0),
      },
    }));
  }

  apiSuccess(res, {
    results,
    total: results.length,
    query: q,
    parsed,
    searchTime: Date.now() - startTime,
  });
};
