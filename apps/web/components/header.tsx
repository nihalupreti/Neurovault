"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "./icons";
import { useAuth } from "@/contexts/auth-context";
import { UsageBadge } from "./usage-badge";
import { LoginModal } from "./login-modal";
import { CaptureModal } from "./capture-modal";
import { getGraphStats } from "@/api/client";

interface HeaderProps {
  onSearchOpen: () => void;
  onChatToggle: () => void;
  chatOpen: boolean;
  onMenu: () => void;
  mobile: boolean;
}

export function Header({ onSearchOpen, onChatToggle, chatOpen, onMenu, mobile }: HeaderProps) {
  const { data: stats } = useQuery({
    queryKey: ["graphStats"],
    queryFn: getGraphStats,
    staleTime: 60_000,
  });
  const noteCount = stats?.nodeCount ?? 0;
  const { isAdmin, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);

  return (
    <>
      <header className="nv-header">
        <nav className="nv-header-inner" aria-label="Main navigation">
          {mobile && (
            <button className="nv-icon-btn" onClick={onMenu} aria-label="Open vault">
              <Icon name="menu" size={16} />
            </button>
          )}
          <div className="nv-brand">
            <div className="nv-brand-glyph" aria-hidden="true" />
            <span className="nv-brand-name">neurovault</span>
          </div>

          <button className="nv-search-trigger" onClick={onSearchOpen}>
            <Icon name="search" size={14} />
            <span className="nv-search-placeholder">
              Search vault, ask, or jump to file&hellip;
            </span>
            <span className="nv-kbd-group">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </span>
          </button>

          <div className="nv-header-actions">
            <span className="nv-sync-pill">
              <span className="nv-pulse" /> indexed &middot; {noteCount} notes
            </span>
            {isAdmin && <UsageBadge />}
            <Link href="/books" className="nv-icon-btn" aria-label="Book library" title="Library">
              <Icon name="folder" size={16} />
            </Link>
            <button
              className={`nv-icon-btn ${chatOpen ? "is-active" : ""}`}
              onClick={onChatToggle}
              aria-label="Toggle chat"
              title="Ask your notes"
            >
              <Icon name="chat" size={16} />
            </button>
            {isAdmin && (
              <button
                className="nv-icon-btn"
                onClick={() => setCaptureOpen(true)}
                aria-label="New note"
                title="Quick capture"
              >
                <Icon name="plus" size={16} />
              </button>
            )}
            <div className="nv-auth-area">
              <button
                className={`nv-icon-btn ${isAdmin ? "is-active" : ""}`}
                onClick={() => (isAdmin ? setDropdownOpen(!dropdownOpen) : setLoginOpen(true))}
                aria-label={isAdmin ? "Admin menu" : "Login"}
                title={isAdmin ? "Admin" : "Login"}
              >
                <Icon name={isAdmin ? "unlock" : "lock"} size={16} />
              </button>
              {isAdmin && dropdownOpen && (
                <div className="nv-dropdown" onClick={() => setDropdownOpen(false)}>
                  <button onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <CaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </>
  );
}
