"use client";

import { useSelectionContext } from "@/contexts/selection-context";
import { Icon } from "../icons";

export function ContextChips() {
  const { contextItems, ghostItems, removeItem, reattachGhost } = useSelectionContext();

  if (contextItems.length === 0 && ghostItems.length === 0) return null;

  return (
    <div className="nv-context-tray">
      {contextItems.map((item, i) => (
        <div key={`${item.fileId}-${i}`} className="nv-context-chip">
          <Icon name="file" size={11} />
          <span className="nv-context-chip-name">{item.fileName}</span>
          {item.excerpt && (
            <span className="nv-context-chip-excerpt">
              &ldquo;{item.excerpt.slice(0, 40)}…&rdquo;
            </span>
          )}
          <button
            className="nv-context-chip-remove"
            onClick={() => removeItem(i)}
            aria-label={`Remove ${item.fileName}`}
          >
            <Icon name="x" size={9} />
          </button>
        </div>
      ))}

      {ghostItems.map((item, i) => (
        <button
          key={`ghost-${item.fileId}-${i}`}
          className="nv-context-chip nv-context-chip-ghost"
          onClick={() => reattachGhost(i)}
        >
          <Icon name="file" size={11} />
          <span className="nv-context-chip-name">{item.fileName}</span>
        </button>
      ))}
    </div>
  );
}
