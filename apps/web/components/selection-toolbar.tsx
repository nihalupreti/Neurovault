"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { useSelectionContext } from "@/contexts/selection-context";

interface SelectionToolbarProps {
  fileId: string;
  fileName: string;
  containerRef: React.RefObject<HTMLElement | null>;
  onAsk?: () => void;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

export function SelectionToolbar({ fileId, fileName, containerRef, onAsk }: SelectionToolbarProps) {
  const { addSelection } = useSelectionContext();
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !selection.rangeCount ||
      !containerRef.current
    ) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setPosition(null);
      return;
    }

    setSelectedText(text);

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setPosition({
      top: rect.top - containerRect.top - 44,
      left: rect.left - containerRect.left + rect.width / 2,
    });
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      setTimeout(updatePosition, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return;
      setPosition(null);
    };

    container.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [containerRef, updatePosition]);

  const handleAsk = useCallback(() => {
    if (!selectedText) return;
    addSelection(fileId, fileName, selectedText);
    setPosition(null);
    window.getSelection()?.removeAllRanges();
    onAsk?.();
  }, [selectedText, fileId, fileName, addSelection, onAsk]);

  if (!position) return null;

  return (
    <div
      ref={toolbarRef}
      className="nv-selection-toolbar"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <button onClick={handleAsk} title="Ask about this">
        <Icon name="chat" size={14} />
      </button>
      <button disabled title="Highlight (coming soon)">
        <Icon name="sparkle" size={14} />
      </button>
      <button disabled title="Annotate (coming soon)">
        <Icon name="link" size={14} />
      </button>
      <button
        onClick={() => {
          navigator.clipboard.writeText(selectedText);
          setPosition(null);
          window.getSelection()?.removeAllRanges();
        }}
        title="Copy"
      >
        <Icon name="ext" size={14} />
      </button>
    </div>
  );
}
