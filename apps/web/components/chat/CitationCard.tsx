"use client";

import { useHighlight } from "@/contexts/HighlightContext";
import { Icon } from "../icons";

interface Citation {
  sourceIndex: number;
  fileId: string;
  fileName: string;
  excerpt: string;
}

export default function CitationCard({ citation }: { citation: Citation }) {
  const { setHighlight } = useHighlight();

  return (
    <button
      onClick={() => setHighlight(citation.fileId, citation.excerpt)}
      className="nv-msg-cite"
    >
      <span className="nv-msg-cite-n">{citation.sourceIndex}</span>
      <span className="nv-msg-cite-meta">
        <em>{citation.fileName}</em>
        <span>{citation.excerpt}</span>
      </span>
      <Icon name="ext" size={11} />
    </button>
  );
}
