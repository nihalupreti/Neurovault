"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface OutlinePaneProps {
  content: string | undefined;
}

function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`[\]]/g, "");
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export function OutlinePane({ content }: OutlinePaneProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const headings = content ? extractHeadings(content) : [];

  useEffect(() => {
    if (headings.length > 0 && !activeId) {
      setActiveId(headings[0].id);
    }
  }, [headings, activeId]);

  return (
    <div className="nv-outline">
      <div className="nv-pane-eyebrow">on this page</div>
      <ul>
        {headings.map((h) => {
          const cls = h.level === 1 ? "nv-outline-h1" : h.level === 2 ? "nv-outline-h2" : "nv-outline-h3";
          return (
            <li key={h.id} className={`${cls} ${activeId === h.id ? "is-active" : ""}`}>
              <span className="nv-outline-rule" />
              <a href={`#${h.id}`} onClick={() => setActiveId(h.id)}>{h.text}</a>
            </li>
          );
        })}
      </ul>

      <div className="nv-pane-eyebrow nv-pane-eyebrow-spaced">recent</div>
      <ul className="nv-recent">
        <li><Icon name="file" size={11} /><span>Recently viewed files</span><em>&mdash;</em></li>
      </ul>
    </div>
  );
}
