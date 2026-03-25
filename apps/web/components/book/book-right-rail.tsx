"use client";

import { Icon } from "@/components/icons";
import { BookOutline } from "./book-outline";
import { BookConnections } from "./book-connections";
import { BookAsk } from "./book-ask";
import type {
  BookSummary,
  BookChapter,
  ReadingProgress,
  BookAnnotation,
} from "@/api/client";

type BookRailMode = "outline" | "connections" | "chat";

interface BookRightRailProps {
  mode: BookRailMode;
  onModeChange: (mode: BookRailMode) => void;
  bookId: string;
  book: BookSummary | null;
  chapter: BookChapter | null;
  progress: ReadingProgress | null;
  annotations: BookAnnotation[];
  activeSection: string;
  mobile?: boolean;
  onClose?: () => void;
}

export function BookRightRail({
  mode,
  onModeChange,
  bookId,
  book,
  chapter,
  progress,
  annotations,
  activeSection,
  mobile,
  onClose,
}: BookRightRailProps) {
  return (
    <aside className={`nv-rightrail ${mobile ? "is-mobile" : ""}`}>
      <div className="nv-rail-tabs" role="tablist">
        <button
          className={`nv-tab ${mode === "outline" ? "is-active" : ""}`}
          onClick={() => onModeChange("outline")}
          aria-label="Show outline"
          role="tab"
          aria-selected={mode === "outline"}
        >
          <Icon name="outline" size={12} /> outline
        </button>
        <button
          className={`nv-tab ${mode === "connections" ? "is-active" : ""}`}
          onClick={() => onModeChange("connections")}
          aria-label="Show related"
          role="tab"
          aria-selected={mode === "connections"}
        >
          <Icon name="graph" size={12} /> related
        </button>
        <button
          className={`nv-tab ${mode === "chat" ? "is-active" : ""}`}
          onClick={() => onModeChange("chat")}
          aria-label="Ask about this book"
          role="tab"
          aria-selected={mode === "chat"}
        >
          <Icon name="chat" size={12} /> ask
        </button>
        {mobile && (
          <button
            className="nv-icon-btn nv-icon-btn-sm nv-tab-close"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      <div className="nv-rail-pane">
        {book && (
          <div className="nv-book-card">
            <span className="nv-lib-cover">{book.title.charAt(0)}</span>
            <div>
              <h3 className="nv-book-card-title">{book.title}</h3>
              <div className="nv-book-card-author">{book.topic}</div>
            </div>
          </div>
        )}

        {mode === "outline" && (
          <BookOutline
            chapter={chapter}
            progress={progress}
            annotations={annotations}
          />
        )}
        {mode === "connections" && (
          <BookConnections bookId={bookId} sectionAnchor={activeSection} />
        )}
        {mode === "chat" && chapter && (
          <BookAsk bookId={bookId} chapterNumber={chapter.number} />
        )}
      </div>
    </aside>
  );
}

export type { BookRailMode };
