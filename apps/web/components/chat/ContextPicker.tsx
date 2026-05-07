"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { search } from "@/api/client";
import { useSelectionContext } from "@/contexts/selection-context";
import { Icon } from "../icons";
import type { SearchResult } from "@/api/client";

interface ContextPickerProps {
  open: boolean;
  onClose: () => void;
}

export function ContextPicker({ open, onClose }: ContextPickerProps) {
  const { contextItems, addFile } = useSelectionContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await search(q);
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      addFile(result.payload.fileId, result.payload.fileName);
    },
    [addFile],
  );

  const isAdded = useCallback(
    (fileId: string) => contextItems.some((c) => c.fileId === fileId),
    [contextItems],
  );

  if (!open) return null;

  return (
    <>
      <div className="nv-context-picker-backdrop" onClick={onClose} />
      <div className="nv-context-picker">
        <div className="nv-context-picker-search">
          <Icon name="search" size={12} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="nv-context-picker-list">
          {loading && <div className="nv-context-picker-loading">Searching…</div>}

          {!loading && query && results.length === 0 && (
            <div className="nv-context-picker-empty">No files found</div>
          )}

          {!loading && !query && (
            <div className="nv-context-picker-hint">Type to search your vault</div>
          )}

          {results.map((r) => {
            const added = isAdded(r.payload.fileId);
            return (
              <button
                key={r.id}
                className={`nv-context-picker-item ${added ? "is-added" : ""}`}
                onClick={() => !added && handleSelect(r)}
                disabled={added}
              >
                <Icon name="file" size={12} />
                <span className="nv-context-picker-item-name">{r.payload.fileName}</span>
                {added && <span className="nv-context-picker-item-check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
