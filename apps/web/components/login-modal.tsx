"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Icon } from "./icons";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    setValue("");
    setError(false);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    const success = await login(value.trim());
    setLoading(false);

    if (success) {
      setValue("");
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="nv-modal nv-modal-chrome"
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      <div className="nv-modal-chrome-header">
        <div className="nv-modal-chrome-title">
          <div className="nv-modal-chrome-title-icon">
            <Icon name="lock" size={14} />
          </div>
          <span>Admin Access</span>
        </div>
        <button className="nv-modal-chrome-close" onClick={handleClose}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="nv-modal-chrome-body">
          <input
            type="password"
            className={`nv-modal-chrome-input${error ? " nv-input-error" : ""}`}
            placeholder="Enter secret"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          {error && <span className="nv-login-error" style={{ display: "block", marginTop: "8px" }}>Invalid secret</span>}
        </div>
        <div className="nv-modal-chrome-footer">
          <button type="submit" className="nv-btn-primary" disabled={loading || !value.trim()}>
            {loading ? "Verifying…" : "Unlock"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
