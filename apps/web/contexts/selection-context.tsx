"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

const MAX_CONTEXT_ITEMS = 5;

export interface ContextItem {
  type: "selection" | "file";
  fileId: string;
  fileName: string;
  excerpt?: string;
}

interface SelectionContextValue {
  contextItems: ContextItem[];
  ghostItems: ContextItem[];
  addSelection: (fileId: string, fileName: string, excerpt: string) => void;
  addFile: (fileId: string, fileName: string) => void;
  removeItem: (index: number) => void;
  reattachGhost: (index: number) => void;
  clear: () => void;
  promoteToGhost: () => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionContextProvider({ children }: { children: ReactNode }) {
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [ghostItems, setGhostItems] = useState<ContextItem[]>([]);

  const addSelection = useCallback((fileId: string, fileName: string, excerpt: string) => {
    setContextItems((prev) => {
      if (prev.length >= MAX_CONTEXT_ITEMS) return prev;
      if (prev.some((c) => c.type === "selection" && c.fileId === fileId && c.excerpt === excerpt))
        return prev;
      return [...prev, { type: "selection", fileId, fileName, excerpt }];
    });
  }, []);

  const addFile = useCallback((fileId: string, fileName: string) => {
    setContextItems((prev) => {
      if (prev.length >= MAX_CONTEXT_ITEMS) return prev;
      if (prev.some((c) => c.fileId === fileId && c.type === "file")) return prev;
      return [...prev, { type: "file", fileId, fileName }];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setContextItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reattachGhost = useCallback((index: number) => {
    setGhostItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      setContextItems((ci) => {
        if (ci.length >= MAX_CONTEXT_ITEMS) return ci;
        return [...ci, item];
      });
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const promoteToGhost = useCallback(() => {
    setContextItems((prev) => {
      setGhostItems(prev);
      return [];
    });
  }, []);

  const clear = useCallback(() => {
    setContextItems([]);
  }, []);

  return (
    <SelectionContext.Provider
      value={{
        contextItems,
        ghostItems,
        addSelection,
        addFile,
        removeItem,
        reattachGhost,
        clear,
        promoteToGhost,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelectionContext() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelectionContext must be used within SelectionContextProvider");
  return ctx;
}
