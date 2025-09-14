"use client";

import FolderTree from "@/components/folderStructure";
import MarkdownViewer from "@/components/markdownViewer";
import TableOfContents from "@/components/toc";
import axios from "axios";
import { extractHeadings } from "@/utils/extractHeadings";
import { useState } from "react";

export default function MainBody() {
  const [markdown, setMarkdown] = useState("");

  // Callback to handle file clicks in FolderTree
  const handleFileClick = async (fileId: string) => {
    try {
      const res = await axios.get(
        `http://localhost:3002/api/file?id=${fileId}`
      );
      setMarkdown(res.data);
    } catch (err) {
      console.error("Failed to fetch markdown:", err);
    }
  };

  return (
    <div className="flex px-70">
      {/* Sidebar */}
      <aside className="w-1/5 sticky top-24 h-screen">
        <FolderTree onFileSelect={handleFileClick} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-3xl mx-auto prose prose-invert prose-neutral text-justify">
        <MarkdownViewer markdown={markdown} />
      </main>

      {/* Navigation */}
      <aside className="w-1/5 p-4 sticky top-24 h-screen overflow-y-auto">
        <h1 className="font-mono uppercase font-medium text-gray-500">
          On this page
        </h1>

        <nav className="border-l border-gray-700 text-sm text-gray-400 mt-4">
          <TableOfContents headings={extractHeadings(markdown)} />
        </nav>
      </aside>
    </div>
  );
}
