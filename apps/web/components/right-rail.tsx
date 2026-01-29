"use client";

import { Icon } from "./icons";
import { OutlinePane } from "./outline-pane";
import { ConnectionsPane } from "./connections-pane";
import ChatPane from "./chat/ChatPane";

export type RailMode = "outline" | "connections" | "chat";

interface RightRailProps {
  mode: RailMode;
  onModeChange: (mode: RailMode) => void;
  fileId: string | null;
  fileContent: string | undefined;
  onClose?: () => void;
  mobile?: boolean;
}

export function RightRail({
  mode,
  onModeChange,
  fileId,
  fileContent,
  onClose,
  mobile,
}: RightRailProps) {
  return (
    <aside className="nv-rightrail">
      <div className="nv-rail-tabs" role="tablist">
        <button
          className={`nv-tab ${mode === "outline" ? "is-active" : ""}`}
          onClick={() => onModeChange("outline")}
          aria-label="Show outline"
          role="tab"
          aria-selected={mode === "outline"}
        >
          <Icon name="outline" size={12} /> outline
        </button>
        <button
          className={`nv-tab ${mode === "connections" ? "is-active" : ""}`}
          onClick={() => onModeChange("connections")}
          aria-label="Show connections"
          role="tab"
          aria-selected={mode === "connections"}
        >
          <Icon name="graph" size={12} /> connections
        </button>
        <button
          className={`nv-tab ${mode === "chat" ? "is-active" : ""}`}
          onClick={() => onModeChange("chat")}
          aria-label="Ask your notes"
          role="tab"
          aria-selected={mode === "chat"}
        >
          <Icon name="chat" size={12} /> ask
        </button>
        {mobile && (
          <button
            className="nv-icon-btn nv-icon-btn-sm nv-tab-close"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      <div className="nv-rail-pane">
        {mode === "outline" && <OutlinePane content={fileContent} />}
        {mode === "connections" && <ConnectionsPane fileId={fileId} />}
        {mode === "chat" && <ChatPane />}
      </div>
    </aside>
  );
}
