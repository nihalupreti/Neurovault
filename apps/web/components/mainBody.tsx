"use client";

import { useEffect, useState } from "react";

import ChatPanel from "./chat/ChatPanel";
import FolderTree from "./folderTree";
import MarkdownViewer from "@/components/markdownViewer";
import TableOfContents from "@/components/toc";
import axios from "axios";
import { extractHeadings } from "@/utils/extractHeadings";
import { useHighlight } from "@/contexts/HighlightContext";

export default function MainBody({ isChatOpen, onChatClose }: { isChatOpen: boolean; onChatClose: () => void }) {
  const [markdown, setMarkdown] = useState("");
  const { highlightText, currentFileId, clearHighlight } = useHighlight();

  const handleFileClick = async (fileId: string) => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/file/?id=${fileId}`
      );
      setMarkdown(res.data);
      clearHighlight(); // clears highlight when manually clicking files
    } catch (err) {
      console.error("Failed to fetch markdown:", err);
    }
  };

  useEffect(() => {
    if (currentFileId && highlightText) {
      const loadFile = async () => {
        try {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/file/?id=${currentFileId}`
          );
          setMarkdown(res.data);
        } catch (err) {
          console.error("Failed to fetch markdown:", err);
        }
      };
      loadFile();
    }
  }, [currentFileId, highlightText]);

  return (
    <>
      <div className="flex px-70">
        {/* Sidebar */}
        <aside className="w-1/5 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto">
          <FolderTree onFileSelect={handleFileClick} />
        </aside>

        <main className={`flex-1 p-4 max-w-3xl mx-auto prose prose-invert prose-neutral text-justify ${isChatOpen ? "mr-0" : ""}`}>
          <MarkdownViewer markdown={markdown} highlightText={highlightText} />
        </main>
        {isChatOpen ? (
          <aside className="w-80 sticky top-24 h-[calc(100vh-6rem)]">
            <ChatPanel isOpen={isChatOpen} onClose={onChatClose} />
          </aside>
        ) : (
          <aside className="w-1/5 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto">
            <h1 className="font-mono uppercase font-medium text-gray-500">
              On this page
            </h1>
            <nav className="border-l border-gray-700 text-sm text-gray-400 mt-4">
              <TableOfContents headings={extractHeadings(markdown)} />
            </nav>
          </aside>
        )}
      </div>
    </>
  );
}
