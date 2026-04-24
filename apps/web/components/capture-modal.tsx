"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axios-instance";
import { ENDPOINTS } from "@/api/endpoints";
import { Icon } from "./icons";

interface CaptureModalProps {
  open: boolean;
  onClose: () => void;
}

export function CaptureModal({ open, onClose }: CaptureModalProps) {
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
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

  const mutation = useMutation({
    mutationFn: async (body: { content: string }) => {
      const res = await api.post(ENDPOINTS.capture.create, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folderTree"] });
      setContent("");
      onClose();
    },
  });

  const handleClose = () => {
    setContent("");
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    mutation.mutate({ content: content.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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
            <Icon name="plus" size={14} />
          </div>
          <span>Quick Capture</span>
        </div>
        <button className="nv-modal-chrome-close" onClick={handleClose}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="nv-modal-chrome-body">
          <textarea
            className="nv-modal-chrome-textarea"
            placeholder="Paste a URL, or type a note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className="nv-modal-chrome-footer">
          <span style={{ flex: 1, fontFamily: "var(--mono)", fontSize: "10px", color: "var(--accent)", letterSpacing: "0.04em" }}>
            {/^https?:\/\//i.test(content.trim()) ? "link detected" : ""}
          </span>
          <button type="button" className="nv-btn-secondary" onClick={handleClose}>Cancel</button>
          <button type="submit" className="nv-btn-primary" disabled={mutation.isPending || !content.trim()}>
            {mutation.isPending ? "Saving…" : "Capture"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
