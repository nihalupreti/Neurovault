"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQAStream } from "@/hooks/useQAStream";
import type { ChatMessage as ChatMessageType, Citation } from "@/hooks/useQAStream";
import { ChatBubble } from "./ChatBubble";
import type { Message } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";
import { Icon } from "../icons";

const SUGGESTIONS = [
  "Summarize my reading on this topic",
  "What are the key connections?",
  "Recent thoughts on this?",
];

export default function ChatPane() {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ask, abort, isStreaming } = useQAStream();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    (question: string) => {
      const userMsg: Message = { role: "user", content: question, isStreaming: false };
      const assistantMsg: Message = { role: "assistant", content: "", isStreaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const history: ChatMessageType[] = messages
        .filter((m) => !m.isStreaming)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      ask(question, history, {
        onToken: (content) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1]!;
            updated[updated.length - 1] = { ...last, content: last.content + content };
            return updated;
          });
        },
        onCitations: (citations: Citation[]) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1]!;
            updated[updated.length - 1] = { ...last, citations };
            return updated;
          });
        },
        onDone: () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1]!;
            updated[updated.length - 1] = { ...last, isStreaming: false };
            return updated;
          });
        },
        onError: (message) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1]!;
            updated[updated.length - 1] = {
              ...last,
              content: last.content || `Error: ${message}`,
              isStreaming: false,
            };
            return updated;
          });
        },
      });
    },
    [ask, messages]
  );

  const handleStop = useCallback(() => {
    abort();
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last) {
        updated[updated.length - 1] = { ...last, isStreaming: false };
      }
      return updated;
    });
  }, [abort]);

  return (
    <div className="nv-chat">
      <div className="nv-chat-head">
        <div className="nv-pane-eyebrow">ask your notes</div>
        <span className="nv-chat-context">context &middot; whole vault</span>
      </div>

      <div ref={scrollRef} className="nv-chat-stream">
        {messages.length === 0 && (
          <div className="nv-chat-empty">
            <Icon name="sparkle" size={14} />
            <p>
              Pose a question. Answers stream from your vault with inline
              citations back to source chunks.
            </p>
            <div className="nv-chat-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
      </div>

      <ChatComposer
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
