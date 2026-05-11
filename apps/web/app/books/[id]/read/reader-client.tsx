"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { BookLeftRail } from "@/components/book/book-left-rail";
import { ChapterReader } from "@/components/book/chapter-reader";
import {
  BookRightRail,
  type BookRailMode,
} from "@/components/book/book-right-rail";
import { Fab } from "@/components/mobile-drawers";
import { Icon } from "@/components/icons";
import { useMobile } from "@/hooks/useMobile";
import { useBookProgress } from "@/hooks/useBookProgress";
import { useDynamicTitle } from "@/hooks/useDynamicTitle";
import { getBook, getChapter, listAnnotations } from "@/api/client";
import type { BookSummary, BookChapter as BookChapterType } from "@/api/client";

interface ReaderClientProps {
  bookId: string;
  initialBook: BookSummary | null;
  initialChapter: BookChapterType | null;
}

export function ReaderClient({ bookId, initialBook, initialChapter }: ReaderClientProps) {
  const mobile = useMobile();

  const [leftTab, setLeftTab] = useState<"library" | "toc">("toc");
  const [rightMode, setRightMode] = useState<BookRailMode>("outline");
  const [activeSection, setActiveSection] = useState("");
  const [leftDrawer, setLeftDrawer] = useState(false);
  const [rightDrawer, setRightDrawer] = useState(false);

  const { progress, saveProgress } = useBookProgress(bookId);
  const currentChapter = progress?.currentChapter ?? 1;

  const { data: book } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getBook(bookId),
    enabled: !!bookId,
    initialData: initialBook ?? undefined,
  });

  const { data: chapter } = useQuery({
    queryKey: ["chapter", bookId, currentChapter],
    queryFn: () => getChapter(bookId, currentChapter),
    enabled: !!bookId,
    initialData: currentChapter === 1 && initialChapter ? initialChapter : undefined,
  });

  const { data: annotationsData } = useQuery({
    queryKey: ["annotations", bookId, currentChapter],
    queryFn: () => listAnnotations(bookId, currentChapter),
    enabled: !!bookId,
  });

  const annotations = annotationsData?.data ?? [];

  useDynamicTitle(book?.title);

  const handleChapterChange = useCallback(
    (num: number) => {
      saveProgress({ currentChapter: num, scrollPosition: 0 });
      window.scrollTo({ top: 0 });
    },
    [saveProgress]
  );

  const handleChatToggle = useCallback(() => {
    if (mobile) {
      setRightDrawer(true);
      setRightMode("chat");
    } else {
      setRightMode((prev) => (prev === "chat" ? "outline" : "chat"));
    }
  }, [mobile]);

  const handleJumpSection = useCallback((anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  const prevChapter =
    currentChapter > 1
      ? book?.chapters.find((c) => c.number === currentChapter - 1)
      : undefined;
  const nextChapter =
    book && currentChapter < book.totalChapters
      ? book.chapters.find((c) => c.number === currentChapter + 1)
      : undefined;

  if (!book || !chapter) {
    return (
      <>
        <Header
          onSearchOpen={() => {}}
          onChatToggle={handleChatToggle}
          chatOpen={rightMode === "chat"}
          onMenu={() => setLeftDrawer(true)}
          mobile={mobile}
        />
        <div className="nv-shell is-reader">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>
            Loading...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        onSearchOpen={() => {}}
        onChatToggle={handleChatToggle}
        chatOpen={rightMode === "chat"}
        onMenu={() => setLeftDrawer(true)}
        mobile={mobile}
      />

      <div className="nv-shell is-reader">
        {!mobile && (
          <BookLeftRail
            tab={leftTab}
            onTabChange={setLeftTab}
            bookId={bookId}
            book={book}
            progress={progress ?? null}
            currentChapter={currentChapter}
            activeSection={activeSection}
            onChapterChange={handleChapterChange}
            onJumpSection={handleJumpSection}
          />
        )}

        <ChapterReader
          bookTitle={book.title}
          chapter={chapter}
          chapterCount={book.totalChapters}
          annotations={annotations}
          onSectionEnter={setActiveSection}
          onPrevChapter={
            prevChapter ? () => handleChapterChange(currentChapter - 1) : undefined
          }
          onNextChapter={
            nextChapter ? () => handleChapterChange(currentChapter + 1) : undefined
          }
          prevTitle={prevChapter?.title}
          nextTitle={nextChapter?.title}
        />

        {!mobile && (
          <BookRightRail
            mode={rightMode}
            onModeChange={setRightMode}
            bookId={bookId}
            book={book}
            chapter={chapter}
            progress={progress ?? null}
            annotations={annotations}
            activeSection={activeSection}
          />
        )}
      </div>

      {mobile && <Fab onClick={() => setRightDrawer(true)} />}

      {mobile && leftDrawer && (
        <div className="nv-drawer-root">
          <div className="nv-drawer-backdrop" onClick={() => setLeftDrawer(false)} />
          <div className="nv-drawer nv-drawer-left">
            <div className="nv-drawer-head">
              <span>library</span>
              <button className="nv-icon-btn nv-icon-btn-sm" onClick={() => setLeftDrawer(false)}>
                <Icon name="x" size={12} />
              </button>
            </div>
            <BookLeftRail
              tab={leftTab}
              onTabChange={setLeftTab}
              bookId={bookId}
              book={book}
              progress={progress ?? null}
              currentChapter={currentChapter}
              activeSection={activeSection}
              onChapterChange={(n) => { handleChapterChange(n); setLeftDrawer(false); }}
              onJumpSection={handleJumpSection}
            />
          </div>
        </div>
      )}

      {mobile && rightDrawer && (
        <div className="nv-drawer-root">
          <div className="nv-drawer-backdrop" onClick={() => setRightDrawer(false)} />
          <div className="nv-drawer nv-drawer-right">
            <BookRightRail
              mode={rightMode}
              onModeChange={setRightMode}
              bookId={bookId}
              book={book}
              chapter={chapter}
              progress={progress ?? null}
              annotations={annotations}
              activeSection={activeSection}
              mobile
              onClose={() => setRightDrawer(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
