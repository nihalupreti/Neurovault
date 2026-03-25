"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ENDPOINTS } from "@/api/endpoints";

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
      const res = await axios.post(ENDPOINTS.capture.create, body);
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
      className="nv-modal"
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      <div className="nv-modal-header">
        <span>Quick Capture</span>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          className="nv-modal-input"
          placeholder="Paste a URL, or type a note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={3}
        />
        <div className="nv-modal-foot">
          <span className="nv-modal-eyebrow">
            {/^https?:\/\//i.test(content.trim()) ? "link detected" : ""}
          </span>
          <button type="submit" disabled={mutation.isPending || !content.trim()}>
            {mutation.isPending ? "Saving..." : "Capture"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
