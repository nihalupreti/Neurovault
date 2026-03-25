"use client";

import { Icon } from "@/components/icons";
import type { BookChapter, ReadingProgress, BookAnnotation } from "@/api/client";

interface BookOutlineProps {
  chapter: BookChapter | null;
  progress: ReadingProgress | null;
  annotations: BookAnnotation[];
}

export function BookOutline({ chapter, progress, annotations }: BookOutlineProps) {
  if (!chapter) return null;

  const scrollPct = progress?.scrollPosition ?? 0;
  const pctLabel = Math.round(scrollPct * 100);

  const chapterKey = String(chapter.number);
  const timeSpent = progress?.timeSpentMinutes?.[chapterKey] ?? 0;
  const estTotal = Math.max(timeSpent, Math.round(timeSpent / Math.max(scrollPct, 0.01)));

  const highlights = annotations.filter((a) => a.type === "highlight").length;
  const vaultLinks = annotations.filter((a) => a.type === "vault-link");

  return (
    <>
      <div className="nv-pane-eyebrow">
        <span>chapter outline</span>
        <span>{chapter.sections.length} &sect;</span>
      </div>
      <div className="nv-outline">
        <ul>
          <li className="nv-outline-h1">
            <span className="nv-outline-rule" />
            <a href="#">Ch. {chapter.number} &middot; {chapter.title}</a>
          </li>
          {chapter.sections.map((s) => (
            <li key={s.anchor} className={`nv-outline-h${s.level}`}>
              <span className="nv-outline-rule" />
              <a href={`#${s.anchor}`}>{s.title}</a>
            </li>
          ))}
        </ul>
      </div>

      <div className="nv-pane-eyebrow nv-pane-eyebrow-spaced">
        <span>session</span>
        <span className="nv-scope-chip">live</span>
      </div>

      <div className="nv-progress-card">
        <div className="nv-progress-row">
          <span>chapter progress</span>
          <b>{pctLabel}%</b>
        </div>
        <div className="nv-progress-bar">
          <i style={{ width: `${pctLabel}%` }} />
        </div>
        <div className="nv-progress-substats">
          <div>
            <b>{timeSpent}m</b>
            <span>read so far</span>
          </div>
          <div>
            <b>{estTotal}m</b>
            <span>est. total</span>
          </div>
          <div>
            <b>{highlights}</b>
            <span>highlights</span>
          </div>
        </div>
      </div>

      <div className="nv-pane-eyebrow nv-pane-eyebrow-spaced">
        <span>linked from this chapter</span>
      </div>
      <ul className="nv-linked-notes">
        {vaultLinks.map((link) => (
          <li key={link._id}>
            <Icon name="link" size={11} />
            <span>{link.highlightedText}</span>
          </li>
        ))}
        {vaultLinks.length === 0 && (
          <li style={{ opacity: 0.5 }}>no linked notes yet</li>
        )}
      </ul>
    </>
  );
}
