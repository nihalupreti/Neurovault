"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";
import type { BookAnnotation, BookChapter } from "@/api/client";
import { SelectionToolbar } from "../selection-toolbar";
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

  return (
    <div className="nv-reader">
      <article
        className="nv-reader-main nv-chapter"
        role="article"
        ref={mainRef}
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
            <button className="nv-pager-btn" onClick={onPrevChapter} aria-label="Previous chapter">
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
            <button className="nv-pager-btn" onClick={onNextChapter} aria-label="Next chapter">
              {nextTitle && <em>{nextTitle}</em>}
              <span>next</span>
              <Icon name="chevron" size={12} />
            </button>
          ) : (
            <span />
          )}
        </div>

      </article>

      <SelectionToolbar
        fileId={chapter.bookId}
        fileName={chapter.title}
        containerRef={mainRef}
      />

      <MarginGutter annotations={annotations} />
    </div>
  );
}
