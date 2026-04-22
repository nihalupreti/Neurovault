"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { useSearch } from "@/hooks/useSearch";
import type { SearchMode } from "@/hooks/useSearch";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectFile?: (fileId: string) => void;
  onAskVault?: (query: string) => void;
}

export function CommandPalette({
  open,
  onClose,
  onSelectFile,
  onAskVault,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setQuery("");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const { results, mode, cleanQuery, isLoading, searchTime } = useSearch(query);

  return (
    <dialog
      ref={dialogRef}
      className="nv-modal-root nv-modal"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
        <div className="nv-modal-input">
          <Icon name="search" size={14} style={{ color: "var(--accent)" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vault, ask, or jump to file…"
          />
          <ModePill mode={mode} />
        </div>

        <div className="nv-modal-body">
          {!query && <EmptyState />}

          {query && (
            <>
              <div className="nv-modal-section">
                <div className="nv-modal-eyebrow">
                  <span>{mode === "file" ? "files" : "results"}</span>
                  <span className="nv-modal-meta">
                    {mode === "hybrid" ? "text + vector · RRF merged" : mode}
                    {searchTime > 0 && ` · ${searchTime}ms`}
                    {isLoading && " · searching…"}
                  </span>
                </div>
                <ul className="nv-results">
                  {results.map((r) => (
                    <li
                      key={r.id}
                      className="nv-result"
                      onClick={() => onSelectFile?.(r.payload.fileId)}
                    >
                      <div className="nv-result-head">
                        <span className="nv-result-file">
                          <Icon name="file" size={11} />
                          {r.payload.fileName}
                        </span>
                        {r.score > 0 && (
                          <span className="nv-result-score">
                            {(r.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {r.payload.text && (
                        <p className="nv-result-excerpt">
                          <HighlightText text={r.payload.text} term={cleanQuery} />
                        </p>
                      )}
                    </li>
                  ))}
                  {!isLoading && results.length === 0 && cleanQuery && (
                    <li style={{ color: "var(--ink-faint)", fontSize: "13px", padding: "10px 0" }}>
                      No results found
                    </li>
                  )}
                </ul>
              </div>

              {mode !== "file" && (
                <div className="nv-modal-section nv-modal-ask-cta">
                  <div className="nv-modal-eyebrow">or</div>
                  <button
                    className="nv-ask-cta"
                    onClick={() => {
                      onAskVault?.(query);
                      onClose();
                    }}
                  >
                    <Icon name="sparkle" size={12} />
                    <span>ask the vault</span>
                    <em>&mdash; &ldquo;{query}&rdquo;</em>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="nv-modal-foot">
          <span><kbd>↵</kbd> open</span>
          <span><kbd>⇥</kbd> cycle mode</span>
          <span><kbd>esc</kbd> close</span>
          <span className="nv-modal-foot-spacer" />
          <span>hybrid retrieval &middot; RRF &middot; k=10</span>
        </div>
    </dialog>
  );
}

function ModePill({ mode }: { mode: SearchMode }) {
  return <span className={`nv-mode-pill nv-mode-${mode}`}>{mode}</span>;
}

function EmptyState() {
  return (
    <>
      <div className="nv-modal-section">
        <div className="nv-modal-eyebrow">operators</div>
        <ul className="nv-ops">
          <li><code>!keyword:</code><span>exact match in chunk text</span><kbd>BM25</kbd></li>
          <li><code>!semantic:</code><span>vector similarity only</span><kbd>cosine</kbd></li>
          <li><code>!file:</code><span>filter by filename</span><kbd>fuzzy</kbd></li>
          <li><code>(none)</code><span>hybrid · merged via reciprocal rank fusion</span><kbd>default</kbd></li>
        </ul>
      </div>
      <div className="nv-modal-section">
        <div className="nv-modal-eyebrow">recent queries</div>
        <ul className="nv-recent-q">
          <li><Icon name="clock" size={11} />Type a query to search your vault</li>
        </ul>
      </div>
    </>
  );
}

function HighlightText({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}
