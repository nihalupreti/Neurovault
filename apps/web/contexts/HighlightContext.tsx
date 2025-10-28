"use client";

import { ReactNode, createContext, useContext, useState } from "react";

interface HighlightContextType {
  highlightText: string | null;
  currentFileId: string | null;
  setHighlight: (fileId: string, text: string) => void;
  clearHighlight: () => void;
}

const HighlightContext = createContext<HighlightContextType | undefined>(
  undefined
);

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [highlightText, setHighlightText] = useState<string | null>(null);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);

  const setHighlight = (fileId: string, text: string) => {
    setCurrentFileId(fileId);
    setHighlightText(text);
  };

  const clearHighlight = () => {
    setHighlightText(null);
    setCurrentFileId(null);
  };

  return (
    <HighlightContext.Provider
      value={{ highlightText, currentFileId, setHighlight, clearHighlight }}
    >
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight() {
  const context = useContext(HighlightContext);
  if (context === undefined) {
    throw new Error("useHighlight must be used within a HighlightProvider");
  }
  return context;
}
