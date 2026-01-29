"use client";

import { Icon } from "@/components/icons";

interface SelectionToolbarProps {
  position: { x: number; y: number } | null;
  onHighlight: (color: "amber" | "green") => void;
  onNote: () => void;
  onAsk: () => void;
}

export function SelectionToolbar({
  position,
  onHighlight,
  onNote,
  onAsk,
}: SelectionToolbarProps) {
  if (!position) return null;

  return (
    <div
      className="nv-select-toolbar"
      style={{
        left: position.x,
        top: position.y,
        transform: "translateX(-50%)",
      }}
    >
      <button title="Highlight amber" onClick={() => onHighlight("amber")}>
        <span className="nv-st-swatch is-amber" />
      </button>
      <button title="Highlight green" onClick={() => onHighlight("green")}>
        <span className="nv-st-swatch is-green" />
      </button>
      <span className="nv-st-sep" />
      <button onClick={onNote}>
        <Icon name="chat" size={12} /> note
      </button>
      <span className="nv-st-sep" />
      <button onClick={onAsk}>
        <Icon name="sparkle" size={12} /> ask
      </button>
    </div>
  );
}
