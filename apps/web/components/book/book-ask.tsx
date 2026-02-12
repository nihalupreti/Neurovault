"use client";

import { useCallback, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { ENDPOINTS } from "@/api/endpoints";

type Scope = "chapter" | "book" | "connected" | "default";

interface Citation {
  sourceIndex: number;
  fileId: string;
  fileName: string;
  excerpt: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface BookAskProps {
  bookId: string;
  chapterNumber: number;
}

function updateLastMessage(
  prev: Message[],
  updater: (msg: Message) => Message
): Message[] {
  if (prev.length === 0) return prev;
  const updated = [...prev];
  updated[updated.length - 1] = updater(updated[updated.length - 1]!);
  return updated;
}

const SCOPE_TABS: Array<{ value: Scope; label: string }> = [
  { value: "chapter", label: "chapter" },
  { value: "book", label: "book" },
  { value: "connected", label: "+vault" },
  { value: "default", label: "vault" },
];

function scopeLabel(scope: Scope, chapterNumber: number): string {
  switch (scope) {
    case "chapter":
      return `ch. ${chapterNumber}`;
    case "book":
      return "whole book";
    case "connected":
      return "chapter + vault notes";
    case "default":
      return "everything";
  }
}

function placeholderText(scope: Scope): string {
  switch (scope) {
    case "chapter":
      return "ask about this chapter...";
    case "book":
      return "ask about this book...";
    case "connected":
      return "ask, with chapter + linked notes...";
    case "default":
      return "ask about everything...";
  }
}

export function BookAsk({ bookId, chapterNumber }: BookAskProps) {
  const [scope, setScope] = useState<Scope>("chapter");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(async () => {
    const question = draft.trim();
    if (!question || isStreaming) return;

    const userMsg: Message = { role: "user", content: question };
    const history = messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setDraft("");

    const assistantMsg: Message = { role: "assistant", content: "", citations: [] };
    setMessages((prev) => [...prev, assistantMsg]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      const secret = typeof window !== "undefined"
        ? localStorage.getItem("nv_admin_secret")
        : null;

      const response = await fetch(ENDPOINTS.qa.ask, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          question,
          history,
          limit: 5,
          scope,
          bookId,
          chapterNumber,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Failed to connect to Q&A service.",
          };
          return updated;
        });
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
            const raw = line.slice(6);
            try {
              const parsed = JSON.parse(raw);
              switch (eventType) {
                case "token":
                  setMessages((prev) =>
                    updateLastMessage(prev, (m) => ({
                      ...m,
                      content: m.content + parsed.content,
                    }))
                  );
                  break;
                case "citations":
                  setMessages((prev) =>
                    updateLastMessage(prev, (m) => ({
                      ...m,
                      citations: parsed,
                    }))
                  );
                  break;
                case "error":
                  setMessages((prev) =>
                    updateLastMessage(prev, (m) => ({
                      ...m,
                      content: m.content || parsed.message,
                    }))
                  );
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
        setMessages((prev) =>
          updateLastMessage(prev, (m) => ({
            ...m,
            content: m.content || "Connection lost.",
          }))
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [draft, isStreaming, messages, scope, bookId, chapterNumber]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="nv-chat">
      <div className="nv-chat-head">
        <span className="nv-chat-context">scoped Q&amp;A &middot; {scope}</span>
      </div>

      <div className="nv-scope-tabs" role="tablist">
        {SCOPE_TABS.map((s) => (
          <button
            key={s.value}
            className={scope === s.value ? "is-active" : ""}
            role="tab"
            aria-selected={scope === s.value}
            onClick={() => setScope(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="nv-chat-stream" ref={streamRef}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`nv-msg ${msg.role === "user" ? "nv-msg-user" : "nv-msg-asst"}`}
          >
            <span className="nv-msg-tag">
              {msg.role === "user" ? "you" : `assistant · ${scopeLabel(scope, chapterNumber)}`}
            </span>
            <div className="nv-msg-body">
              <p>{msg.content}</p>
            </div>
            {msg.citations && msg.citations.length > 0 && (
              <div className="nv-msg-cites">
                {msg.citations.map((c, ci) => (
                  <button key={ci} className="nv-msg-cite">
                    <span className="nv-msg-cite-n">{ci + 1}</span>
                    <span className="nv-msg-cite-meta">
                      <em>{c.fileName}</em>
                      <span>{c.excerpt}</span>
                    </span>
                    <Icon name="ext" size={11} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="nv-chat-composer">
        <textarea
          rows={2}
          placeholder={placeholderText(scope)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="nv-chat-composer-row">
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)" }}>
            <kbd>&crarr;</kbd> send &nbsp;<kbd>&uArr;&crarr;</kbd> newline
          </span>
          <button className="nv-send" onClick={sendMessage} disabled={isStreaming}>
            <Icon name="send" size={12} /> ask
          </button>
        </div>
      </div>
    </div>
  );
}
