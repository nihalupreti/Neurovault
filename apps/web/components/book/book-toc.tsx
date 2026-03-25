"use client";

import React from "react";
import { Icon } from "@/components/icons";

interface BookTocProps {
  bookTitle: string;
  chapters: Array<{ number: number; title: string; sectionAnchors: string[] }>;
  currentChapter: number;
  chaptersCompleted: number[];
  chapterSections: Array<{ anchor: string; title: string; level: number }> | null;
  activeSection: string;
  onChapterChange: (num: number) => void;
  onJumpSection: (anchor: string) => void;
}

export function BookToc({
  bookTitle,
  chapters,
  currentChapter,
  chaptersCompleted,
  chapterSections,
  activeSection,
  onChapterChange,
  onJumpSection,
}: BookTocProps) {
  const total = chapters.length;
  const read = chaptersCompleted.length;
  const pct = total > 0 ? Math.round((read / total) * 100) : 0;

  return (
    <>
      <div className="nv-toc-head">
        <span className="nv-rail-eyebrow">reading now</span>
        <h3 className="nv-toc-book">{bookTitle}</h3>
        <div className="nv-toc-progress-row">
          <span>{read}/{total} chapters</span>
          <span className="nv-toc-progress-bar">
            <i style={{ width: pct + "%" }} />
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      <ul className="nv-toc-list">
        {chapters.map((c) => {
          const isCurrent = c.number === currentChapter;
          const isRead = chaptersCompleted.includes(c.number);
          return (
            <React.Fragment key={c.number}>
              <li>
                <button
                  className={`nv-toc-row${isCurrent ? " is-current" : ""}${isRead ? " is-read" : ""}`}
                  onClick={() => onChapterChange(c.number)}
                >
                  <span className="nv-toc-num">
                    {String(c.number).padStart(2, "0")}
                  </span>
                  <span className="nv-toc-title">{c.title}</span>
                  <span className="nv-toc-meta">
                    {isRead ? "✓" : c.sectionAnchors.length + "§"}
                  </span>
                </button>
              </li>
              {isCurrent && chapterSections && (
                <ul className="nv-toc-sections">
                  {chapterSections.map((s) => (
                    <li
                      key={s.anchor}
                      className={activeSection === s.anchor ? "is-active" : ""}
                      onClick={() => onJumpSection(s.anchor)}
                    >
                      {s.anchor} {s.title}
                    </li>
                  ))}
                </ul>
              )}
            </React.Fragment>
          );
        })}
      </ul>

      <div className="nv-rail-foot">
        <button className="nv-foot-btn">
          <Icon name="ext" size={11} />
          <span>export to obsidian</span>
        </button>
      </div>
    </>
  );
}
