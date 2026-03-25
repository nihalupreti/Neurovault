"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/icons";
import { createAnnotation } from "@/api/client";
import type { BookAnnotation, BookChapter } from "@/api/client";
import { SelectionToolbar } from "./selection-toolbar";
import { MarginGutter } from "./margin-gutter";

interface ChapterReaderProps {
  bookTitle: string;
  chapter: BookChapter;
  chapterCount: number;
  annotations: BookAnnotation[];
  onSectionEnter: (sectionId: string) => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  prevTitle?: string;
  nextTitle?: string;
}

export function ChapterReader({
  bookTitle,
  chapter,
  chapterCount,
  annotations,
  onSectionEnter,
  onPrevChapter,
  onNextChapter,
  prevTitle,
  nextTitle,
}: ChapterReaderProps) {
  const mainRef = useRef<HTMLElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const queryClient = useQueryClient();

  const annotationMutation = useMutation({
    mutationFn: (body: Omit<BookAnnotation, "_id" | "bookId" | "createdAt">) =>
      createAnnotation(chapter.bookId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["annotations", chapter.bookId],
      });
    },
  });

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) onSectionEnter(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -60% 0px" }
    );

    const targets = el.querySelectorAll("[id]");
    targets.forEach((t) => obs.observe(t));

    return () => obs.disconnect();
  }, [chapter, onSectionEnter]);

  const getSelectedText = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.toString().length <= 4) return null;
    return sel;
  }, []);

  const handleMouseUp = useCallback(() => {
    const sel = getSelectedText();
    if (!sel || !mainRef.current) {
      setToolbarPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const parentRect = mainRef.current.getBoundingClientRect();
    setToolbarPos({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top - 38,
    });
  }, [getSelectedText]);

  const handleHighlight = useCallback(
    (color: "amber" | "green") => {
      const sel = window.getSelection();
      if (!sel || sel.toString().length <= 4) return;

      const text = sel.toString();
      const range = sel.getRangeAt(0);

      annotationMutation.mutate({
        chapterNumber: chapter.number,
        sectionAnchor: "",
        type: "highlight",
        textRange: {
          startOffset: range.startOffset,
          endOffset: range.endOffset,
        },
        highlightedText: text,
        color,
      });

      setToolbarPos(null);
      sel.removeAllRanges();
    },
    [annotationMutation, chapter.number]
  );

  const handleNote = useCallback(() => {
    setToolbarPos(null);
  }, []);

  const handleAsk = useCallback(() => {
    setToolbarPos(null);
  }, []);

  return (
    <div className="nv-reader">
      <article
        className="nv-reader-main nv-chapter"
        ref={mainRef}
        onMouseUp={handleMouseUp}
      >
        <div className="nv-book-breadcrumb">
          <span>library</span>
          <span className="nv-bc-sep">/</span>
          <b>{bookTitle}</b>
          <span className="nv-bc-sep">/</span>
          <span>chapter {String(chapter.number).padStart(2, "0")}</span>
        </div>

        <div
          dangerouslySetInnerHTML={{ __html: chapter.htmlContent }}
        />

        <div className="nv-reader-foot">
          {onPrevChapter ? (
            <button className="nv-pager-btn" onClick={onPrevChapter}>
              <Icon
                name="chevron"
                size={12}
                className="rotate-180"
              />
              <span>prev</span>
              {prevTitle && <em>{prevTitle}</em>}
            </button>
          ) : (
            <span />
          )}
          <span>
            chapter {chapter.number} of {chapterCount}
          </span>
          {onNextChapter ? (
            <button className="nv-pager-btn" onClick={onNextChapter}>
              {nextTitle && <em>{nextTitle}</em>}
              <span>next</span>
              <Icon name="chevron" size={12} />
            </button>
          ) : (
            <span />
          )}
        </div>

        <SelectionToolbar
          position={toolbarPos}
          onHighlight={handleHighlight}
          onNote={handleNote}
          onAsk={handleAsk}
        />
      </article>

      <MarginGutter annotations={annotations} />
    </div>
  );
}
