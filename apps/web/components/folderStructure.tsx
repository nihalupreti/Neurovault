"use client";

import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";

import { useState } from "react";

type TFiles = {
  _id: string;
  name: string;
  type: "file" | "folder";
  children?: TFiles[];
};

type EntryProps = {
  entry: TFiles;
  depth: number;
  onExpand: (id: string) => void;
  onFileSelect: (fileId: string) => void;
};

export default function FolderStructure({
  entry,
  depth,
  onExpand,
  onFileSelect,
}: EntryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (entry.type === "folder") {
      if (!isExpanded && entry.children?.length === 0) {
        setIsLoading(true);
        await onExpand(entry._id);
        setIsLoading(false);
      }
      setIsExpanded((prev) => !prev);
    } else {
      // File clicked → call parent callback
      onFileSelect(entry._id);
    }
  };

  const isFolder = entry.type === "folder";
  const hasChildren = entry.children && entry.children.length > 0;
  const canExpand = isFolder && (hasChildren || entry.children?.length === 0);

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-gray-800 transition-colors duration-150`}
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse Icon */}
        <div className="flex items-center justify-center w-4 h-4 mr-2">
          {isLoading ? (
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : canExpand ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : null}
        </div>

        {/* File/Folder Icon */}
        <div className="flex items-center justify-center w-4 h-4 mr-2">
          {isFolder ? (
            <Folder className="w-4 h-4 text-blue-500" />
          ) : (
            <File className="w-4 h-4" />
          )}
        </div>

        {/* Name */}
        <span className="text-sm">{entry.name}</span>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="relative">
          {entry.children?.map((child) => (
            <FolderStructure
              key={child._id}
              entry={child}
              depth={depth + 1}
              onExpand={onExpand}
              onFileSelect={onFileSelect} // pass down callback recursively
            />
          ))}
        </div>
      )}
    </div>
  );
}
