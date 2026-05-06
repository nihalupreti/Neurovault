import { Request, Response } from "express";
import { askQuestion, generateTitle } from "./qa.service.js";
import { askSchema } from "@neurovault/shared/schemas";
import {
  loadConversationHistory,
  saveMessage,
  getConversationMessageCount,
} from "./qa.conversation.service.js";
import { Conversation } from "./qa.conversation.model.js";

export const handleAsk = async (req: Request, res: Response) => {
  const { question, history, limit, scope, bookId, chapterNumber, conversationId, contextItems } =
    askSchema.parse(req.body);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const abortController = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) abortController.abort();
  });

  let resolvedHistory = history;
  let isFirstExchange = false;

  if (conversationId) {
    const [dbHistory, msgCount] = await Promise.all([
      loadConversationHistory(conversationId),
      getConversationMessageCount(conversationId),
    ]);
    resolvedHistory = dbHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    isFirstExchange = msgCount === 0;
    await saveMessage(conversationId, "user", question.trim());
  }

  try {
    const { stream, citations } = await askQuestion({
      question: question.trim(),
      history: resolvedHistory,
      limit,
      scope: scope as "chapter" | "book" | "connected" | undefined,
      bookId,
      chapterNumber,
      contextItems,
    });

    let fullResponse = "";

    for await (const token of stream) {
      if (abortController.signal.aborted) break;
      fullResponse += token;
      res.write(`event: token\ndata: ${JSON.stringify({ content: token })}\n\n`);
    }

    if (!abortController.signal.aborted) {
      if (conversationId) {
        await saveMessage(conversationId, "assistant", fullResponse, citations);
      }

      res.write(`event: citations\ndata: ${JSON.stringify(citations)}\n\n`);

      if (conversationId && isFirstExchange) {
        try {
          const title = await generateTitle(question.trim());
          await Conversation.findByIdAndUpdate(conversationId, { title });
          res.write(`event: title\ndata: ${JSON.stringify({ title })}\n\n`);
        } catch {
          const fallback = question.trim().slice(0, 50);
          await Conversation.findByIdAndUpdate(conversationId, { title: fallback }).catch(() => {});
        }
      }

      res.write(`event: done\ndata: {}\n\n`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
  } finally {
    res.end();
  }
};
