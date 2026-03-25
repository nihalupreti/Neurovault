"use client";

import { useCallback, useRef, useState } from "react";
import { ENDPOINTS } from "@/api/endpoints";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Citation {
  sourceIndex: number;
  fileId: string;
  fileName: string;
  excerpt: string;
}

interface StreamCallbacks {
  onToken: (content: string) => void;
  onCitations: (citations: Citation[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
  onRateLimited?: (contact: { email?: string; linkedin?: string }) => void;
}

export function useQAStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const ask = useCallback(
    async (
      question: string,
      history: ChatMessage[],
      callbacks: StreamCallbacks,
      limit?: number
    ) => {
      abort();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const secret = typeof window !== "undefined" ? localStorage.getItem("nv_admin_secret") : null;

        const response = await fetch(
          ENDPOINTS.qa.ask,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
            },
            body: JSON.stringify({ question, history, limit }),
            signal: controller.signal,
          }
        );

        if (response.status === 429) {
          const errorData = await response.json();
          callbacks.onRateLimited?.(errorData.contact || {});
          setIsStreaming(false);
          return;
        }

        if (!response.ok || !response.body) {
          callbacks.onError("Failed to connect to QA service");
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                switch (eventType) {
                  case "token":
                    callbacks.onToken(parsed.content);
                    break;
                  case "citations":
                    callbacks.onCitations(parsed);
                    break;
                  case "done":
                    callbacks.onDone();
                    break;
                  case "error":
                    callbacks.onError(parsed.message);
                    break;
                }
              } catch {
                // skip malformed JSON
              }
              eventType = "";
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          callbacks.onError("Connection lost");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [abort]
  );

  return { ask, abort, isStreaming };
}

export type { ChatMessage, Citation };
