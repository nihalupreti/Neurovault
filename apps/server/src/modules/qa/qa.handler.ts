import { Request, Response } from "express";
import { askQuestion } from "./qa.service.js";
import { askSchema } from "./qa.schemas.js";

export const handleAsk = async (req: Request, res: Response) => {
  const { question, history, limit, scope, bookId, chapterNumber } = askSchema.parse(req.body);

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
      history,
      limit,
      scope: scope as "chapter" | "book" | "connected" | undefined,
      bookId,
      chapterNumber,
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
