"use client";

import { Icon } from "../icons";
import { useHighlight } from "@/contexts/HighlightContext";
import type { Citation } from "@/hooks/useQAStream";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming: boolean;
}

export function ChatBubble({ message }: { message: Message }) {
  const { setHighlight } = useHighlight();

  if (message.role === "user") {
    return (
      <div className="nv-msg nv-msg-user">
        <span className="nv-msg-tag">you</span>
        <p>{message.content}</p>
      </div>
    );
  }

  return (
    <div className="nv-msg nv-msg-asst">
      <span className="nv-msg-tag">vault</span>
      <div className="nv-msg-body">
        <p>
          {message.content}
          {message.isStreaming && <span className="nv-cursor" />}
        </p>
        {message.citations && message.citations.length > 0 && (
          <div className="nv-msg-cites">
            {message.citations.map((c, i) => (
              <button
                key={c.sourceIndex}
                className="nv-msg-cite"
                onClick={() => setHighlight(c.fileId, c.excerpt)}
              >
                <span className="nv-msg-cite-n">{i + 1}</span>
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
    </div>
  );
}

export type { Message };
