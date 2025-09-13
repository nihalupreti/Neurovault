"use client";

import { queryClient, uploadFiles } from "@/utils/http";

import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: "file" | "folder";
}

export default function UploadModal({ isOpen, onClose, target }: ModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { mutate, isLoading } = useMutation({
    mutationFn: uploadFiles,
    onSuccess: () => {
      console.log("Upload successful");
      queryClient.invalidateQueries({
        queryKey: ["folder-tree", "root"],
      });

      onClose();
    },
    onError: (error) => {
      console.error("Upload failed:", error);
    },
  });

  if (!isOpen) return null;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const endpoint = target === "file" ? "/upload/file" : "/upload/folder";

    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("files", file);

      // preserve relative path for folder uploads
      if (target === "folder" && file.webkitRelativePath) {
        formData.append("relativePaths", file.webkitRelativePath);
      } else {
        formData.append("relativePaths", file.name);
      }
    });

    // trigger mutation
    mutate({
      endPoint: endpoint,
      data: formData,
    });
  };

  const triggerInput = () => {
    if (target === "file") {
      fileInputRef.current?.click();
    } else if (target === "folder") {
      folderInputRef.current?.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-gray-700 p-3 shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="text-white font-semibold">Upload {target}</h1>
          <button onClick={onClose} className="text-white hover:text-gray-400">
            ✕
          </button>
        </div>

        <div
          onClick={triggerInput}
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-500 border-dashed rounded-lg cursor-pointer bg-gray-600 hover:bg-gray-500 transition"
        >
          {isLoading ? (
            <p className="text-gray-300">Uploading...</p>
          ) : (
            <>
              <svg
                className="w-8 h-8 mb-4 text-gray-300"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <p className="mb-2 text-sm text-gray-300">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-400">Markdown, PDF, or TXT</p>
            </>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore: not in TS defs
          webkitdirectory=""
          className="hidden"
          onChange={handleFiles}
        />
      </div>
    </div>
  );
}
