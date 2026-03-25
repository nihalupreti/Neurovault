"use client";

import { Icon } from "@/components/icons";
import type { BookAnnotation } from "@/api/client";

interface MarginGutterProps {
  annotations: BookAnnotation[];
}

export function MarginGutter({ annotations }: MarginGutterProps) {
  return (
    <div className="nv-margin-gutter">
      <div className="nv-margin-stack" style={{ position: "sticky", top: 80 }}>
        {annotations.map((a) => (
          <div
            key={a._id}
            className="nv-margin-note"
            data-kind={a.color === "amber" ? "hl-amber" : "hl-green"}
          >
            <div className="nv-margin-note-title">
              <b>{a.type}</b>
            </div>
            <p className="nv-margin-note-text">{a.highlightedText}</p>
            {a.noteContent && (
              <a className="nv-margin-note-link" href="#">
                <Icon name="link" size={10} /> {a.noteContent}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
