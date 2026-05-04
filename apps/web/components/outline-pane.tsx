"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
      const level = match[1]!.length;
      const text = match[2]!.replace(/[*_`[\]]/g, "");
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-$/, "");
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export function OutlinePane({ content }: OutlinePaneProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const headings = useMemo(() => (content ? extractHeadings(content) : []), [content]);

  useEffect(() => {
    if (headings.length > 0 && !activeId) {
      setActiveId(headings[0]!.id);
    }
  }, [headings, activeId]);

  const handleClick = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setActiveId(id);
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("nv-flash");
    const onEnd = () => {
      el.classList.remove("nv-flash");
      el.removeEventListener("animationend", onEnd);
    };
    el.addEventListener("animationend", onEnd);
  }, []);

  return (
    <div className="nv-outline">
      <div className="nv-pane-eyebrow">on this page</div>
      <ul>
        {headings.map((h) => {
          const cls =
            h.level === 1 ? "nv-outline-h1" : h.level === 2 ? "nv-outline-h2" : "nv-outline-h3";
          return (
            <li key={h.id} className={`${cls} ${activeId === h.id ? "is-active" : ""}`}>
              <span className="nv-outline-rule" />
              <a href={`#${h.id}`} onClick={(e) => handleClick(e, h.id)}>
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
