"use client";

import { Icon } from "./icons";
import { VaultRail } from "./vault-rail";
import { RightRail } from "./right-rail";
import type { RailMode } from "./right-rail";

interface LeftDrawerProps {
  open: boolean;
  onClose: () => void;
  activeId: string | null;
  onSelectFile: (id: string) => void;
}

export function LeftDrawer({ open, onClose, activeId, onSelectFile }: LeftDrawerProps) {
  if (!open) return null;
  return (
    <div className="nv-drawer-root">
      <div className="nv-drawer-backdrop" onClick={onClose} />
      <div className="nv-drawer nv-drawer-left">
        <div className="nv-drawer-head">
          <span>vault</span>
          <button className="nv-icon-btn nv-icon-btn-sm" onClick={onClose}>
            <Icon name="x" size={12} />
          </button>
        </div>
        <VaultRail
          activeId={activeId}
          onSelectFile={(id) => {
            onSelectFile(id);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  mode: RailMode;
  onModeChange: (mode: RailMode) => void;
  fileId: string | null;
  fileContent: string | undefined;
}

export function RightDrawer({
  open,
  onClose,
  mode,
  onModeChange,
  fileId,
  fileContent,
}: RightDrawerProps) {
  if (!open) return null;
  return (
    <div className="nv-drawer-root">
      <div className="nv-drawer-backdrop" onClick={onClose} />
      <div className="nv-drawer nv-drawer-right">
        <RightRail
          mode={mode}
          onModeChange={onModeChange}
          fileId={fileId}
          fileContent={fileContent}
          onClose={onClose}
          mobile
        />
      </div>
    </div>
  );
}

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button className="nv-fab" onClick={onClick} aria-label="Open panel">
      <Icon name="sparkle" size={16} />
    </button>
  );
}
