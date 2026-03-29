"use client";

import { useHighlight } from "@/contexts/HighlightContext";

interface Citation {
  sourceIndex: number;
  fileId: string;
  fileName: string;
  excerpt: string;
}

export default function CitationCard({ citation }: { citation: Citation }) {
  const { setHighlight } = useHighlight();

  const handleClick = () => {
    setHighlight(citation.fileId, citation.excerpt);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-start gap-2 p-2 rounded-md bg-gray-800/50 border border-gray-700/50 hover:border-blue-500/50 hover:bg-gray-800 transition-colors text-left w-full cursor-pointer"
    >
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-medium">
        {citation.sourceIndex}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 truncate">{citation.fileName}</p>
        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
          {citation.excerpt}
        </p>
      </div>
    </button>
  );
}
