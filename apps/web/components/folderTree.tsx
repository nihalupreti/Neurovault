"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import FolderStructure from "./folderStructure";
import { getData } from "@/utils/http";

type FolderTreeProps = {
  onFileSelect: (fileId: string) => void;
};

type TFiles = {
  _id: string;
  name: string;
  type: "file" | "folder";
  children?: TFiles[];
};

export default function FolderTree({ onFileSelect }: FolderTreeProps) {
  const queryClient = useQueryClient();

  // Query for root folder
  const {
    isLoading,
    error,
    data: root,
  } = useQuery({
    queryKey: ["folder-tree", "root"],
    queryFn: () => getData({ endPoint: "/file/folder" }),
    staleTime: Infinity,
  });

  // Expand children on demand
  const handleExpand = async (id: string) => {
    try {
      const res = await getData({ endPoint: `/file/folder?parentId=${id}` });
      const newChildren: TFiles[] = res.children || [];

      queryClient.setQueryData(["folder-tree", "root"], (oldRoot: TFiles) => {
        if (!oldRoot) return oldRoot;

        const updateNode = (node: TFiles): TFiles => {
          if (node._id === id) return { ...node, children: newChildren };
          if (node.children)
            return { ...node, children: node.children.map(updateNode) };
          return node;
        };

        return updateNode(oldRoot);
      });
    } catch (err) {
      console.error("Failed to fetch children", err);
    }
  };

  if (isLoading) return <div>Loading folder structure...</div>;
  if (error) return <div>Failed to load folder structure</div>;
  if (!root) return <div>No folder structure found</div>;

  return (
    <div>
      <div className="py-4 border-b border-gray-200 rounded-t-lg">
        <h3 className="text-lg font-semibold">Knowledge Base</h3>
      </div>
      <div className="p-4">
        <FolderStructure
          entry={root}
          depth={0}
          onExpand={handleExpand}
          onFileSelect={onFileSelect}
        />
      </div>
    </div>
  );
}
