"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importBook } from "@/api/client";
import { Icon } from "@/components/icons";

interface BookImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (bookId: string) => void;
}

export function BookImportDialog({
  open,
  onClose,
  onImported,
}: BookImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setError(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: importBook,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      onImported(result.bookId);
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Import failed");
    },
  });

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    mutation.mutate(file);
    e.target.value = "";
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
        <span>Import Book</span>
      </div>

      <div
        className="nv-upload-zone"
        onClick={() => fileInputRef.current?.click()}
      >
        {mutation.isPending ? (
          <span>Importing...</span>
        ) : (
          <>
            <Icon name="plus" size={24} />
            <span>Click to import</span>
            <span>HTML files</span>
          </>
        )}
      </div>

      {error && <p className="nv-modal-error">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.epub"
        hidden
        onChange={handleFileChange}
      />
    </dialog>
  );
}
