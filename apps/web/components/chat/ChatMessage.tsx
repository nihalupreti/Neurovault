"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CitationCard from "./CitationCard";

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
  isStreaming: boolean;
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-800 border border-gray-700 text-gray-200"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5" />
            )}
          </div>
        )}

        {message.citations && message.citations.length > 0 && !message.isStreaming && (
          <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
            <p className="text-xs text-gray-400 font-medium">Sources</p>
            {message.citations.map((c) => (
              <CitationCard key={c.sourceIndex} citation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
