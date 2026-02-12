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
      className="nv-modal nv-login-modal"
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      <div className="nv-modal-header">
        <Icon name="lock" size={14} />
        <span>Admin Access</span>
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Enter secret"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className={error ? "nv-input-error" : ""}
        />
        {error && <span className="nv-login-error">Invalid secret</span>}
        <button type="submit" disabled={loading || !value.trim()}>
          {loading ? "Verifying…" : "Unlock"}
        </button>
      </form>
    </dialog>
  );
}
