"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/api/query-client";
import { uploadFiles } from "@/api/client";
import { Icon } from "./icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: "file" | "folder";
}

export default function UploadModal({ isOpen, onClose, target }: ModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

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

    const endpoint =
      target === "file" ? "/file/upload/file" : "/file/upload/folder";

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

  const triggerInput = () => {
    if (target === "file") {
      fileInputRef.current?.click();
    } else {
      folderInputRef.current?.click();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="nv-modal"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="nv-modal-header">
        <span>Upload {target}</span>
      </div>

      <div className="nv-upload-zone" onClick={triggerInput}>
        {isLoading ? (
          <p style={{ color: "var(--ink-soft)" }}>Uploading...</p>
        ) : (
          <>
            <Icon name="plus" size={24} />
            <p style={{ color: "var(--ink-soft)", marginTop: "8px" }}>
              Click to upload
            </p>
            <p style={{ color: "var(--ink-faint)", fontSize: "12px", marginTop: "4px" }}>
              Markdown, PDF, or TXT
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFiles}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory not in TS defs
        webkitdirectory=""
        style={{ display: "none" }}
        onChange={handleFiles}
      />
    </dialog>
  );
}
