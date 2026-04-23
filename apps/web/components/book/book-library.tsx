"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBooks } from "@/api/client";
import type { BookSummary } from "@/api/client";
import { Icon } from "@/components/icons";

const GLYPHS = ["▤", "❰❱", "⌬", "∞", "◴", "◈", "⬡", "⎔"];
const HUES = [24, 200, 145, 290, 60, 330, 180, 100];

interface BookLibraryProps {
  onSelectBook: (bookId: string) => void;
  onImport: () => void;
  initialData?: BookSummary[];
}

export function BookLibrary({ onSelectBook, onImport, initialData }: BookLibraryProps) {
  const [filter, setFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["books"],
    queryFn: () => listBooks(),
    initialData: initialData ? { success: true, data: initialData, meta: { page: 1, limit: 20, total: initialData.length, totalPages: 1 }, message: "ok", timestamp: new Date().toISOString() } : undefined,
  });

  const books = data?.data ?? [];
  const filtered = filter
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(filter.toLowerCase()) ||
          b.topic.toLowerCase().includes(filter.toLowerCase())
      )
    : books;

  if (isLoading) {
    return (
      <div className="nv-library-wrap">
        <div className="nv-empty-hero" style={{ minHeight: "40vh" }}>
          <div className="nv-empty-hero-inner">
            <div className="nv-spinner" />
            <p style={{ marginBottom: 0 }}>Loading books…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nv-library-wrap">
        <div className="nv-empty-hero" style={{ minHeight: "40vh" }}>
          <div className="nv-empty-hero-inner">
            <div className="nv-error-icon">
              <Icon name="x" size={20} />
            </div>
            <h3>Something went wrong</h3>
            <p style={{ marginBottom: 0 }}>Failed to load books.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nv-library-wrap">
      {books.length > 0 && (
        <button className="nv-import-card" onClick={onImport}>
          <span className="nv-import-card-icon">
            <Icon name="plus" size={14} />
          </span>
          <span className="nv-import-card-body">
            <b>import book</b>
            <span>epub · pdf · html</span>
          </span>
        </button>
      )}

      {books.length > 0 && (
        <div className="nv-rail-search">
          <Icon name="search" size={11} />
          <input
            placeholder="filter books…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 && books.length === 0 && (
        <div className="nv-empty-hero" style={{ minHeight: "40vh" }}>
          <div className="nv-empty-hero-inner">
            <div className="nv-empty-hero-icon">
              <Icon name="folder" size={24} />
            </div>
            <h3>Your library is empty</h3>
            <p>Import a book to start reading. Supports EPUB, PDF, and HTML.</p>
            <div className="nv-empty-hero-actions">
              <button className="nv-empty-hero-btn is-primary" onClick={onImport}>
                Import book
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && books.length > 0 && (
        <div className="nv-empty-state">No books match your filter.</div>
      )}

      <div className="nv-library">
        {filtered.map((book, i) => {
          const glyph = GLYPHS[i % GLYPHS.length];
          const hue = HUES[i % HUES.length];
          const chaptersRead = 0;
          const progress = book.totalChapters > 0 ? chaptersRead / book.totalChapters : 0;

          return (
            <button
              key={book._id}
              className={`nv-lib-row ${progress >= 1 ? "is-done" : ""}`}
              onClick={() => onSelectBook(book._id)}
            >
              <span
                className="nv-lib-cover"
                style={{ "--hue": hue } as React.CSSProperties}
              >
                {glyph}
              </span>
              <span className="nv-lib-meta">
                <span className="nv-lib-title">{book.title}</span>
                <span className="nv-lib-author">{book.topic}</span>
                <span className="nv-lib-progress">
                  <i
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </span>
                <span className="nv-lib-foot">
                  <b>
                    {chaptersRead}/{book.totalChapters}
                  </b>
                  <span className="nv-dot" />
                  <span>{book.totalChapters} chapters</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {books.length > 0 && (
        <div className="nv-rail-foot">
          <span className="nv-foot-meta">
            {books.length} book{books.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
