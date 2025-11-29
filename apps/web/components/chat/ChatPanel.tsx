"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQAStream } from "@/hooks/useQAStream";
import type { ChatMessage as ChatMessageType, Citation } from "@/hooks/useQAStream";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming: boolean;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const { ask, abort, isStreaming } = useQAStream();

  const scrollToBottom = useCallback(() => {
    if (!userScrolledRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    userScrolledRef.current = scrollHeight - scrollTop - clientHeight > 50;
  };

  const handleSend = useCallback(
    (question: string) => {
      const userMsg: Message = {
        role: "user",
        content: question,
        isStreaming: false,
      };

      const assistantMsg: Message = {
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      userScrolledRef.current = false;

      const history: ChatMessageType[] = messages
        .filter((m) => !m.isStreaming)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      ask(question, history, {
        onToken: (content) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1]!;
            updated[updated.length - 1] = {
              ...last,
              content: last.content + content,
            };
            return updated;
          });
        },
        onCitations: (citations) => {
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

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-gray-700 bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-medium text-white">Ask your notes</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Ask a question about your notes
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
      </div>

      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
