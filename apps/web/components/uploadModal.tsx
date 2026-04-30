"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/api/query-client";
import { uploadFiles } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { Icon } from "./icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: "file" | "folder";
}

export default function UploadModal({ isOpen, onClose, target }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: ({ endPoint, data }: { endPoint: string; data: FormData }) =>
      uploadFiles(endPoint, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folderTree"] });
      onClose();
    },
  });

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const endpoint = target === "file" ? ENDPOINTS.file.upload : ENDPOINTS.file.uploadFolder;

    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("files", file);
      if (target === "folder" && file.webkitRelativePath) {
        formData.append("relativePaths", file.webkitRelativePath);
      } else {
        formData.append("relativePaths", file.name);
      }
    });

    mutate({ endPoint: endpoint, data: formData });
  };

  return (
    <dialog
      ref={dialogRef}
      className="nv-modal nv-modal-chrome"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="nv-modal-chrome-header">
        <div className="nv-modal-chrome-title">
          <div className="nv-modal-chrome-title-icon">
            <Icon name="plus" size={14} />
          </div>
          <span>Upload files</span>
        </div>
        <button className="nv-modal-chrome-close" onClick={onClose}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="nv-modal-chrome-body">
        {isOpen && (
          <input
            ref={fileInputRef}
            type="file"
            multiple={target === "file"}
            // @ts-expect-error webkitdirectory not in TS defs
            webkitdirectory={target === "folder" ? "" : undefined}
            style={{ display: "none" }}
            onChange={handleFiles}
          />
        )}
        <button
          type="button"
          className="nv-upload-zone"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="nv-spinner" />
          ) : (
            <>
              <Icon name="plus" size={24} />
              <p style={{ color: "var(--ink-soft)", marginTop: "8px", marginBottom: "4px" }}>
                Click to browse or drag files here
              </p>
              <p style={{ color: "var(--ink-faint)", fontSize: "12px", margin: 0 }}>
                Markdown, PDF, or TXT
              </p>
            </>
          )}
        </button>
      </div>

      <div className="nv-modal-chrome-footer" style={{ justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--ink-faint)" }}>
          Max 10MB per file
        </span>
      </div>
    </dialog>
  );
}
