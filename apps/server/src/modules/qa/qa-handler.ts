import { Request, Response } from "express";
import { askQuestion } from "./qa-service.js";
import type { ChatMessage } from "./providers/types.js";

export const handleAsk = async (req: Request, res: Response) => {
  const { question, history, limit } = req.body as {
    question?: string;
    history?: ChatMessage[];
    limit?: number;
  };

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "question is required" });
  }

  if (question.length > 1000) {
    return res.status(400).json({ error: "question must be 1000 chars or less" });
  }

  const validRoles = new Set(["user", "assistant"]);
  const sanitizedHistory = Array.isArray(history)
    ? history.filter(
        (m) =>
          validRoles.has(m?.role) &&
          typeof m?.content === "string" &&
          m.content.length <= 4000
      )
    : [];

  const clampedLimit =
    limit != null ? Math.max(1, Math.min(20, Math.floor(limit))) : undefined;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const abortController = new AbortController();
  req.on("close", () => abortController.abort());

  try {
    const { stream, citations } = await askQuestion({
      question: question.trim(),
      history: sanitizedHistory,
      limit: clampedLimit,
    });

    for await (const token of stream) {
      if (abortController.signal.aborted) break;
      res.write(`event: token\ndata: ${JSON.stringify({ content: token })}\n\n`);
    }

    if (!abortController.signal.aborted) {
      res.write(`event: citations\ndata: ${JSON.stringify(citations)}\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
  } finally {
    res.end();
  }
};
