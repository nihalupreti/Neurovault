"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQAStream } from "@/hooks/useQAStream";
import type { ChatMessage as ChatMessageType, Citation } from "@/hooks/useQAStream";
import { ChatBubble } from "./ChatBubble";
import type { Message } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";
import { RateLimitOverlay } from "./RateLimitOverlay";
import { Icon } from "../icons";
import { useAuth } from "@/contexts/auth-context";
import {
  useConversations,
  useConversationMessages,
  useCreateConversation,
  useDeleteConversation,
  useInvalidateMessages,
} from "@/hooks/useConversations";
import type { Conversation } from "@/api/client";

const CONTEXT_TYPE = "vault";
const CONTEXT_ID = "vault";

const SUGGESTIONS = [
  "Summarize my reading on this topic",
  "What are the key connections?",
  "Recent thoughts on this?",
];

interface RateLimitInfo {
  contact: { email?: string; linkedin?: string };
}

export default function ChatPane({ onSelectFile }: { onSelectFile?: (id: string) => void }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rateLimited, setRateLimited] = useState<RateLimitInfo | null>(null);
  const [showList, setShowList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ask, abort, isStreaming } = useQAStream();
  const invalidateMessages = useInvalidateMessages();

  const { data: conversations = [] } = useConversations(CONTEXT_TYPE, CONTEXT_ID);
  const { data: loadedMessages } = useConversationMessages(activeConversationId);
  const createConv = useCreateConversation(CONTEXT_TYPE, CONTEXT_ID);
  const deleteConv = useDeleteConversation(CONTEXT_TYPE, CONTEXT_ID);

  useEffect(() => {
    if (loadedMessages?.data && !isStreaming) {
      setMessages(
        loadedMessages.data.map((m) => ({
          role: m.role,
          content: m.content,
          citations: m.citations,
          isStreaming: false,
        })),
      );
    }
  }, [loadedMessages, isStreaming]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = useCallback(async () => {
    const conv = await createConv.mutateAsync();
    setActiveConversationId(conv._id);
    setMessages([]);
    setShowList(false);
  }, [createConv]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setActiveConversationId(conv._id);
    setShowList(false);
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConv.mutateAsync(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    },
    [deleteConv, activeConversationId],
  );

  const handleSend = useCallback(
    async (question: string) => {
      if (rateLimited && !isAdmin) return;

      let convId = activeConversationId;
      if (!convId) {
        const conv = await createConv.mutateAsync();
        convId = conv._id;
        setActiveConversationId(convId);
      }

      const userMsg: Message = { role: "user", content: question, isStreaming: false };
      const assistantMsg: Message = { role: "assistant", content: "", isStreaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const history: ChatMessageType[] = messages
        .filter((m) => !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));

      ask({
        question,
        history,
        conversationId: convId,
        callbacks: {
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
          onTitle: () => {
            queryClient.invalidateQueries({
              queryKey: ["conversations", CONTEXT_TYPE, CONTEXT_ID],
            });
          },
          onDone: () => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1]!;
              updated[updated.length - 1] = { ...last, isStreaming: false };
              return updated;
            });
            if (convId) invalidateMessages(convId);
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
          onRateLimited: (contact) => {
            setRateLimited({ contact });
            setMessages((prev) => {
              const updated = [...prev];
              updated.pop();
              updated.pop();
              return updated;
            });
          },
        },
      });
    },
    [ask, messages, rateLimited, isAdmin, activeConversationId, createConv, invalidateMessages, queryClient],
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
        <div className="nv-pane-eyebrow">
          <button
            className="nv-chat-toggle-list"
            onClick={() => setShowList((p) => !p)}
            title="Conversations"
          >
            <Icon name="list" size={14} />
          </button>
          <span>ask your notes</span>
        </div>
        <button className="nv-chat-new-btn" onClick={handleNewChat} title="New chat">
          <Icon name="plus" size={14} />
        </button>
      </div>

      {showList && (
        <div className="nv-chat-conv-list">
          {conversations.length === 0 && (
            <div className="nv-chat-conv-empty">No conversations yet</div>
          )}
          {conversations.map((c) => (
            <div
              key={c._id}
              className={`nv-chat-conv-item ${c._id === activeConversationId ? "nv-active" : ""}`}
              onClick={() => handleSelectConversation(c)}
            >
              <span className="nv-chat-conv-title">{c.title}</span>
              <button
                className="nv-chat-conv-del"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(c._id);
                }}
                title="Delete"
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="nv-chat-stream">
        {messages.length === 0 && !activeConversationId && (
          <div className="nv-chat-empty-hero">
            <div>
              <div className="nv-chat-empty-icon">
                <Icon name="chat" size={20} />
              </div>
              <h4>Ask anything about your notes</h4>
              <p>Answers stream with cited sources</p>
              <div className="nv-chat-suggest">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => handleSend(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && activeConversationId && (
          <div className="nv-chat-empty-hero">
            <div>
              <div className="nv-chat-empty-icon">
                <Icon name="chat" size={20} />
              </div>
              <h4>New conversation</h4>
              <p>Ask a question to get started</p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} onSelectFile={onSelectFile} />
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <ChatComposer
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={!!rateLimited && !isAdmin}
        />
        {rateLimited && !isAdmin && <RateLimitOverlay contact={rateLimited.contact} />}
      </div>
    </div>
  );
}
