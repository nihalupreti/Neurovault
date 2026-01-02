"use client";

import { Icon } from "./icons";

interface HeaderProps {
  onSearchOpen: () => void;
  onChatToggle: () => void;
  chatOpen: boolean;
  onMenu: () => void;
  mobile: boolean;
  noteCount: number;
}

export function Header({
  onSearchOpen,
  onChatToggle,
  chatOpen,
  onMenu,
  mobile,
  noteCount,
}: HeaderProps) {
  return (
    <header className="nv-header">
      <div className="nv-header-inner">
        {mobile && (
          <button className="nv-icon-btn" onClick={onMenu} aria-label="Open vault">
            <Icon name="menu" size={16} />
          </button>
        )}
        <div className="nv-brand">
          <div className="nv-brand-glyph" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <span className="nv-brand-name">neurovault</span>
          <span className="nv-brand-sub">&mdash; a second brain</span>
        </div>

        <button className="nv-search-trigger" onClick={onSearchOpen}>
          <Icon name="search" size={14} />
          <span className="nv-search-placeholder">
            Search vault, ask, or jump to file&hellip;
          </span>
          <span className="nv-kbd-group">
            <kbd>⌘</kbd><kbd>K</kbd>
          </span>
        </button>

        <div className="nv-header-actions">
          <span className="nv-sync-pill">
            <span className="nv-pulse" /> indexed &middot; {noteCount} notes
          </span>
          <button
            className={`nv-icon-btn ${chatOpen ? "is-active" : ""}`}
            onClick={onChatToggle}
            aria-label="Toggle chat"
            title="Ask your notes"
          >
            <Icon name="chat" size={16} />
          </button>
          <button className="nv-icon-btn" aria-label="New note">
            <Icon name="plus" size={16} />
          </button>
          <div className="nv-avatar" aria-label="Profile">N</div>
        </div>
      </div>
    </header>
  );
}
