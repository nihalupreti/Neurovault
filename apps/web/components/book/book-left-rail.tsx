"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/icons";
import { BookToc } from "./book-toc";
import {
  listBooks,
  getChapter,
  type BookSummary,
  type ReadingProgress,
} from "@/api/client";

interface BookLeftRailProps {
  tab: "library" | "toc";
  onTabChange: (tab: "library" | "toc") => void;
  bookId: string;
  book: BookSummary | null;
  progress: ReadingProgress | null;
  currentChapter: number;
  activeSection: string;
  onChapterChange: (num: number) => void;
  onJumpSection: (anchor: string) => void;
}

export function BookLeftRail({
  tab,
  onTabChange,
  bookId,
  book,
  progress,
  currentChapter,
  activeSection,
  onChapterChange,
  onJumpSection,
}: BookLeftRailProps) {
  const chapterQuery = useQuery({
    queryKey: ["chapter", bookId, currentChapter],
    queryFn: () => getChapter(bookId, currentChapter),
    enabled: tab === "toc" && !!bookId,
  });

  return (
    <aside className="nv-leftrail" aria-label="Book navigation">
      <div className="nv-leftrail-tabs">
        <button
          className={`nv-tab${tab === "library" ? " is-active" : ""}`}
          onClick={() => onTabChange("library")}
        >
          <Icon name="folder" size={12} /> library
        </button>
        <button
          className={`nv-tab${tab === "toc" ? " is-active" : ""}`}
          onClick={() => onTabChange("toc")}
        >
          <Icon name="outline" size={12} /> contents
        </button>
      </div>

      {tab === "library" ? (
        <LibraryPane activeBookId={bookId} />
      ) : (
        book && (
          <BookToc
            bookTitle={book.title}
            chapters={book.chapters}
            currentChapter={currentChapter}
            chaptersCompleted={progress?.chaptersCompleted ?? []}
            chapterSections={chapterQuery.data?.sections ?? null}
            activeSection={activeSection}
            onChapterChange={onChapterChange}
            onJumpSection={onJumpSection}
          />
        )
      )}
    </aside>
  );
}

interface LibraryPaneProps {
  activeBookId: string;
}

function LibraryPane({ activeBookId }: LibraryPaneProps) {
  const [filter, setFilter] = useState("");

  const { data } = useQuery({
    queryKey: ["books"],
    queryFn: () => listBooks(),
  });

  const books = data?.data ?? [];
  const filtered = filter
    ? books.filter((b) => b.title.toLowerCase().includes(filter.toLowerCase()))
    : books;

  return (
    <>
      <button className="nv-import-card">
        <span className="nv-import-card-icon">
          <Icon name="plus" size={14} />
        </span>
        <span className="nv-import-card-body">
          <b>import book</b>
          <span>epub · pdf · html</span>
        </span>
      </button>

      <div className="nv-rail-search">
        <Icon name="search" size={11} />
        <input
          placeholder="filter books…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="nv-library">
        {filtered.map((b) => (
          <button
            key={b._id}
            className={`nv-lib-row${b._id === activeBookId ? " is-active" : ""}`}
          >
            <span className="nv-lib-cover">{b.title.charAt(0)}</span>
            <span className="nv-lib-meta">
              <span className="nv-lib-title">{b.title}</span>
              <span className="nv-lib-author">{b.topic}</span>
              <span className="nv-lib-foot">
                <b>{b.totalChapters} ch</b>
                <span className="nv-dot" />
                <span>
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="nv-rail-foot">
        <span className="nv-foot-meta">
          {books.length} books
        </span>
      </div>
    </>
  );
}
