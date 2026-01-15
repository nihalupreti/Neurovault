"use client";

import { KeyboardEvent, useState } from "react";
import { Icon } from "../icons";

interface ChatComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatComposer({ onSend, onStop, isStreaming, disabled }: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"hybrid" | "semantic" | "keyword">("hybrid");

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSend(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="nv-chat-composer">
      <textarea
        rows={2}
        placeholder="Ask anything in your vault…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <div className="nv-chat-composer-row">
        <div className="nv-chat-mode">
          {(["hybrid", "semantic", "keyword"] as const).map((m) => (
            <button
              key={m}
              className={mode === m ? "is-active" : ""}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          className={`nv-send ${isStreaming ? "is-streaming" : ""}`}
          onClick={isStreaming ? onStop : send}
        >
          {isStreaming ? (
            <><Icon name="stop" size={11} /> stop</>
          ) : (
            <><Icon name="send" size={11} /> send</>
          )}
        </button>
      </div>
    </div>
  );
}
